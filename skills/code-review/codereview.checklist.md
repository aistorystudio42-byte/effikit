<!-- @keywords: code review, PR review, checklist, correctness, security, readability, feedback -->

# Code Review — Review Checklist and Process

## The Purpose of Code Review

Code review is not gatekeeping — it's knowledge transfer and quality assurance. The goal is to ship better software faster, not to find every flaw before merging. Reviews should be collaborative, not adversarial.

```
What code review achieves:
  ✓ Catch bugs before they reach users
  ✓ Spread knowledge across the team
  ✓ Maintain architectural consistency
  ✓ Identify security vulnerabilities early
  ✓ Ensure tests cover the change

What code review is NOT:
  ✗ Style enforcement (use automated formatters/linters)
  ✗ Personal preference battles
  ✗ Approval theater (rubber stamp without reading)
```

---

## Review Priority Order

Review in this order — stop and comment when you find an issue before continuing:

```
1. Correctness  → Does it do what it claims?
2. Security     → Does it introduce vulnerabilities?
3. Tests        → Are the tests adequate?
4. Design       → Does it fit the architecture?
5. Performance  → Any obvious bottlenecks?
6. Readability  → Is it clear to a future reader?
```

Don't spend time on readability if the logic is wrong.

---

## Correctness Checks

```
Logic:
  [ ] Does the code correctly implement the stated requirement?
  [ ] Are edge cases handled? (empty input, null, 0, max values, concurrent calls)
  [ ] Are all error paths handled (not just the happy path)?
  [ ] Are async operations awaited? (missing await is a silent bug)
  [ ] Are loops correct? (off-by-one, infinite loop risk)

Data:
  [ ] Are all external inputs validated before use?
  [ ] Are nullable/undefined values handled before access?
  [ ] Is data mutated unexpectedly? (should be immutable)
  [ ] Are race conditions possible with concurrent requests?

State:
  [ ] Is state updated atomically where needed?
  [ ] Can the system get into an inconsistent state?
  [ ] Are database transactions used for multi-step operations?
```

---

## Security Checks

```
Input:
  [ ] Is user input sanitized/validated at the boundary?
  [ ] Are all SQL queries parameterized? (no string concatenation)
  [ ] Could user input reach exec/eval/innerHTML unsanitized?
  [ ] Are file paths validated against allowed directories?

Auth:
  [ ] Does every protected endpoint check authentication?
  [ ] Does every resource access check ownership (IDOR prevention)?
  [ ] Are roles/permissions checked server-side?
  [ ] Are secrets hardcoded anywhere? (.env refs, not values)

Output:
  [ ] Does error output leak stack traces or system info?
  [ ] Is sensitive data (passwords, tokens, PII) logged?
  [ ] Are response headers set correctly (CORS, security headers)?
```

---

## Test Checks

```
Coverage:
  [ ] Does the change include tests?
  [ ] Are the happy path AND error paths tested?
  [ ] Are edge cases covered? (empty, null, max, boundary values)
  [ ] Are new API endpoints tested end-to-end?

Quality:
  [ ] Do tests assert meaningful outcomes (not just "it ran")?
  [ ] Are tests independent? (no shared state between tests)
  [ ] Are mocks used appropriately? (external deps mocked, business logic not)
  [ ] Do test names describe the behavior being tested?
```

---

## Design Checks

```
Consistency:
  [ ] Does the change follow existing patterns in the codebase?
  [ ] Are naming conventions consistent?
  [ ] Is the abstraction level appropriate?

Coupling:
  [ ] Are components/modules appropriately decoupled?
  [ ] Does the change introduce unnecessary dependencies?
  [ ] Are interfaces/abstractions used for testability?

Complexity:
  [ ] Is the added complexity justified by the requirement?
  [ ] Could this be simpler without losing functionality?
  [ ] Is there a 3-line version of this 20-line function?
```

---

## Giving Feedback

Calibrate feedback with prefixes so the author knows what's required:

```
Required (blocking merge):
  "This will cause a SQL injection: ..."
  "Missing null check will crash in production when user has no orders"

Suggestion (optional improvement):
  "Suggestion: extract this into a named function for clarity"
  "Suggestion: consider using a Map here for O(1) lookup"

Question (seeking understanding, not blocking):
  "Question: why is this defaulting to 'active' instead of 'pending'?"
  "Question: is this safe to call concurrently?"

Nitpick (minor, never blocking):
  "Nit: typo in variable name (expirey → expiry)"
  "Nit: prefer const here since value doesn't change"

Praise (acknowledge good decisions):
  "Nice use of the repository pattern here — easy to test"
  "Good catch on the race condition — I missed that too"
```

---

## Review Time Expectations

```
< 200 lines changed:   review within 4 hours
200–500 lines:         review by end of day
> 500 lines:           request author to split PR

If you can't review today: say so in the PR thread
If you need context: ask, don't block

Author responsibilities:
  - PR description explains WHY (not just what)
  - Breaking changes called out explicitly
  - Screenshots/recordings for UI changes
  - Self-review before requesting review
```

---

## Code Review Checklist

Before approving:
- [ ] Correctness: logic is correct, edge cases handled
- [ ] Security: no injection, no hardcoded secrets, auth checked
- [ ] Tests: meaningful coverage of new behavior
- [ ] Breaking changes: documented and migration path exists
- [ ] Dependency changes: new packages justified and safe
- [ ] Config/env changes: documented in PR description
