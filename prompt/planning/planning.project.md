<!-- @keywords: project planning, roadmap, MVP, scope, requirements, kickoff, product plan -->
<!-- @domain: Project Planning Prompts -->

# Project Planning Prompts

## MVP Scope Definition

```
Help me define the MVP scope for: [project name]

**Vision:**
[describe what this product does and who it's for — 2-3 sentences]

**Goal of the MVP:**
[validate [specific hypothesis] / get [target users] using it / reach [metric] by [date]]

**Full feature list (brain dump):**
[list everything you're thinking of building — don't filter yet]

**MVP filtering criteria:**
1. Is it essential to test the core hypothesis?
2. Would the product be unusable without it?
3. Can it be faked/manual in MVP and automated later?

**Output:**

**In MVP:**
- [Feature] — because [why it's essential]
- [Feature] — because [why]

**Deferred to v1.1:**
- [Feature] — reason: [not blocking launch / can be manual / complex to build]

**Never build (kill it now):**
- [Feature] — reason: [outside core value prop / premature optimization]

**MVP success metric:**
[specific, measurable — not "users like it"]
```

---

## Sprint Planning

```
Plan a 2-week sprint for this team.

**Team:**
- [N] engineers (capacity: [N story points total])
- [N] designer (capacity: [N points])
- Sprint goal: [one sentence — what does winning this sprint look like?]

**Product backlog (prioritized):**
1. [Story] — estimate: [S/M/L] — priority: [P1/P2/P3]
2. [Story] — estimate: [S/M/L]
3. [Story] — ...
[list all candidate stories]

**Constraints:**
- [X] points reserved for bug fixes
- [N] engineer on PTO days [1-3]
- Hard dependency: [story X must complete before story Y]

**Sprint plan output:**

**Committed stories (fits in capacity):**
- Day 1-3: [stories]
- Day 4-7: [stories]
- Day 8-10: [stories]

**Overflow (next sprint):**
- [stories that didn't fit]

**Risks:**
- [story] has unknown complexity — time-box to [X] days before escalating
- [dependency] may block [story] — mitigation: [plan B]
```

---

## Feature Specification

```
Write a technical specification for: [feature name]

**Feature overview:**
[2-3 sentences: what it does, who uses it, why we're building it]

**User stories:**
- As a [user type], I want to [action], so that [value]
- As a [user type], I want to [action], so that [value]

**Acceptance criteria:**
Given [precondition]
When [action]
Then [expected outcome]
And [additional condition]

**Out of scope (explicitly):**
- [thing that might be assumed but is NOT included]
- [thing]

**Technical approach:**
- Data model changes: [new tables / fields / migrations]
- API changes: [new endpoints / modified endpoints]
- Frontend: [new pages / components / flows]
- Background jobs: [if any]
- External services: [if any]

**Dependencies:**
- Requires [feature/ticket X] to be complete first
- Blocked by [team/person] for [reason]

**Effort estimate:** [S = <3 days / M = 3-5 days / L = 5-10 days / XL = 2+ weeks]
**Confidence:** [High / Medium / Low — why]
```

---

## Estimation Breakdown

```
Break down this feature into tasks and estimate.

**Feature:** [name and brief description]

**Approach:** bottom-up estimation

**Task breakdown:**
For each part of the implementation, list:

**Backend tasks:**
- [ ] [Task name] — [X hours] — notes: [complexity, unknowns]
- [ ] [Task name] — [X hours]

**Frontend tasks:**
- [ ] [Task name] — [X hours]
- [ ] [Task name] — [X hours]

**Data / migration tasks:**
- [ ] [Task name] — [X hours]

**Testing tasks:**
- [ ] Write unit tests for [component] — [X hours]
- [ ] Integration test for [flow] — [X hours]

**Other:**
- [ ] Code review buffer — [X hours]
- [ ] Bug fix buffer — [20% of dev total]

**Total estimate:**
- Optimistic: [sum if everything goes well]
- Realistic: [sum + 25% buffer]
- Pessimistic: [sum + 50% buffer — use if unknowns are high]

**Unknowns that could blow estimate:**
- [unknown 1]: adds [X-Y hours] if it's harder than expected
- [unknown 2]: ...

**Recommendation:** commit to [realistic estimate] publicly, track against optimistic internally.
```

---

## Risk Register

```
Create a risk register for: [project / feature / release]

**Context:**
[brief description of what we're building or shipping]

**Risk identification:**
For each risk:

| Risk | Probability (H/M/L) | Impact (H/M/L) | Score | Mitigation | Owner |
|------|-------------------|---------------|-------|-----------|-------|
| [technical risk] | | | | | |
| [dependency risk] | | | | | |
| [resource risk] | | | | | |
| [deadline risk] | | | | | |

Score = P × I: HH=9, HM=6, MM=4, LH=3, HL=3, LM=2, LL=1

**Top 3 risks to address immediately:**
For each:
- Risk: [description]
- Why it's high priority: [score + consequence]
- Mitigation plan: [specific action, owner, deadline]
- Contingency plan: [what we do if mitigation fails]

**Acceptable risks (monitor, don't act now):**
[list low-score risks]

**Review cadence:** [weekly during sprint / at each milestone]
```
