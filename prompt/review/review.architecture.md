<!-- @keywords: architecture review, system design review, technical debt, coupling, scalability, design decision audit -->
<!-- @domain: Architecture Review Prompts -->

# Architecture Review Prompts

## System Architecture Audit

```
Review the architecture of this system and identify structural risks.

**System description:**
[describe what the system does, who uses it, at what scale]

**Current architecture:**
[describe or paste: services, databases, queues, external dependencies, 
communication patterns (sync/async), deployment model]

**Architecture diagram (if available):**
[paste ASCII diagram or describe the topology]

**Review for:**
1. Single points of failure: what goes down if X fails?
2. Scalability bottlenecks: what breaks first under 10× load?
3. Tight coupling: which components know too much about each other?
4. Missing resilience: where are there no retries, circuit breakers, or fallbacks?
5. Data consistency: are there places where eventual consistency could cause problems?
6. Operational complexity: what's hardest to debug/deploy/scale?

**Output:**
Risk register:
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|

Prioritized by: Likelihood × Impact
```

---

## Module Dependency Review

```
Review the dependency structure of this codebase.

**Code structure:**
[describe or paste the module/folder layout]

**Dependency graph (if you can describe it):**
[which module imports from which — or paste an import map]

**Review for:**
1. Circular dependencies: A imports B imports A
2. Layering violations: UI layer importing from DB layer directly
3. God modules: one file that everything imports from
4. Leaky abstractions: implementation details exposed through public API
5. Missing boundary: feature X knows too much about feature Y's internals

**Desired architecture:**
[describe the layering you want: e.g., UI → Services → Domain → Infrastructure]

**Output:**
- Violations list with file paths
- Refactoring plan to enforce boundaries
- Suggested module structure that eliminates the violations
```

---

## API Design Decision Review

```
I'm deciding between these API design approaches. Help me choose.

**Problem to solve:**
[describe what the API needs to do]

**Option A:**
[describe approach — endpoint structure, data shape, auth model]
Pros: [your assessment]
Cons: [your assessment]

**Option B:**
[describe approach]
Pros: [your assessment]
Cons: [your assessment]

**Option C (if applicable):**
[describe approach]

**Constraints:**
- Clients: [web / mobile / third party / all three]
- Team experience: [REST / GraphQL / RPC / etc.]
- Evolution: [API must be stable for N years / can break]
- Performance requirements: [X req/sec, Y ms latency]

**I need:**
1. Recommendation with reasoning
2. What this choice costs in 2 years when requirements change
3. One thing each option gets wrong that the alternatives do better
```

---

## Technical Debt Assessment

```
Assess the technical debt in this codebase area.

**Code area:**
[paste code or describe the module/feature]

**Age of the code:**
[when was it written, has it been maintained]

**Debt categories to evaluate:**

**Design debt:** Is the architecture appropriate for current requirements?
[score 1-5, describe issues]

**Code debt:** Is the code readable, tested, consistent?
[score 1-5, describe issues]

**Dependency debt:** Are libraries outdated or unsupported?
[score 1-5, describe issues]

**Test debt:** Is coverage adequate? Are tests brittle?
[score 1-5, describe issues]

**Documentation debt:** Is the purpose and behavior documented?
[score 1-5, describe issues]

**Output:**
- Total debt score
- Top 3 items to address first (highest ROI for effort)
- Items safe to leave (low risk, not in hot path)
- Estimated effort to address each top item (days, not months)
```

---

## Third-Party Dependency Audit

```
Audit the third-party dependencies in this project.

**package.json / dependencies:**
[paste package.json or list of packages + versions]

**Review for each significant dependency:**
1. Is it actively maintained? (last commit, open issues, maintainer activity)
2. Bundle size impact (for frontend deps)
3. Security: any known CVEs? (check npm audit)
4. License: compatible with commercial use?
5. Lock-in risk: how hard to replace if abandoned?

**Flag:**
- Abandoned packages (no release in 2+ years, many open CVEs)
- Duplicate functionality (two packages doing the same thing)
- Packages that could be replaced with native browser/Node.js APIs
- Dev dependencies incorrectly listed as production dependencies

**Output:**
Dependency health table + recommended actions (keep / upgrade / replace / remove).
```
