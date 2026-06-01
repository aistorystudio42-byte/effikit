<!-- @keywords: security, XSS, SQL injection, input validation, sanitization, injection attacks, OWASP -->

# Security — Input Security and Injection Prevention

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to input.

## Principles

**Never trust input.** Every value that crosses a trust boundary — HTTP body, query params, headers, file uploads, database reads from external sources, message queue payloads — must be treated as potentially malicious until validated and sanitized.

Trust boundaries:
- HTTP request → your API
- User → your database (via your API)
- External API response → your system
- Uploaded file → your storage/processor

---

### SQL Injection Prevention
SQL injection is fully preventable. The fix is always the same: parameterized queries.

```typescript
// VULNERABLE — never do this
const userId = req.params.id; // attacker sends: "1 OR 1=1"
const query = `SELECT * FROM users WHERE id = ${userId}`;
// Executed: SELECT * FROM users WHERE id = 1 OR 1=1 → returns ALL users

// SAFE — parameterized query
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
// The value is always treated as data, never as SQL

// ORM — also safe (uses parameterized queries internally)
const user = await User.findOne({ where: { id: userId } });

// Dynamic column names — parameterization doesn't work for identifiers
// WRONG:
const column = req.query.sortBy; // attacker sends: "id; DROP TABLE users--"
const query = `SELECT * FROM users ORDER BY ${column}`;

// CORRECT: allowlist for identifiers
const ALLOWED_SORT_COLUMNS = new Set(['name', 'email', 'created_at']);
const sortColumn = ALLOWED_SORT_COLUMNS.has(column) ? column : 'created_at';
const query = `SELECT * FROM users ORDER BY ${sortColumn}`; // safe, validated
```

---

### XSS Prevention
Cross-Site Scripting injects malicious scripts into web pages viewed by other users.

### Stored XSS
```typescript
// VULNERABLE: Store user input, render without escaping
await db.query('INSERT INTO comments (body) VALUES ($1)', [req.body.comment]);
// Later: <div>{comment.body}</div> → <script>steal(document.cookie)</script>

// PREVENTION 1: Escape on output (React does this automatically)
// JSX: <div>{comment.body}</div> → React escapes HTML entities
// ✓ Safe: &lt;script&gt;...

// PREVENTION 2: Sanitize on input (for user-generated HTML content)
import DOMPurify from 'isomorphic-dompurify';

const safeHtml = DOMPurify.sanitize(req.body.comment, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href'],
  ALLOW_DATA_ATTR: false,
});

// PREVENTION 3: CSP header blocks inline scripts even if XSS occurs
// Content-Security-Policy: script-src 'self' 'nonce-abc123'
```

### DOM-Based XSS
```typescript
// VULNERABLE: Setting innerHTML from user-controlled data
element.innerHTML = userContent;           // XSS
document.write(location.search);           // XSS

// SAFE alternatives
element.textContent = userContent;         // Text only, no HTML parsing
element.setAttribute('data-value', value); // Attribute, not HTML

// VULNERABLE: URL injection
const redirectUrl = req.query.return;
res.redirect(redirectUrl); // attacker: javascript:steal()

// SAFE: Validate URL before redirect
const safeRedirect = (url: string, allowedHosts: string[]): string => {
  try {
    const parsed = new URL(url, 'https://myapp.com');
    if (allowedHosts.includes(parsed.hostname)) return url;
  } catch {}
  return '/dashboard'; // fallback to safe default
};
```

---

### Path Traversal Prevention
```typescript
import path from 'path';

// VULNERABLE: User controls file path
const filename = req.params.filename; // attacker: ../../etc/passwd
const filepath = `/uploads/${filename}`;
fs.readFile(filepath); // reads /etc/passwd!

// SAFE: Resolve and validate against base directory
const UPLOAD_DIR = path.resolve('/app/uploads');

function safeFilePath(userInput: string): string {
  // Remove null bytes (used to terminate strings in some contexts)
  const sanitized = userInput.replace(/\0/g, '');

  // path.resolve handles .. and .
  const resolved = path.resolve(UPLOAD_DIR, sanitized);

  // Must start with the allowed base directory
  if (!resolved.startsWith(UPLOAD_DIR + path.sep) && resolved !== UPLOAD_DIR) {
    throw new SecurityError('Path traversal attempt detected');
  }

  return resolved;
}
```

---

### Command Injection Prevention
```typescript
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// VULNERABLE: exec with string concatenation
import { exec } from 'child_process';
const filename = req.body.filename; // attacker: "file.pdf; rm -rf /"
exec(`convert ${filename} output.jpg`); // executes rm -rf /

// SAFE: execFile with array arguments — no shell interpretation
async function convertImage(filename: string): Promise<void> {
  // Validate filename first
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename)) {
    throw new ValidationError('Invalid filename');
  }

  // execFile does not invoke a shell — arguments are passed directly
  await execFileAsync('convert', [
    path.join(UPLOAD_DIR, filename),
    path.join(OUTPUT_DIR, `${filename}.jpg`),
  ]);
}
```

---

### Header Injection Prevention
```typescript
// VULNERABLE: User input in HTTP headers
const redirectUrl = req.body.url;
res.setHeader('Location', redirectUrl);
// Attacker value: "http://evil.com\r\nSet-Cookie: session=stolen"
// Injects additional headers via CRLF

// SAFE: Validate and encode header values
function safeHeader(value: string): string {
  // Remove CR and LF characters
  return value.replace(/[\r\n]/g, '');
}

res.setHeader('Location', safeHeader(redirectUrl));

// Better: Use res.redirect() which handles this automatically in Express
// Or validate the URL is a known-safe destination
```

---

### File Upload Security
```typescript
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';

const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 5,                    // max 5 files per request
  },
  fileFilter: (req, file, cb) => {
    // Check declared MIME type (not sufficient alone — easily spoofed)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new ValidationError('File type not allowed'));
    }
    cb(null, true);
  },
});

// After upload: verify actual file content (magic bytes)
async function validateFileContent(buffer: Buffer, declaredType: string): Promise<void> {
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected) throw new SecurityError('Could not determine file type');

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(detected.mime)) {
    throw new SecurityError(`File type ${detected.mime} is not allowed`);
  }

  if (detected.mime !== declaredType) {
    throw new SecurityError('Declared type does not match actual file content');
  }
}

// Serve files from separate domain — isolate uploaded content
// Never serve user-uploaded files from the same origin as your app
// Use CDN with separate domain: static.myapp.com or S3 presigned URLs
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

- [ ] All SQL uses parameterized queries — zero string concatenation
- [ ] Dynamic identifiers (column/table names) use strict allowlists
- [ ] User HTML content sanitized with DOMPurify before storage
- [ ] React/template auto-escaping not bypassed (`dangerouslySetInnerHTML` avoided)
- [ ] File paths resolved and validated against base directory
- [ ] Shell commands use `execFile`, not `exec`
- [ ] Redirect targets validated against allowed hosts
- [ ] File uploads checked by content (magic bytes), not just MIME header
- [ ] Uploaded files served from isolated origin (separate domain/CDN)
