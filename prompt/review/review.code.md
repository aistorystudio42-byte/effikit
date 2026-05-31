<!-- @keywords: code review, PR review, audit, quality check, feedback, correctness, readability -->
<!-- @domain: Code Review Prompts -->

# Code Review Prompts

## Full PR Review

```
Review this code change as a senior engineer doing a thorough PR review.

**Change description:**
[paste PR title and description, or explain what the change does]

**Code:**
[paste diff or files changed]

**Review focus areas (in priority order):**
1. Correctness: does it do what it claims to do?
2. Security: any injection, auth bypass, data exposure risk?
3. Edge cases: what inputs or states would cause it to fail?
4. Performance: any obvious inefficiencies that will matter at scale?
5. Maintainability: will the next engineer understand this?

**Output format:**
For each finding:
- Severity: [BLOCKER / MAJOR / MINOR / NIT]
- Location: [file:line or function name]
- Issue: [what's wrong]
- Why it matters: [consequence if not fixed]
- Suggestion: [specific code or approach to fix it]

Blockers must be fixed before merge.
Nits are optional improvements.
```

---

## Security-Focused Review

```
Review this code specifically for security vulnerabilities.

**Code:**
[paste code]

**Context:**
- This code handles: [user input / auth / payments / file upload / database / etc.]
- User trust level: [anonymous / authenticated / admin only]
- Data sensitivity: [public / private user data / financial / PII]

**OWASP Top 10 checklist:**
For each relevant category, confirm safe or flag issue:

- [ ] Injection (SQL, NoSQL, command, LDAP)
- [ ] Broken Authentication (session, token, password handling)
- [ ] Sensitive Data Exposure (logs, responses, error messages)
- [ ] Broken Access Control (can user A access user B's data?)
- [ ] Security Misconfiguration (headers, CORS, defaults)
- [ ] XSS (reflected, stored, DOM-based)
- [ ] Insecure Deserialization
- [ ] Using components with known vulnerabilities
- [ ] Insufficient Logging

For each finding: severity + exact code location + specific fix.
```

---

## Performance Review

```
Review this code for performance issues.

**Code:**
[paste code]

**Scale context:**
- Expected load: [N requests/sec / N concurrent users]
- Data size: [typical dataset size]
- Acceptable response time: [X ms P99]

**Check for:**
1. N+1 queries: loops that trigger individual DB queries
2. Missing pagination: returning unbounded result sets
3. Missing caching: expensive computation repeated on every call
4. Re-renders: React components re-rendering unnecessarily
5. Synchronous operations blocking the event loop
6. Memory allocation in hot paths (objects created per request vs reused)
7. Missing indexes referenced in the query WHERE/ORDER clauses
8. Payload bloat: returning more data than the client needs

For each issue:
- Impact estimate: [adds X ms / causes Y extra queries / uses Z extra MB]
- Fix: specific code change
- Expected improvement: [X ms → Y ms / N queries → 1 query]
```

---

## Readability & Maintainability Review

```
Review this code for clarity and long-term maintainability.

**Code:**
[paste code]

**Team context:**
- Team size: [N engineers]
- Seniority: [mixed / mostly junior / senior team]
- Codebase age: [new / 2 years / legacy]

**Review for:**
1. Naming: do names reveal intent? Are there misleading names?
2. Function length: are functions doing one thing?
3. Abstraction level: is complexity hidden in the right places?
4. Comments: are comments explaining WHY (not WHAT the code does)?
5. Magic values: are literals explained?
6. Coupling: is this too tightly coupled to things it shouldn't know about?
7. Testability: would this be hard to unit test? Why?

**Output:**
For each issue: location + what makes it unclear + specific rename/restructure suggestion.
```

---

## API Contract Review

```
Review this API design before it's shipped.

**API spec:**
[paste OpenAPI spec, endpoint list, or describe the API]

**Client that will consume it:**
[mobile app / web app / third-party / internal service]

**Review for:**
1. Consistency: do all endpoints follow the same naming, method, and status code conventions?
2. Versioning: is there a /v1/ prefix? How will breaking changes be handled?
3. Error responses: are errors always in the same shape? Do they include a machine-readable code?
4. Authentication: is auth clearly documented? Is every endpoint that needs auth marked?
5. Pagination: do list endpoints have pagination? Is the page response shape consistent?
6. HTTP methods: are GET/POST/PUT/PATCH/DELETE used correctly?
7. Idempotency: are POST endpoints that should be idempotent designed to be?
8. Payload size: is there anything that will send unreasonably large responses?

For each issue: why it matters for API consumers + specific fix.
```
