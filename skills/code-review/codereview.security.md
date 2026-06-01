<!-- @keywords: code review, security review, vulnerability, OWASP, injection, auth bypass, insecure code -->

# Dangerous innerHTML

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to security.

## Principles

### Security Review Mindset
Security review requires adversarial thinking — you're not asking "does this work?" but "how can this be abused?" Approach every input as if it comes from an attacker. Assume the worst-case user.

---

### Injection Vulnerabilities
### SQL Injection Detection
```typescript
// RED FLAG patterns to search for in review:
// grep: db.query(`...${` or db.query("..." + or db.execute(`...${

// Vulnerable patterns:
const id = req.params.id;
db.query(`SELECT * FROM users WHERE id = ${id}`);           // ✗
db.query("SELECT * FROM users WHERE id = " + id);          // ✗
db.query(`SELECT * FROM users WHERE name LIKE '%${name}%'`); // ✗

// Safe patterns:
db.query('SELECT * FROM users WHERE id = $1', [id]);        // ✓
db.query('SELECT * FROM users WHERE name LIKE $1', [`%${name}%`]); // ✓

// Dynamic identifiers — harder, need allowlist
const ALLOWED_COLS = new Set(['name', 'email', 'created_at']);
if (!ALLOWED_COLS.has(sortBy)) throw new Error('Invalid column');
db.query(`SELECT * FROM users ORDER BY ${sortBy}`); // safe after allowlist
```

### Command Injection Detection
```typescript
// RED FLAG: exec/execSync/spawn with user-controlled string
import { exec } from 'child_process';
exec(`convert ${userInput}.jpg output.png`); // ✗ — command injection

// Safe: execFile with array args (no shell)
import { execFile } from 'child_process';
execFile('convert', [sanitizedFilename + '.jpg', 'output.png']); // ✓
```

### XSS Detection
```tsx
// RED FLAG: dangerouslySetInnerHTML with unescaped user content
<div dangerouslySetInnerHTML={{ __html: userContent }} />   // ✗

// Safe: textContent or sanitized HTML
<div>{userContent}</div>                                     // ✓ (React escapes)
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} /> // ✓
```

---

### Authentication and Authorization Bypass
```typescript
// RED FLAG: Missing auth middleware on a route
router.delete('/users/:id', userController.delete); // ✗ — no authenticate!
router.delete('/users/:id', authenticate, userController.delete); // ✓

// RED FLAG: Authorization check skipped for admin users
async function getOrder(req, res) {
  const order = await orderRepo.findById(req.params.id);
  // Missing: does this order belong to req.user.id?
  return res.json(order); // ✗ — any user can see any order (IDOR)
}

// Correct: always check ownership
async function getOrder(req, res) {
  const order = await orderRepo.findById(req.params.id);
  if (!order || (order.userId !== req.user.id && req.user.role !== 'admin')) {
    return res.status(404).json({ error: 'Not found' }); // 404, not 403 (don't reveal existence)
  }
  return res.json(order); // ✓
}

// RED FLAG: JWT algorithm confusion
// If backend accepts "alg: none" or attacker can change RS256 to HS256
// Always specify expected algorithm:
jwt.verify(token, secret, { algorithms: ['HS256'] }); // ✓
jwt.verify(token, secret); // ✗ — accepts any algorithm
```

---

### Sensitive Data Exposure
```typescript
// RED FLAG: Passwords or secrets in API responses
const user = await userRepo.findById(id);
res.json(user); // ✗ — may include passwordHash, mfaSecret, etc.

// Safe: explicit field selection
res.json({
  id: user.id,
  email: user.email,
  name: user.name,
  createdAt: user.createdAt,
}); // ✓

// RED FLAG: Sensitive data in logs
logger.info({ email, password, token }, 'User login attempt'); // ✗

// Safe: log only what's needed for debugging
logger.info({ email, ip: req.ip }, 'Login attempt'); // ✓

// RED FLAG: Sensitive data in error messages
catch (err) {
  res.json({ error: err.message, stack: err.stack }); // ✗ — leaks internals
}

// Safe: sanitized error response
catch (err) {
  logger.error(err, 'Unexpected error'); // log full error server-side
  res.status(500).json({ error: 'Internal server error' }); // ✓
}
```

---

### Cryptographic Issues
```typescript
// RED FLAG: Weak or broken hash algorithms for passwords
crypto.createHash('md5').update(password).digest('hex'); // ✗
crypto.createHash('sha1').update(password).digest('hex'); // ✗
crypto.createHash('sha256').update(password).digest('hex'); // ✗ — fast, not for passwords

// Safe: bcrypt / argon2 (slow, designed for passwords)
await bcrypt.hash(password, 12); // ✓

// RED FLAG: Math.random() for security purposes
const token = Math.random().toString(36).substr(2); // ✗ — predictable

// Safe: cryptographically secure random
crypto.randomBytes(32).toString('hex'); // ✓

// RED FLAG: Timing-sensitive comparison with ===
if (userToken === storedToken) { ... } // ✗ — timing attack possible

// Safe: constant-time comparison
crypto.timingSafeEqual(Buffer.from(userToken), Buffer.from(storedToken)); // ✓
```

---

### Path Traversal and File Security
```typescript
// RED FLAG: User-controlled file path without validation
const filename = req.query.file;
fs.readFile(`/uploads/${filename}`); // ✗ — attacker: ../../etc/passwd

// Safe: validate path is within allowed directory
const UPLOAD_DIR = path.resolve('/app/uploads');
const resolved = path.resolve(UPLOAD_DIR, filename);
if (!resolved.startsWith(UPLOAD_DIR + path.sep)) {
  throw new SecurityError('Path traversal detected');
}
fs.readFile(resolved); // ✓

// RED FLAG: MIME type from Content-Type header only (easily spoofed)
if (req.file.mimetype === 'image/jpeg') saveFile(req.file); // ✗

// Safe: check actual file content (magic bytes)
const detected = await fileTypeFromBuffer(req.file.buffer);
if (detected?.mime !== 'image/jpeg') throw new SecurityError('Invalid file type');
```

---

### Security Review Quick Search
Commands to run on any diff to catch common issues:

```bash
grep -n "query(\`" src/ -r | grep '\${'
grep -n "query(\"" src/ -r | grep '"\ +'

grep -rn "exec(" src/ | grep -v "execFile"

grep -rn "api_key\|secret\|password" src/ | grep "="

grep -rn "jwt.verify" src/ | grep -v "algorithms"

grep -rn "router\.\(get\|post\|put\|patch\|delete\)" src/ | grep -v "authenticate"

grep -rn "dangerouslySetInnerHTML" src/ | grep -v "DOMPurify"
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

- [ ] All SQL uses parameterized queries (zero string interpolation)
- [ ] All protected routes have authentication middleware
- [ ] All user-owned resources check ownership (IDOR)
- [ ] No sensitive data in API responses (passwords, tokens, internal IDs)
- [ ] No sensitive data in logs
- [ ] Cryptographic random used for tokens (not Math.random)
- [ ] Passwords use bcrypt/argon2 (not SHA/MD5)
- [ ] File paths validated against base directory
- [ ] Error responses don't leak stack traces or system info
