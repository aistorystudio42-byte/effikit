<!-- @keywords: security, authentication, authorization, OWASP, JWT security, session, brute force -->

# Security — Authentication and Session Security

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to auth.

## Principles

### Threat Model First
Before implementing auth security, identify what you're protecting against:

```
Threat: Credential stuffing (automated login with leaked passwords)
→ Rate limiting + CAPTCHA + breach password detection

Threat: Brute force (trying many passwords on one account)
→ Account lockout + exponential backoff + alerting

Threat: Session hijacking (stealing active session tokens)
→ HttpOnly cookies + Secure flag + short session lifetime

Threat: Token theft (stealing JWT from localStorage)
→ Store access tokens in memory, refresh tokens in HttpOnly cookies

Threat: CSRF (tricking browser to make authenticated requests)
→ SameSite cookie attribute + CSRF tokens for state-changing requests
```

---

### Password Security
```typescript
import bcrypt from 'bcrypt';
import { checkPasswordBreach } from './breach-check'; // Have I Been Pwned API

const BCRYPT_COST = 12; // ~250ms on modern hardware — balance security vs UX

class PasswordService {
  async hash(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, BCRYPT_COST);
  }

  async verify(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }

  async validateStrength(password: string): Promise<ValidationResult> {
    const errors: string[] = [];

    if (password.length < 12) errors.push('At least 12 characters required');
    if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter required');
    if (!/[0-9]/.test(password)) errors.push('At least one number required');
    if (!/[^A-Za-z0-9]/.test(password)) errors.push('At least one special character required');

    // Check against known breached passwords
    const isBreached = await checkPasswordBreach(password);
    if (isBreached) errors.push('This password has appeared in a data breach — choose a different one');

    return { isValid: errors.length === 0, errors };
  }
}
```

---

### Brute Force Protection
```typescript
class LoginAttemptTracker {
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly ATTEMPT_WINDOW_MS = 10 * 60 * 1000;   // 10 minute window

  async recordFailedAttempt(identifier: string): Promise<LockoutStatus> {
    const key = `login:attempts:${identifier}`;
    const attempts = await this.redis.incr(key);

    if (attempts === 1) {
      await this.redis.pexpire(key, this.ATTEMPT_WINDOW_MS);
    }

    if (attempts >= this.MAX_ATTEMPTS) {
      await this.lockAccount(identifier);
      return { isLocked: true, unlocksAt: new Date(Date.now() + this.LOCKOUT_DURATION_MS) };
    }

    return { isLocked: false, attemptsRemaining: this.MAX_ATTEMPTS - attempts };
  }

  async isLocked(identifier: string): Promise<boolean> {
    const lockKey = `login:locked:${identifier}`;
    return Boolean(await this.redis.exists(lockKey));
  }

  private async lockAccount(identifier: string): Promise<void> {
    const lockKey = `login:locked:${identifier}`;
    await this.redis.set(lockKey, '1', 'PX', this.LOCKOUT_DURATION_MS);

    // Alert security team on repeated lockouts
    this.eventBus.emit('security.account_locked', { identifier, timestamp: new Date() });
  }
}

// Login handler
async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const identifier = `${email}:${req.ip}`;

  const lockStatus = await loginTracker.isLocked(identifier);
  if (lockStatus) {
    return res.status(429).json({ error: 'Account temporarily locked. Try again in 15 minutes.' });
  }

  const user = await userRepo.findByEmail(email);
  const isValid = user && await passwordService.verify(password, user.passwordHash);

  if (!isValid) {
    const status = await loginTracker.recordFailedAttempt(identifier);
    // Same error message whether user exists or not — prevents user enumeration
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  await loginTracker.clearAttempts(identifier);
  // Issue tokens...
}
```

---

### CSRF Protection
```typescript
// CSRF token pattern for non-SameSite-compatible scenarios
import crypto from 'crypto';

class CsrfService {
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async storeToken(sessionId: string, token: string): Promise<void> {
    await this.redis.set(`csrf:${sessionId}`, token, 'EX', 3600);
  }

  async validateToken(sessionId: string, submittedToken: string): Promise<boolean> {
    const storedToken = await this.redis.get(`csrf:${sessionId}`);
    if (!storedToken) return false;
    // Constant-time comparison — prevents timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(storedToken),
      Buffer.from(submittedToken)
    );
  }
}

// Cookie configuration — SameSite is the primary CSRF defense
res.cookie('sessionId', sessionId, {
  httpOnly: true,          // JavaScript cannot access
  secure: true,            // HTTPS only
  sameSite: 'strict',      // Not sent on cross-site requests — primary CSRF defense
  maxAge: 7 * 24 * 3600 * 1000,
});
```

---

### Multi-Factor Authentication
```typescript
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

class MfaService {
  async setupTotp(userId: string, email: string): Promise<MfaSetupResult> {
    const secret = authenticator.generateSecret();

    // Store encrypted secret — never store plain
    const encryptedSecret = await this.encrypt(secret);
    await this.userRepo.updateMfaSecret(userId, encryptedSecret);

    const otpAuthUrl = authenticator.keyuri(email, 'MyApp', secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    return { qrCodeDataUrl, backupCodes: await this.generateBackupCodes(userId) };
  }

  async verifyTotp(userId: string, token: string): Promise<boolean> {
    const user = await this.userRepo.findById(userId);
    const secret = await this.decrypt(user.mfaSecret);

    return authenticator.verify({ token, secret });
  }

  private async generateBackupCodes(userId: string): Promise<string[]> {
    const codes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex')
    );

    const hashedCodes = await Promise.all(codes.map(c => bcrypt.hash(c, 10)));
    await this.userRepo.storeBackupCodes(userId, hashedCodes);

    return codes; // Return plaintext only once
  }
}
```

---

### Security Headers
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'nonce-{NONCE}'"], // Use nonces, not 'unsafe-inline'
      styleSrc: ["'self'", "'unsafe-inline'"],   // Relax if needed, prefer nonce
      imgSrc: ["'self'", 'data:', 'https://cdn.myapp.com'],
      connectSrc: ["'self'", 'https://api.myapp.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
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

- [ ] Passwords hashed with bcrypt (cost ≥ 12) — never MD5/SHA1
- [ ] Brute force protection: rate limiting + account lockout
- [ ] No user enumeration — same error for wrong user vs wrong password
- [ ] CSRF protection via SameSite=Strict cookies
- [ ] HttpOnly + Secure flags on all auth cookies
- [ ] MFA available (TOTP preferred)
- [ ] Security headers via helmet (CSP, HSTS, referrer policy)
- [ ] Session invalidated on logout (token revocation)
- [ ] Breach password detection on registration and password change
