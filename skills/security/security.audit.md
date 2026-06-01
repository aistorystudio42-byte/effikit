<!-- @keywords: security audit, vulnerability scanning, penetration testing, OWASP, dependency audit, secrets detection -->

# Rotate ALL exposed secrets — assume they're compromised

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to audit.

## Principles

### Security Audit Mindset
A security audit is not about finding every possible bug — it's about systematically covering the highest-risk attack surfaces first. Use the OWASP Top 10 as a checklist, but always reason about your specific threat model.

---

### Automated Vulnerability Scanning
### Dependency Auditing
```bash
npm audit
npm audit --audit-level=high  # only fail on high/critical

npm audit fix

npm audit --audit-level=critical --json | jq '.metadata.vulnerabilities.critical'

npx snyk test
npx snyk test --severity-threshold=high

version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 10
```

### Static Analysis (SAST)
```bash
npm install --save-dev eslint-plugin-security

{
  "plugins": ["security"],
  "extends": ["plugin:security/recommended"]
}

semgrep --config=p/javascript
semgrep --config=p/typescript
semgrep --config=p/security-audit

- uses: github/codeql-action/analyze@v3
  with:
    languages: javascript, typescript
```

### Secrets Detection
```bash

gitleaks detect --source . --verbose

gitleaks protect --staged --verbose

```

---

### Manual Security Review
### Code Review Security Checklist

```
Authentication and Session:
  [ ] Tokens expire and are properly invalidated on logout
  [ ] Session fixation prevented (new session ID on auth state change)
  [ ] Password reset tokens are single-use and time-limited
  [ ] "Remember me" functionality uses secure, separate token

Authorization:
  [ ] Every protected endpoint checks auth — no forgotten routes
  [ ] Resource ownership verified (user can only access their own data)
  [ ] Role checks happen server-side, never client-side only
  [ ] No IDOR: ID in URL/body doesn't bypass ownership check

Input Handling:
  [ ] No string concatenation in SQL queries
  [ ] File paths validated against allowed base directory
  [ ] Redirect destinations validated
  [ ] User HTML content sanitized (DOMPurify or equivalent)

Cryptography:
  [ ] No MD5, SHA1 for passwords or security tokens
  [ ] Random values use crypto.randomBytes, not Math.random
  [ ] Secrets not hardcoded — loaded from environment
  [ ] Encryption keys rotated on schedule

Information Disclosure:
  [ ] Error responses don't leak stack traces to client
  [ ] User enumeration not possible via error messages
  [ ] Debug endpoints disabled in production
  [ ] Sensitive data not logged (passwords, tokens, PII)
```

---

### OWASP Top 10 Verification
### A01 — Broken Access Control
```typescript
// Test: Can user A access user B's data by changing the ID?
// Test: Can a regular user call admin endpoints?
// Test: Can JWT with modified payload (without valid signature) be accepted?

// Automated test
describe('Access Control', () => {
  it('should not allow user to access another users orders', async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    const orderB = await createTestOrder(userB.id);

    const response = await request(app)
      .get(`/api/orders/${orderB.id}`)
      .set('Authorization', `Bearer ${userA.token}`);

    expect(response.status).toBe(403);
  });
});
```

### A03 — Injection
```typescript
// Test: SQL injection payloads
const sqlPayloads = [
  "1' OR '1'='1",
  "'; DROP TABLE users; --",
  "1 UNION SELECT * FROM users",
];

for (const payload of sqlPayloads) {
  const response = await request(app)
    .get(`/api/users/${payload}`);
  
  // Should return 400 or 404, never 200 with unexpected data
  expect([400, 404]).toContain(response.status);
}
```

### A07 — Identification and Authentication Failures
```typescript
// Test: Brute force protection
describe('Brute Force Protection', () => {
  it('should lock account after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });
    }

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'correctpassword' });

    expect(response.status).toBe(429);
  });
});
```

---

### Penetration Testing Basics
```
Reconnaissance:
  - Map all endpoints (automated: nikto, manual: explore app)
  - Identify technologies, versions, error messages
  - Check for exposed .git, .env, admin panels, debug endpoints

Authentication Testing:
  - Try common passwords on login
  - Check if rate limiting exists
  - Test password reset flow for token predictability
  - Test "remember me" token security

Authorization Testing:
  - Horizontal privilege escalation (access sibling resources)
  - Vertical privilege escalation (access higher-privilege functions)
  - IDOR: change IDs in URLs and request bodies
  - JWT manipulation (none algorithm, algorithm confusion)

Input Testing:
  - XSS: <script>alert(1)</script> in all text fields
  - SQLi: ' OR 1=1-- in all inputs
  - SSRF: http://169.254.169.254/latest/meta-data/ in URL fields
  - Path traversal: ../../etc/passwd in file path fields
```

---

### Incident Disclosure
```
If you find a vulnerability in your own system:
1. Assess severity and impact immediately
2. Determine if it's being actively exploited (check logs)
3. Patch or mitigate within SLA:
   - Critical (data breach risk): 24 hours
   - High: 7 days
   - Medium: 30 days
   - Low: 90 days
4. Notify affected users if data was exposed
5. Document root cause and preventive measures
6. Disclose publicly after patch (responsible disclosure)
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

- [ ] Dependency audit clean (no critical/high CVEs)
- [ ] No secrets in git history or .env committed
- [ ] SAST scan passing with no high-severity findings
- [ ] OWASP Top 10 manually verified for the current codebase
- [ ] Access control tests covering all protected resources
- [ ] Security headers configured (helmet audit passing)
- [ ] Error responses sanitized (no stack traces to client)
- [ ] Penetration test performed before major releases
