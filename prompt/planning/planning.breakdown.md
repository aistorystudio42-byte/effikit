<!-- @keywords: task breakdown, work breakdown, subtask, decompose, implementation plan, step by step, todo list -->
<!-- @domain: Task Breakdown & Implementation Planning Prompts -->

# Task Breakdown Prompts

## Feature Implementation Plan

```
Create a step-by-step implementation plan for: [feature]

**What we're building:**
[describe the feature]

**Tech stack:**
[list: Next.js / Supabase / shadcn / etc.]

**Dependencies (things that must exist first):**
[list: auth system / user table / existing component X]

**Implementation order (dependency-aware):**

**Step 1 — Data layer:**
- [ ] Create migration: [table/column additions]
- [ ] Add Zod schemas for validation
- [ ] Add TypeScript types
- [ ] Write repository functions: [list CRUD operations needed]
- [ ] Test: [what to verify at this step]

**Step 2 — API layer:**
- [ ] [Method] [endpoint]: [what it does]
- [ ] [Method] [endpoint]: [what it does]
- [ ] Add auth middleware to routes that need it
- [ ] Test: curl commands or API tests

**Step 3 — Business logic:**
- [ ] [Service/function]: [what it does]
- [ ] Error cases: [list edge cases to handle]
- [ ] Test: unit tests for each function

**Step 4 — UI components:**
- [ ] [Component]: [what it does]
- [ ] [Component]: [what it does]
- [ ] Loading states for each async operation
- [ ] Error states for each failure mode
- [ ] Empty states

**Step 5 — Integration & polish:**
- [ ] Wire components to API
- [ ] Add form validation
- [ ] Add keyboard accessibility
- [ ] Cross-browser test: [Chrome / Safari / Firefox]
- [ ] Mobile test at 375px

**Step 6 — Finishing:**
- [ ] Code review
- [ ] Update changelog
- [ ] Write E2E test for the happy path
```

---

## Bug Fix Plan

```
Create a structured plan to fix this bug.

**Bug description:**
[what's wrong — symptom + error message]

**Confirmed reproduction:**
[steps that reliably trigger the bug]

**Impact:**
[how many users / how often / severity]

**Investigation plan:**
1. [ ] Add logging at [specific points] to confirm the faulty state
2. [ ] Verify: is the bug in [component A] or [component B]?
3. [ ] Identify the specific line/condition causing it

**Fix plan:**
1. [ ] [Specific code change]
2. [ ] [Update any related code affected by the fix]
3. [ ] [Add a guard/assertion to prevent recurrence]

**Test plan:**
1. [ ] Reproduce the bug with existing test or manual steps
2. [ ] Apply fix
3. [ ] Confirm bug is gone
4. [ ] Confirm no regressions: run [specific test suite]
5. [ ] Add a test that would have caught this bug

**Deployment:**
- [ ] Is a hotfix deploy needed or can it wait for next release?
- [ ] Does the fix require a migration? (schema change)
- [ ] Is there a feature flag needed for safe rollout?
```

---

## Onboarding Plan for New Feature

```
Create an onboarding/rollout plan for: [new feature]

**Feature:** [description]
**Users:** [all users / specific segment / opted-in beta]
**Rollout strategy:** [gradual % rollout / feature flag / all at once]

**Pre-launch checklist:**

**Technical:**
- [ ] Feature flag configured: [flag name, default off]
- [ ] Monitoring in place: [what metrics to watch]
- [ ] Error alerting: [what alert to create]
- [ ] Rollback procedure documented

**Content:**
- [ ] In-app tooltip/onboarding written
- [ ] Help documentation updated
- [ ] Support team briefed on common questions

**Rollout phases:**

Phase 1 — Internal (day 1):
- Enable for [internal team only]
- Watch for: [error rate, performance, edge cases]
- Success criteria: [N uses with 0 critical errors]

Phase 2 — Beta (day 3-7):
- Enable for [N% of users or specific group]
- Watch for: [user engagement, support tickets, errors]
- Success criteria: [completion rate > X%, error rate < Y%]

Phase 3 — Full rollout (day 8-14):
- Enable for all users
- Monitor: [metrics for 48h post-launch]
- Fallback: [turn off feature flag if error rate exceeds X%]
```

---

## Refactoring Plan

```
Plan a safe refactoring of: [module/feature]

**What we're refactoring:**
[paste or describe current code]

**Why we're refactoring:**
[complexity / performance / adding tests was impossible / new requirements don't fit]

**Principle: make it work the same, just differently inside.**

**Phase 1 — Add tests (before touching anything):**
- [ ] Test current behavior: [list test cases]
- [ ] These tests will be the safety net — they must all pass after refactoring

**Phase 2 — Small, safe steps:**
Each step must keep all tests green:
1. [ ] [Extract X into its own function — no behavior change]
2. [ ] [Rename Y for clarity — no behavior change]
3. [ ] [Replace pattern Z with better pattern — same output]
4. [ ] [Move to new module — update imports, all tests still pass]

**Phase 3 — Final cleanup:**
- [ ] Remove old code that's been replaced
- [ ] Update inline documentation
- [ ] Performance comparison: before vs after

**Not in scope:**
- No new features added during refactor
- No API changes unless explicitly planned

**Rollback trigger:**
If any step causes test failures that aren't immediately fixable,
revert the step and plan a different approach.
```

---

## Technical Interview Prep Plan

```
Create a study plan for technical interview preparation.

**Target role:** [SWE / Staff / Infra / Frontend / Fullstack]
**Timeframe:** [N weeks]
**Weak areas:** [list topics you're least confident in]
**Strong areas:** [list topics you're comfortable with]

**Week-by-week plan:**

**Week 1 — Foundations:**
- Day 1-2: [topic: arrays, hash maps, two pointers]
  Practice: [N problems from LeetCode easy]
  Goal: [comfort with basic patterns]
- Day 3-4: [topic]
- Day 5: Mock interview + review

**Week 2 — Core algorithms:**
- [topic per day with practice target]

**Week 3 — System design:**
- Day 1: Study [URL shortener / Twitter / Dropbox]
- Day 2: Practice drawing architecture diagrams
- Day 3: Deep dive on [database / caching / load balancing]

**Week 4 — Practice sprints:**
- 2 mock interviews/day
- Review all failed problems
- Behavioral stories: STAR format for [5 situations]

**Resources:**
- LeetCode: [specific problem lists]
- System design: [specific resources]
- Behavioral: [specific framework]

**Daily tracking:**
- Problems solved: [target N/day]
- Problems reviewed (not just attempted): [N/day]
```
