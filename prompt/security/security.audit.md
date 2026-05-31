<!-- @keywords: security audit, vulnerability scan, penetration test, OWASP, threat model, attack surface, CVE -->
<!-- @domain: Security Audit & Threat Modeling Prompts -->

# Security Audit Prompts

## Threat Modeling

```
Create a threat model for: [system / feature]

**System description:**
[describe the system, its components, and data flows]

**Assets to protect:**
- [user PII / financial data / authentication credentials / API keys]
- [business logic / proprietary algorithms]
- [infrastructure / availability]

**STRIDE threat analysis:**

**S — Spoofing (identity):**
- Threat: [how could an attacker impersonate another user?]
- Likelihood: [H/M/L]
- Mitigation: [strong authentication, session validation]

**T — Tampering (data):**
- Threat: [how could data be modified without authorization?]
- Likelihood: [H/M/L]
- Mitigation: [input validation, integrity checks, audit logs]

**R — Repudiation (denial of actions):**
- Threat: [how could a user deny an action they took?]
- Likelihood: [H/M/L]
- Mitigation: [audit logs, non-repudiation mechanisms]

**I — Information Disclosure:**
- Threat: [what sensitive data could be exposed and how?]
- Likelihood: [H/M/L]
- Mitigation: [encryption, access control, output filtering]

**D — Denial of Service:**
- Threat: [how could the system be made unavailable?]
- Likelihood: [H/M/L]
- Mitigation: [rate limiting, circuit breakers, auto-scaling]

**E — Elevation of Privilege:**
- Threat: [how could an attacker gain higher permissions?]
- Likelihood: [H/M/L]
- Mitigation: [RBAC, privilege validation on server side]

**Top 5 risks to address immediately:**
[ranked by Likelihood × Impact]
```

---

## API Security Checklist

```
Perform a security audit on this API.

**API spec / endpoints:**
[paste endpoint list or OpenAPI spec]

**Checklist:**

**Authentication:**
- [ ] All non-public endpoints require authentication
- [ ] Auth token validated on server (not just presence — actual cryptographic validation)
- [ ] Expired tokens rejected (check exp claim, not just signature)
- [ ] Revoked tokens rejected (token blacklist or short expiry + refresh)

**Authorization (OWASP API2):**
- [ ] Object-level auth: can user A access user B's resource by changing ID?
- [ ] Function-level auth: can regular user call admin endpoints?
- [ ] Property-level auth: can user update fields they shouldn't (role, isAdmin)?

**Input handling:**
- [ ] All inputs validated (type, length, format, range)
- [ ] No raw SQL construction from user input
- [ ] File uploads: type verified (not just extension — check magic bytes)
- [ ] File uploads: size limited
- [ ] File uploads: filename sanitized, not used in filesystem paths

**Output handling:**
- [ ] No sensitive fields in responses (passwords, secrets, tokens)
- [ ] Error messages don't leak stack traces or internal paths
- [ ] Response headers don't expose server version or framework

**Rate limiting:**
- [ ] Auth endpoints: strict limits (5/min per IP)
- [ ] API endpoints: per-user limits
- [ ] Expensive operations: lower limits

**For each failed check:** severity + specific endpoint + exact fix.
```

---

## Dependency Vulnerability Scan

```
Audit dependencies for known vulnerabilities.

**Run and share the output of:**
```bash
# npm projects
npm audit --json

# Or for a detailed report
npx audit-ci --json

# Check for outdated packages
npm outdated
```

**For each vulnerability found:**

| Package | CVE | Severity | Affected version | Fixed version | Path |
|---------|-----|----------|-----------------|---------------|------|

**Triage rules:**
- CRITICAL/HIGH in production dependency → fix immediately
- CRITICAL/HIGH in dev dependency only → fix this sprint
- MODERATE → fix within 30 days
- LOW → fix with next routine upgrade

**For each HIGH/CRITICAL finding:**
- What does the vulnerability actually enable? (not just CVE description)
- Is the vulnerable code path reachable from our application?
- Fix: `npm install package@fixed-version`
- If no fix available: workaround or replacement package

**For packages with no fix:**
- Is there an alternative package? (check before recommending removal)
- Can we add a wrapper that avoids the vulnerable code path?
```

---

## OWASP Top 10 Assessment

```
Assess this application against the OWASP Top 10 (2021).

**Application type:** [web app / API / mobile backend]
**Code / description:**
[paste relevant code sections or describe the system]

**A01 — Broken Access Control:**
[Can users access other users' data or perform unauthorized actions?]
Finding: [pass/fail/partial]
Evidence: [specific code or behavior]
Fix: [if failed]

**A02 — Cryptographic Failures:**
[Is sensitive data encrypted? Are weak algorithms used?]
Finding: [pass/fail/partial]

**A03 — Injection (SQL, NoSQL, Command, LDAP):**
[Is user input ever concatenated into queries or commands?]
Finding: [pass/fail/partial]

**A04 — Insecure Design:**
[Are there design-level security gaps vs implementation bugs?]
Finding: [pass/fail/partial]

**A05 — Security Misconfiguration:**
[Default credentials? Unnecessary features enabled? Error details exposed?]
Finding: [pass/fail/partial]

**A06 — Vulnerable Components:**
[Are libraries and frameworks up to date? Any known CVEs?]
Finding: [pass/fail/partial]

**A07 — Identification & Authentication Failures:**
[Brute force protection? Credential stuffing protection? Weak sessions?]
Finding: [pass/fail/partial]

**A08 — Software & Data Integrity Failures:**
[Are CI/CD pipelines secure? Is data tamper-detectable?]
Finding: [pass/fail/partial]

**A09 — Security Logging & Monitoring Failures:**
[Are security events logged? Are logs monitored for anomalies?]
Finding: [pass/fail/partial]

**A10 — Server-Side Request Forgery (SSRF):**
[Can users make the server issue HTTP requests to internal systems?]
Finding: [pass/fail/partial]

Prioritized remediation plan for all failures.
```

---

## Incident Response Plan

```
Create a security incident response plan for: [organization/product]

**Incident types covered:**
- Data breach (PII exposed)
- Unauthorized account access
- API key compromise
- DDoS attack
- Ransomware / infrastructure compromise

**Response phases:**

**Phase 1 — Detect & Contain (0-4 hours):**
- Detection sources: [monitoring alerts / user report / security scan]
- Immediate actions:
  - Isolate affected systems: [how]
  - Preserve evidence: [don't wipe logs — archive them]
  - Notify security lead: [who, how]
  - Assess scope: [how many users, what data, how long]

**Phase 2 — Eradicate (4-24 hours):**
- Remove attacker access: [rotate credentials, revoke tokens, patch]
- Identify root cause: [how entry was gained]
- Verify eradication: [how to confirm attacker is out]

**Phase 3 — Recover (1-7 days):**
- Restore from clean backup if needed
- Apply security patches
- Enhance monitoring for recurrence
- Gradual restoration of services

**Phase 4 — Notify (as required by law):**
- GDPR: 72 hours from discovery to report to supervisory authority (if EU users affected)
- Users: notify if their data was exposed (what, when, what to do)
- Legal: engage counsel for breach assessment

**Phase 5 — Post-incident (1-2 weeks):**
- Root cause analysis
- Timeline reconstruction
- Prevention measures
- Update this response plan

Write the specific response plan for: [your organization context].
```
