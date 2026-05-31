<!-- @keywords: security, authentication, authorization, JWT, OAuth, RBAC, session, password, security audit -->
<!-- @domain: Security Implementation Prompts -->

# Security Prompts

## Authentication System

```
Implement a secure authentication system for: [application]

**Auth requirements:**
- Method: [email+password / OAuth / magic link / passkey / MFA]
- Session: [JWT / server sessions / cookie-based]
- Persistence: [remember me / always expires after N hours]

**Security requirements (non-negotiable):**

**Password handling:**
- Hash: bcrypt with cost factor 12 (min 10, max 14 for <200ms)
- Salt: per-user (bcrypt handles automatically)
- Comparison: timing-safe (bcrypt.compare — not === on hashes)
- Storage: only store the hash, never plaintext or reversible encryption

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash); // timing-safe by design
}

// Password policy enforcement
function validatePassword(password: string): string | null {
  if (password.length < 12) return 'Password must be at least 12 characters';
  if (!/[A-Z]/.test(password)) return 'Must contain uppercase letter';
  if (!/[0-9]/.test(password)) return 'Must contain a number';
  return null; // valid
}
```

**JWT (if using):**
- Algorithm: RS256 (asymmetric) or HS256 (symmetric — simpler, fine for single service)
- Claims: { sub: userId, iat, exp, jti (unique ID for revocation) }
- Expiry: access token 15min, refresh token 7 days
- Storage: access token in memory (React state), refresh token in HttpOnly cookie
- Never in localStorage (XSS can steal it)

**Rate limiting on auth endpoints:**
- Login: 5 attempts per IP per 15 minutes
- Register: 3 per IP per hour
- Password reset: 3 per email per hour

Implement full auth system for: [your specific requirements].
```

---

## Authorization / RBAC

```
Implement role-based access control for: [application]

**Roles:**
- [role1]: can [list permissions]
- [role2]: can [list permissions]
- [role3]: can [list permissions]

**Resources and actions:**
- [Resource]: [create / read / update / delete / list]
- [Resource]: [...]

**Implementation:**

```typescript
// Permission constants — use string literals, not magic strings
const PERMISSIONS = {
  POSTS_CREATE: 'posts:create',
  POSTS_READ: 'posts:read',
  POSTS_UPDATE_OWN: 'posts:update:own',
  POSTS_UPDATE_ANY: 'posts:update:any',
  POSTS_DELETE_OWN: 'posts:delete:own',
  POSTS_DELETE_ANY: 'posts:delete:any',
  ADMIN_ACCESS: 'admin:access',
} as const;

type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  user: [PERMISSIONS.POSTS_CREATE, PERMISSIONS.POSTS_READ, 
         PERMISSIONS.POSTS_UPDATE_OWN, PERMISSIONS.POSTS_DELETE_OWN],
  moderator: [...ROLE_PERMISSIONS.user, PERMISSIONS.POSTS_UPDATE_ANY, 
               PERMISSIONS.POSTS_DELETE_ANY],
  admin: [...ROLE_PERMISSIONS.moderator, PERMISSIONS.ADMIN_ACCESS],
};

// Authorization function
function can(user: User, permission: Permission, resource?: { userId: string }): boolean {
  const userPermissions = ROLE_PERMISSIONS[user.role] ?? [];
  
  // Check ownership for :own permissions
  if (permission.endsWith(':own') && resource) {
    return user.id === resource.userId && userPermissions.includes(permission);
  }
  
  return userPermissions.includes(permission);
}

// Middleware
function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!can(req.user, permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
```

Implement for: [your roles and permissions structure].
```

---

## Input Validation & Sanitization

```
Implement comprehensive input validation for: [form / API endpoint]

**Inputs to validate:**
[list all input fields with expected types and constraints]

**Validation with Zod:**
```typescript
import { z } from 'zod';

const CreatePostSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be under 200 characters')
    .trim(), // remove leading/trailing whitespace

  body: z.string()
    .min(10, 'Body must be at least 10 characters')
    .max(50000, 'Body is too long'),

  tags: z.array(z.string().max(50).trim())
    .max(10, 'Maximum 10 tags')
    .optional()
    .default([]),

  // URL validation
  externalUrl: z.string()
    .url('Must be a valid URL')
    .startsWith('https://', 'Must use HTTPS')
    .optional(),

  // Enum validation
  status: z.enum(['draft', 'published']).default('draft'),

  // Date in the future
  publishAt: z.string()
    .datetime()
    .refine(date => new Date(date) > new Date(), 'Must be in the future')
    .optional(),
});

// Use in API handler
export async function POST(req: Request) {
  const body = await req.json();
  const result = CreatePostSchema.safeParse(body);
  
  if (!result.success) {
    return Response.json({
      error: 'Validation failed',
      details: result.error.flatten().fieldErrors,
    }, { status: 400 });
  }
  
  // result.data is fully typed and validated
  return createPost(result.data);
}
```

**For HTML content (if accepting rich text):**
```typescript
import DOMPurify from 'isomorphic-dompurify';

function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'code', 'pre'],
    ALLOWED_ATTR: ['href'], // only allow href on <a>, nothing else
  });
}
```

Build validation for: [your specific inputs].
```

---

## Security Headers

```
Implement security headers for: [Next.js / Express / nginx]

**Headers to set:**

**next.config.ts:**
```typescript
const securityHeaders = [
  // Prevents MIME type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  
  // Prevents clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  
  // Enables browser XSS protection
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  
  // Controls referrer information
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  
  // Restricts browser features
  { 
    key: 'Permissions-Policy', 
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' 
  },
  
  // HSTS — force HTTPS for 1 year
  { 
    key: 'Strict-Transport-Security', 
    value: 'max-age=31536000; includeSubDomains; preload' 
  },
  
  // Content Security Policy (customize for your app)
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // relax for Next.js
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.yourdomain.com wss://your-ws-server.com",
      "frame-src 'none'",
    ].join('; ')
  },
];

export default { headers: () => [{ source: '/(.*)', headers: securityHeaders }] };
```

Customize for: [your specific domains and third-party services].
```

---

## Secrets Management

```
Design a secrets management strategy for: [application]

**Environments:**
- Development: local machine
- Staging: [cloud environment]
- Production: [cloud environment]

**Secrets to manage:**
- Database credentials
- Third-party API keys (Stripe, SendGrid, etc.)
- JWT signing secrets
- OAuth client secrets

**Strategy by environment:**

**Development:**
```bash
# .env.local — in .gitignore, never committed
DATABASE_URL="postgresql://localhost:5432/myapp_dev"
STRIPE_SECRET_KEY="sk_test_..."
JWT_SECRET="dev-secret-at-least-32-chars-long"
```

**Staging/Production:**
Use a secrets manager — never put secrets in environment variables in CI/CD config:
- AWS: Secrets Manager or Parameter Store
- GCP: Secret Manager
- Vercel: Environment Variables (encrypted at rest)
- GitHub Actions: Repository Secrets

**Secret rotation:**
- JWT secrets: rotate every 90 days (requires dual-valid period during rotation)
- API keys: rotate immediately on any suspected exposure
- DB passwords: rotate via secrets manager, app auto-reloads

**What MUST NOT be in code:**
- Actual secret values (even in comments)
- Hardcoded credentials for any environment
- Default passwords that are never changed

Show: complete .env.example with placeholder values + validation on app startup.
```
