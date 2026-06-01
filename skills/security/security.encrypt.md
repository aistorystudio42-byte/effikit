<!-- @keywords: encryption, AES, hashing, secrets management, data at rest, TLS, cryptography -->

# Generate secure secrets

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to encrypt.

## Principles

1. **Don't roll your own crypto** — use established libraries (Node.js `crypto`, `libsodium`)
2. **Use modern algorithms** — AES-256-GCM, ChaCha20-Poly1305, RSA-OAEP (not ECB, not CBC without MAC)
3. **Keys are not passwords** — derive keys from passwords with KDF (bcrypt, scrypt, Argon2)
4. **Authenticated encryption** — always use AEAD modes (GCM, CCM) that detect tampering

---

### Symmetric Encryption (AES-256-GCM)
```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;   // 256 bits
const IV_LENGTH = 12;    // 96 bits for GCM
const TAG_LENGTH = 16;   // 128 bits authentication tag

class AesEncryption {
  private readonly key: Buffer;

  constructor(keyHex: string) {
    this.key = Buffer.from(keyHex, 'hex');
    if (this.key.length !== KEY_LENGTH) throw new Error('Key must be 32 bytes');
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    cipher.setAAD(Buffer.from('myapp-v1')); // additional authenticated data

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    // Format: iv:tag:ciphertext (all base64url)
    return [iv, tag, encrypted]
      .map(b => b.toString('base64url'))
      .join(':');
  }

  decrypt(encoded: string): string {
    const parts = encoded.split(':');
    if (parts.length !== 3) throw new Error('Invalid ciphertext format');
    const [ivB64, tagB64, ciphertextB64] = parts;

    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const ciphertext = Buffer.from(ciphertextB64, 'base64url');

    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from('myapp-v1'));

    return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
  }
}

// Usage: encrypt sensitive PII fields before storing
const encryption = new AesEncryption(process.env.ENCRYPTION_KEY!);
const encryptedSsn = encryption.encrypt(user.ssn);
await db.query('UPDATE users SET ssn_encrypted = $1 WHERE id = $2', [encryptedSsn, user.id]);
```

---

### Key Derivation
```typescript
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

class KeyDerivation {
  // Derive encryption key from a master secret + context
  // Use when you need to encrypt different data types with different keys
  async deriveKey(masterSecret: string, context: string): Promise<Buffer> {
    const salt = crypto.createHash('sha256').update(context).digest();
    return scryptAsync(masterSecret, salt, 32) as Promise<Buffer>;
  }

  // Example: separate keys per tenant
  async getTenantKey(tenantId: string): Promise<Buffer> {
    return this.deriveKey(process.env.MASTER_KEY!, `tenant:${tenantId}`);
  }
}
```

---

### Hashing (Non-Reversible)
```typescript
// For data integrity verification — not for passwords
const hash = crypto
  .createHash('sha256')
  .update(data)
  .digest('hex');

// HMAC — hash with secret key (for signatures, API request verification)
const hmac = crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET!)
  .update(payload)
  .digest('hex');

// Webhook signature verification (e.g., Stripe webhooks)
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET!)
    .update(payload)
    .digest('hex');

  // Timing-safe comparison — prevents timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature.replace('sha256=', ''), 'hex')
  );
}
```

---

### Secrets Management
### Environment Variables (Minimum Viable)
```bash
DATABASE_URL=
JWT_SECRET=
ENCRYPTION_KEY=
STRIPE_SECRET_KEY=

DATABASE_URL=postgres://user:password@localhost/myapp
JWT_SECRET=<64-char random hex>

node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Vault / AWS Secrets Manager (Production)
```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

class SecretsService {
  private cache = new Map<string, { value: string; expiresAt: number }>();
  private client = new SecretsManagerClient({ region: process.env.AWS_REGION });

  async getSecret(secretName: string): Promise<string> {
    const cached = this.cache.get(secretName);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const response = await this.client.send(
      new GetSecretValueCommand({ SecretId: secretName })
    );

    const value = response.SecretString!;
    // Cache for 5 minutes — balance freshness vs latency
    this.cache.set(secretName, { value, expiresAt: Date.now() + 5 * 60 * 1000 });
    return value;
  }
}
```

### Key Rotation
```typescript
// Support multiple active key versions during rotation
interface EncryptionKey {
  version: number;
  key: Buffer;
  activeFrom: Date;
  retiredAt?: Date;
}

class RotatingEncryption {
  private keys: Map<number, EncryptionKey>;
  private currentVersion: number;

  encrypt(plaintext: string): string {
    const currentKey = this.keys.get(this.currentVersion)!;
    const encrypted = this.encryptWithKey(plaintext, currentKey.key);
    // Prepend version so we know which key to use for decryption
    return `v${this.currentVersion}:${encrypted}`;
  }

  decrypt(encoded: string): string {
    const [versionStr, ...rest] = encoded.split(':');
    const version = parseInt(versionStr.slice(1));
    const key = this.keys.get(version);

    if (!key) throw new Error(`Unknown key version: ${version}`);
    return this.decryptWithKey(rest.join(':'), key.key);
  }

  // Re-encrypt all data with current key version
  async rotateData(tableName: string, encryptedColumn: string): Promise<void> {
    const rows = await db.query(
      `SELECT id, ${encryptedColumn} FROM ${tableName} WHERE ${encryptedColumn} NOT LIKE 'v${this.currentVersion}:%'`
    );
    for (const row of rows) {
      const plaintext = this.decrypt(row[encryptedColumn]);
      const reencrypted = this.encrypt(plaintext);
      await db.query(`UPDATE ${tableName} SET ${encryptedColumn} = $1 WHERE id = $2`, [reencrypted, row.id]);
    }
  }
}
```

---

### TLS Configuration
```typescript
import https from 'https';
import fs from 'fs';
import tls from 'tls';

const server = https.createServer({
  key: fs.readFileSync('/etc/ssl/private/key.pem'),
  cert: fs.readFileSync('/etc/ssl/certs/cert.pem'),
  
  // Only TLS 1.2 and 1.3 — disable older protocols
  minVersion: 'TLSv1.2',
  
  // Strong cipher suites only
  ciphers: tls.DEFAULT_CIPHERS,
  
  // Prefer server cipher order
  honorCipherOrder: true,
}, app);
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

- [ ] AES-256-GCM used for symmetric encryption (not ECB, not plain CBC)
- [ ] Random IV generated fresh for each encryption operation
- [ ] Authentication tag (GCM) verified on decryption
- [ ] Keys never hardcoded — loaded from env/vault
- [ ] Key rotation mechanism implemented
- [ ] Passwords use bcrypt/argon2, not AES (passwords need slow hash, not encryption)
- [ ] HMAC used for webhook/API signature verification
- [ ] Timing-safe comparison for all secret value comparisons
- [ ] TLS 1.2+ enforced, TLS 1.0/1.1 disabled
