<!-- @keywords: encryption, AES, RSA, hashing, crypto, key management, data encryption, end-to-end -->
<!-- @domain: Encryption & Cryptography Prompts -->

# Encryption & Cryptography Prompts

## Data Encryption at Rest

```
Implement field-level encryption for sensitive data.

**Fields to encrypt:**
- [field1]: [why it needs encryption — SSN, credit card, health data]
- [field2]: [reason]

**Encryption requirements:**
- Algorithm: AES-256-GCM (authenticated encryption — tamper-detectable)
- Key management: [environment variable / AWS KMS / HashiCorp Vault]
- Searchability: [can we search on this field after encryption?]

**Implementation:**

```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // bytes = 256 bits
const IV_LENGTH = 12;  // recommended for GCM
const TAG_LENGTH = 16; // authentication tag

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 64) throw new Error('ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  return Buffer.from(key, 'hex');
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  
  const tag = cipher.getAuthTag();
  
  // Store: iv + tag + ciphertext (all base64 encoded)
  return [iv, tag, encrypted].map(b => b.toString('base64')).join('.');
}

export function decrypt(stored: string): string {
  const key = getEncryptionKey();
  const [ivB64, tagB64, ciphertextB64] = stored.split('.');
  
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  
  return decipher.update(ciphertext) + decipher.final('utf8');
}

// For searchable encrypted fields: encrypt a normalized version as a lookup token
export function searchToken(value: string): string {
  const key = getEncryptionKey();
  return crypto.createHmac('sha256', key).update(value.toLowerCase().trim()).digest('hex');
}
```

**Key rotation strategy:**
Include a `key_version` column — re-encrypt with new key on access, 
not all at once (avoid table lock during rotation).
```

---

## Password and Token Hashing

```
Implement secure hashing for: [passwords / API keys / verification tokens]

**For passwords — use bcrypt or argon2:**

```typescript
import argon2 from 'argon2';  // npm install argon2

// Argon2id — winner of Password Hashing Competition, OWASP recommended
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,    // 19 MiB
  timeCost: 2,          // iterations
  parallelism: 1,
  hashLength: 32,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, password); // timing-safe by design
}

// Detect if hash needs rehashing (algorithm upgrade)
export function needsRehash(hash: string): boolean {
  return argon2.needsRehash(hash, ARGON2_OPTIONS);
}
```

**For API keys — HMAC-SHA256 truncated:**

```typescript
// Don't hash API keys with bcrypt — too slow for per-request validation
// Use HMAC instead
export function hashApiKey(apiKey: string): string {
  const secret = process.env.API_KEY_SIGNING_SECRET!;
  return crypto.createHmac('sha256', secret).update(apiKey).digest('hex');
}

// API key format: prefix_randomBytes
// Show user: sk_live_Xk9mP2...  (full key — shown ONCE at creation)
// Store in DB: hash only
export function generateApiKey(): { key: string; hash: string } {
  const random = crypto.randomBytes(32).toString('base64url');
  const key = `sk_live_${random}`;
  const hash = hashApiKey(key);
  return { key, hash };
}
```

**For one-time tokens (email verify, password reset):**

```typescript
export function generateOtpToken(): { token: string; hash: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString('hex'); // 64 char hex
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  
  return { token, hash, expiresAt };
  // Store hash + expiresAt in DB
  // Send token to user via email
  // On use: hash received token, compare with stored hash
}
```

Implement for: [your specific use case].
```

---

## TLS / HTTPS Configuration

```
Audit and configure TLS for: [server / application]

**Current configuration check:**

```bash
# Test TLS configuration
nmap --script ssl-enum-ciphers -p 443 yourdomain.com

# Or use online tools:
# https://www.ssllabs.com/ssltest/
# https://securityheaders.com/
```

**Secure TLS configuration (nginx):**
```nginx
server {
    listen 443 ssl http2;
    
    # Modern TLS versions only
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # Strong cipher suites only
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305';
    ssl_prefer_server_ciphers off; # Let client choose from allowed list
    
    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Session resumption (performance + security balance)
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off; # disable — forward secrecy risk
    
    # HSTS — tell browsers to always use HTTPS
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
}
```

**Certificate management:**
- Use Let's Encrypt for free auto-renewal
- Set up monitoring for expiry (alert 30 days before)
- Never use self-signed certs in production (breaks trust chains)

Configure for: [your specific server setup].
```

---

## Secure Communication Between Services

```
Implement secure service-to-service communication for: [microservices / internal APIs]

**Communication pattern:**
- [Service A] calls [Service B] for [what]
- Trust model: [services are on the same VPC / cross-environment / internet]

**Authentication options:**

**Option A — Shared secrets (simplest):**
```typescript
// Service A adds a secret header
const response = await fetch('http://service-b/api/internal/action', {
  headers: {
    'X-Internal-Secret': process.env.INTERNAL_API_SECRET!,
    'X-Source-Service': 'service-a',
  },
});

// Service B validates
function validateInternalRequest(req: Request): boolean {
  const secret = req.headers.get('X-Internal-Secret');
  // Timing-safe comparison
  return secret !== null && 
    crypto.timingSafeEqual(
      Buffer.from(secret),
      Buffer.from(process.env.INTERNAL_API_SECRET!)
    );
}
```

**Option B — JWT with service accounts (more auditable):**
Each service has its own keypair. Signs requests with its private key.
Receiving service validates with caller's public key.

**Option C — mTLS (maximum security, complex):**
Both services present client certificates.
Only valid cert holders can connect.
Use for: financial / healthcare / highly regulated environments.

**Network-level security:**
- Internal endpoints not exposed to the internet (VPC-only)
- IP allowlisting for service-to-service traffic
- Service mesh (Istio/Linkerd) for automatic mTLS at infrastructure level

Design for: [your specific service topology].
```

---

## Data Privacy Compliance

```
Implement privacy controls for GDPR / data privacy compliance.

**User rights to implement:**

**1. Right to access:**
```typescript
// Export all data for a user
async function exportUserData(userId: string): Promise<UserDataExport> {
  const [profile, posts, orders, activity] = await Promise.all([
    db.users.findById(userId),
    db.posts.findByUserId(userId),
    db.orders.findByUserId(userId),
    db.activityLog.findByUserId(userId, { limit: 1000 }),
  ]);
  
  return {
    exportedAt: new Date().toISOString(),
    profile: omit(profile, ['passwordHash', 'internalId']),
    posts,
    orders: orders.map(o => omit(o, ['rawPaymentData'])),
    activity,
  };
}
```

**2. Right to erasure ("right to be forgotten"):**
```typescript
async function deleteUserData(userId: string): Promise<void> {
  // Anonymize, don't always fully delete (preserve audit trail, financial records)
  await db.users.update(userId, {
    email: `deleted_${userId}@deleted.invalid`,
    name: '[Deleted User]',
    deletedAt: new Date(),
    // null out optional PII
    phone: null,
    address: null,
    avatar: null,
  });
  
  // Keep posts but remove author attribution
  await db.posts.updateMany({ userId }, { userId: null, authorName: '[Deleted]' });
  
  // Delete sensitive personal data completely
  await db.paymentMethods.deleteMany({ userId });
  await db.messages.anonymize({ userId });
}
```

**3. Consent management:**
Track consent per category, store with timestamp and version.

**4. Data minimization:**
Review data collection — don't collect fields not actively used.

Implement for: [your specific data types and jurisdiction].
```
