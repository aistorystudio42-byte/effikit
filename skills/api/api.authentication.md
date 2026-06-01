<!-- @keywords: api authentication, JWT, OAuth, API key, bearer token, refresh token, session -->

# API — Authentication and Authorization

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to authentication.

## Principles

### Authentication vs Authorization
```
Authentication: "Who are you?" — verifying identity
Authorization:  "What can you do?" — checking permissions

Both are needed. Always in this order: authenticate first, then authorize.
```

---

### JWT Authentication
### Token Structure and Validation
```typescript
import jwt from 'jsonwebtoken';

interface TokenPayload {
  sub: string;          // subject — user ID
  email: string;
  role: UserRole;
  iat: number;          // issued at
  exp: number;          // expiration
  jti: string;          // JWT ID — for revocation
}

class JwtService {
  private readonly accessTokenSecret = process.env.JWT_ACCESS_SECRET!;
  private readonly refreshTokenSecret = process.env.JWT_REFRESH_SECRET!;

  signAccessToken(userId: string, email: string, role: UserRole): string {
    return jwt.sign(
      { sub: userId, email, role, jti: crypto.randomUUID() },
      this.accessTokenSecret,
      { expiresIn: '15m' } // short-lived
    );
  }

  signRefreshToken(userId: string): string {
    return jwt.sign(
      { sub: userId, jti: crypto.randomUUID() },
      this.refreshTokenSecret,
      { expiresIn: '7d' } // long-lived
    );
  }

  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, this.accessTokenSecret) as TokenPayload;
  }

  verifyRefreshToken(token: string): { sub: string; jti: string } {
    return jwt.verify(token, this.refreshTokenSecret) as { sub: string; jti: string };
  }
}
```

### Token Refresh Flow
```typescript
class AuthService {
  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // 1. Verify refresh token signature
    const payload = this.jwtService.verifyRefreshToken(refreshToken);
    
    // 2. Check if token is revoked (stored in Redis or DB)
    const isRevoked = await this.tokenStore.isRevoked(payload.jti);
    if (isRevoked) throw new UnauthorizedError('Token revoked');
    
    // 3. Get user and check still active
    const user = await this.userRepo.findById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedError('User not found or inactive');
    
    // 4. Revoke old refresh token (rotation)
    await this.tokenStore.revoke(payload.jti);
    
    // 5. Issue new token pair
    const newAccessToken = this.jwtService.signAccessToken(user.id, user.email, user.role);
    const newRefreshToken = this.jwtService.signRefreshToken(user.id);
    
    // 6. Store new refresh token
    await this.tokenStore.store(newRefreshToken);
    
    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string): Promise<void> {
    const payload = this.jwtService.verifyRefreshToken(refreshToken);
    await this.tokenStore.revoke(payload.jti);
  }
}
```

### Token Storage (Client Side)
```typescript
// Access token: memory (JavaScript variable)
// - Lost on page refresh → okay, refresh token handles renewal
// - Not accessible by other origins

// Refresh token: HttpOnly cookie
// - Not accessible by JavaScript → XSS protection
// - Sent automatically by browser → CSRF risk → mitigate with SameSite=Strict

// Setting the refresh token cookie
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth/refresh',         // only sent to refresh endpoint
});
```

---

### API Key Authentication
For server-to-server communication and public API consumers.

```typescript
class ApiKeyService {
  async generateKey(name: string, userId: string, scopes: Scope[]): Promise<ApiKeyCreateResult> {
    // Use a cryptographically random prefix for identification
    const keyId = `ak_${crypto.randomBytes(8).toString('hex')}`;
    const secret = crypto.randomBytes(32).toString('base64url');
    const fullKey = `${keyId}.${secret}`;

    // Store only the hash — never store the raw key
    const keyHash = await bcrypt.hash(fullKey, 12);

    await this.apiKeyRepo.create({ keyId, keyHash, name, userId, scopes });

    // Return full key only once — user must store it
    return { key: fullKey, keyId };
  }

  async validate(rawKey: string): Promise<ApiKey | null> {
    const [keyId] = rawKey.split('.');
    if (!keyId) return null;

    const stored = await this.apiKeyRepo.findByKeyId(keyId);
    if (!stored) return null;

    const isValid = await bcrypt.compare(rawKey, stored.keyHash);
    if (!isValid) return null;

    // Update last used timestamp
    await this.apiKeyRepo.updateLastUsed(stored.id);
    return stored;
  }
}
```

---

### Role-Based Authorization (RBAC)
```typescript
// Role hierarchy
const ROLE_HIERARCHY = {
  superadmin: 100,
  admin: 80,
  moderator: 60,
  user: 40,
  guest: 20,
} as const;

type UserRole = keyof typeof ROLE_HIERARCHY;

// Permission-based middleware
const requireRole = (minimumRole: UserRole) =>
  (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (!userRole) return res.status(401).json({ error: 'Unauthorized' });
    
    if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[minimumRole]) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };

// Resource-level authorization
const requireOwnership = (getResourceUserId: (req: Request) => Promise<string>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const resourceUserId = await getResourceUserId(req);
    const isOwner = req.user?.id === resourceUserId;
    const isAdmin = ROLE_HIERARCHY[req.user?.role ?? 'guest'] >= ROLE_HIERARCHY['admin'];
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    next();
  };

// Usage
router.delete('/posts/:id',
  authenticate,
  requireOwnership(async (req) => {
    const post = await postRepo.findById(req.params.id);
    return post?.userId ?? '';
  }),
  postController.delete
);
```

---

### OAuth2 Integration
```typescript
// Authorization Code Flow
class OAuthService {
  generateAuthorizationUrl(provider: 'github' | 'google', state: string): string {
    const params = new URLSearchParams({
      client_id: this.config[provider].clientId,
      redirect_uri: this.config[provider].callbackUrl,
      scope: this.config[provider].scopes.join(' '),
      state,                    // CSRF protection
      response_type: 'code',
    });
    return `${this.config[provider].authUrl}?${params}`;
  }

  async handleCallback(provider: 'github' | 'google', code: string): Promise<User> {
    // Exchange code for tokens
    const tokens = await this.exchangeCode(provider, code);
    
    // Get user info from provider
    const providerUser = await this.getProviderUser(provider, tokens.access_token);
    
    // Find or create local user
    const existingUser = await this.userRepo.findByProviderAccount(provider, providerUser.id);
    if (existingUser) return existingUser;
    
    return this.userRepo.create({
      email: providerUser.email,
      name: providerUser.name,
      providerAccounts: [{ provider, providerAccountId: providerUser.id }],
    });
  }
}
```

---

## Decision Framework

- Evaluate the complexity of the task.
- Identify structural bottlenecks.
- Choose the simplest abstraction that solves the problem.

## Anti-Patterns

- Over-engineering the solution.
- Ignoring context and copying blindly.
- Mixing concerns unnecessarily.

## Example in Action

- [ ] Tokens are short-lived (access: 15min, refresh: 7d)
- [ ] Refresh tokens are rotated on use
- [ ] Revoked tokens are tracked (Redis or DB)
- [ ] Passwords hashed with bcrypt (cost factor ≥ 12)
- [ ] API keys stored as hashes, never plain text
- [ ] HttpOnly cookies for refresh tokens
- [ ] OAuth state parameter validated against CSRF
- [ ] Role checks happen in middleware, not in business logic
- [ ] Resource ownership verified for user-scoped operations
