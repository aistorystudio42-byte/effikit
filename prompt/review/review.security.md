<!-- @keywords: security review, vulnerability, pentest, audit, threat model, OWASP, injection, auth bypass -->
<!-- @domain: Security Review Prompts -->

# Security Review Prompts

## Full Security Audit

```
Perform a security audit of this code.

**Code / System:**
[paste code or describe system]

**Context:**
- Public-facing: [yes / no / internal only]
- Handles: [user auth / payments / PII / file uploads / admin functions]
- Authentication: [JWT / sessions / API keys / OAuth]
- Data store: [PostgreSQL / MongoDB / Redis / etc.]

**Threat model — who are the attackers?**
- [ ] External unauthenticated users
- [ ] Authenticated users trying to access other users' data
- [ ] Insiders (compromised employee accounts)
- [ ] Automated scanners

**Audit scope:**
1. Input validation: is all input sanitized before use?
2. SQL/NoSQL injection: are queries parameterized?
3. Authentication: session management, token storage, expiry
4. Authorization: can user A access user B's resources?
5. Sensitive data: is PII logged, returned unnecessarily, or unencrypted?
6. Error messages: do errors leak internal paths, DB schema, or stack traces?
7. Rate limiting: are expensive endpoints protected against abuse?
8. File handling: if accepting uploads, are file types and sizes validated?

**Output:** Findings with CVSS severity score + specific fix for each.
```

---

## Auth Security Review

```
Review the authentication and session management in this system.

**Auth implementation:**
[paste auth code — login, session, token handling, logout]

**Check:**

**Credential handling:**
- [ ] Passwords hashed with bcrypt/argon2 (not MD5/SHA1/plain)
- [ ] Salt is unique per user (bcrypt handles this automatically)
- [ ] No credentials in logs, URLs, or error messages

**Session management:**
- [ ] Session tokens are cryptographically random (not sequential IDs)
- [ ] Sessions expire after inactivity
- [ ] Sessions invalidated on logout
- [ ] Sessions invalidated on password change
- [ ] HttpOnly + Secure + SameSite=Strict on session cookies

**JWT (if used):**
- [ ] Algorithm is RS256 or HS256 (never 'none')
- [ ] Claims validated: exp, iat, aud, iss
- [ ] Token stored in memory or HttpOnly cookie (not localStorage)
- [ ] Refresh tokens rotated on use (rotation-based invalidation)

**Password reset:**
- [ ] Reset tokens single-use
- [ ] Reset tokens expire (within 1 hour)
- [ ] Reset link sent to verified email only
- [ ] Timing-safe comparison for token validation

For each failure: severity + exact fix.
```

---

## Input Validation Review

```
Review all input handling in this code for injection and validation gaps.

**Code:**
[paste input handling code — form parsing, API request parsing, file processing]

**Check each input source:**

**SQL Injection:**
- Are all queries using parameterized statements or ORM?
- Are there any string concatenations building queries?
- Is user input ever interpolated into raw SQL?

**NoSQL Injection (MongoDB):**
- Are query operators ($where, $ne, $gt) filtered from user input?
- Is user input used as query keys (not just values)?

**Command Injection:**
- Is user input ever passed to exec(), spawn(), child_process?
- If so: is it validated against an allowlist (not blocklist)?

**XSS:**
- Is user content rendered with dangerouslySetInnerHTML or equivalent?
- If so: is it sanitized with DOMPurify or similar?
- Are user-controlled values used in href, src, or event handlers?

**Path Traversal:**
- Is user input used to construct file paths?
- Is ../ filtered or paths resolved to a safe base directory?

For each finding: vulnerable line + fixed code.
```

---

## API Rate Limiting Review

```
Review the rate limiting and abuse protection on this API.

**Endpoints:**
[list endpoints or describe the API]

**Current rate limiting (if any):**
[describe what's in place]

**Evaluate:**

1. **Auth endpoints** (login, register, password reset, OTP verify):
   These are the highest priority — brute force target.
   - Limit: [N requests / IP / minute]
   - Lockout after: [N failures]
   - CAPTCHA after: [N failures]
   - Current protection: [adequate / missing / too permissive]

2. **Data-heavy endpoints** (search, export, report generation):
   - Limit per user: [N requests / minute]
   - Cost-based limiting for expensive operations

3. **Write endpoints** (create, update, upload):
   - Per-user limit to prevent mass data creation
   - File upload size and type restrictions

4. **Public endpoints** (no auth required):
   - IP-based rate limiting
   - User-agent validation for bots

**Implementation:**
Recommend specific limits per endpoint category + implementation approach
(Redis-based token bucket / Upstash rate limit / nginx limit_req).
```

---

## Data Exposure Review

```
Review what data is exposed by this API and whether it's appropriate.

**API responses:**
[paste response shapes — real examples or type definitions]

**User context:**
- Authenticated as: [anonymous / regular user / admin]
- Accessing: [own data / other user's data / public data]

**Review each response for:**

1. **Over-exposure:** is more returned than needed?
   - Password hashes in user objects
   - Internal IDs used as primary identifiers
   - Admin-only fields returned to regular users
   - Timestamps revealing deployment/internal schedules
   - Error messages containing stack traces or file paths

2. **Broken object-level authorization:**
   - Can user A request user B's data by changing an ID in the URL?
   - Does the server check ownership, or just authentication?

3. **Mass assignment:**
   - Can users set fields they shouldn't (role, isAdmin, verified) via the request body?

4. **PII minimization:**
   - Is full email shown where only masked version is needed?
   - Is full phone/DOB returned when not required for the UI?

For each finding: exact field + who can see it + why it's a risk + fix.
```
