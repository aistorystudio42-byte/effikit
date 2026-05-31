<!-- @keywords: debug, bug, diagnose, error, exception, crash, root cause, investigate -->
<!-- @domain: Bug Diagnosis Prompts -->

# Bug Diagnosis Prompts

## Unknown Error — Full Diagnosis

```
Help me diagnose this error. I want the root cause, not a workaround.

**Error message / stack trace:**
[paste full stack trace]

**Context:**
- Where it occurs: [component / function / API route / background job]
- When it occurs: [always / intermittently / after X action / under load]
- Started happening: [always existed / after a recent change — describe change]
- Environment: [dev / staging / production]

**What I've already tried:**
- [attempted fix 1 — result]
- [attempted fix 2 — result]

**Relevant code:**
[paste the function / component / handler where it originates]

**Analysis I need:**
1. Most likely root cause (not just symptom)
2. Why this code path leads to the error
3. The minimal fix
4. Whether there are similar bugs elsewhere in this pattern
```

---

## Intermittent / Race Condition

```
I have a bug that doesn't reproduce consistently. Help me find it.

**Symptom:**
[describe what goes wrong — wrong data, crash, wrong order, duplicate, missing]

**Frequency:**
[every N requests / only under load / only with concurrent users / random]

**Suspected area:**
[async operations / shared state / database / cache / event handlers]

**Code involved:**
[paste the async/concurrent code]

**Questions to answer:**
1. Is there a race condition? Where exactly?
2. What ordering of events produces the bug?
3. What ordering produces correct behavior?
4. Fix: mutex / queue / optimistic lock / atomic operation / other?
5. How to write a test that reliably reproduces it?
```

---

## Performance Regression

```
Something became slow. Help me find why.

**What's slow:**
[page load / API response / database query / background job / render]

**Before:** [X ms / fps]
**After:** [Y ms / fps]
**When regression started:** [after deploy / after data grew / always slow]

**Profiling data (if available):**
[paste Chrome DevTools profile, query EXPLAIN ANALYZE, server metrics, etc.]

**Code that runs in this path:**
[paste relevant code — component render, API handler, query, etc.]

**Analysis needed:**
1. What is the bottleneck? (N+1, re-render, large payload, missing index, etc.)
2. Proof: how to confirm this is the actual bottleneck
3. Fix with expected improvement estimate
4. How to prevent this class of regression (index, memoization, pagination, etc.)
```

---

## State Bug

```
My application state is inconsistent. Help me trace why.

**Symptom:**
[UI shows X but it should show Y / state updates don't reflect / stale data shown]

**State management:**
[React useState / Zustand / Redux / Context / Server state (React Query, SWR)]

**State flow:**
[describe: where state is created → how it's updated → where it's read]

**Code:**
[paste the state definitions, update handlers, and reading components]

**Questions:**
1. Where is the state getting out of sync?
2. Is this a closure / stale ref / missing dependency issue?
3. Is there a mutation happening where it shouldn't?
4. Is there an async update ordering issue?
5. Fix and how to verify it's correct
```

---

## Error Boundary / Silent Failure

```
Something is failing silently — no error shown, wrong result returned.

**Expected behavior:**
[what should happen]

**Actual behavior:**
[what actually happens — wrong value, nothing, partial result]

**No error thrown — the code "succeeds" but produces wrong output.**

**Code path:**
[paste the function/handler/component — trace from input to output]

**Debugging approach:**
Add logging at each step and show me what each intermediate value should be.

**I need:**
1. Which step in the pipeline produces the wrong value
2. Why that step produces it (type coercion? incorrect condition? wrong data shape?)
3. The specific line that needs to change
4. A test case that would catch this going forward
```
