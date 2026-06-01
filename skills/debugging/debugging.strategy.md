<!-- @keywords: debugging, bug finding, root cause, systematic debugging, hypothesis, reproduction -->

# Debugging — Systematic Problem-Solving Strategy

## Core Philosophy

Most debugging time is wasted by changing code randomly and hoping the bug disappears. Systematic debugging is faster — even when it feels slower — because it moves toward certainty instead of wandering.

The scientific method applied to bugs:

```
1. Observe: What exactly happens? What was expected?
2. Reproduce: Can you make it happen consistently?
3. Hypothesize: What could cause this?
4. Test: What's the minimal change to prove/disprove the hypothesis?
5. Fix: Address root cause, not symptoms
6. Verify: Does the fix work? Can the bug still occur?
```

---

## When to Activate

> This skill should be activated when you need to resolve issues related to strategy.

## Principles

### Step 1: Precise Bug Description
Before touching any code, write down exactly:

```
Environment:    production / staging / local
Trigger:        what action causes it
Expected:       what should happen
Actual:         what actually happens
Frequency:      always / sometimes / once
First seen:     recently / always / after X deploy
```

Vague: "The page is broken."
Precise: "Clicking 'Submit' on the checkout form with a coupon code applied causes a 500 error. Started after the v2.3.1 deploy on 2024-03-14. Reproducible 100% of the time with coupon code 'SAVE10'."

The precise description narrows the search space dramatically.

---

### Step 2: Reproduce Reliably
A bug you can't reproduce consistently is extremely hard to fix. Before hypothesizing, focus entirely on making the bug deterministic.

```
Vary one thing at a time:
  - Different user accounts?
  - Different browsers?
  - Different network conditions?
  - Different data states (empty list, large list, special characters)?
  - Different timing (slow network, concurrent requests)?
  - Different environment variables?

Minimal reproduction: find the smallest input that still triggers the bug
  - Remove every irrelevant step
  - Remove every irrelevant piece of data
  - If bug needs 10 steps, try to get it to 3
```

A minimal reproduction case often reveals the bug itself.

---

### Step 5: Hypothesis Testing
Form the most probable hypothesis first, then test it cheaply.

```
Hypothesis: "The bug is caused by the user having no orders (empty array)"

Cheap test: Add a log before the crash
  console.log('orders:', orders);
  
  If orders is [] and crashes → hypothesis confirmed
  If orders has items and crashes → hypothesis wrong, form new one

Rule: Test in a way that directly proves or disproves.
Don't change code before confirming the hypothesis.
```

### Common Bug Categories and Quick Tests

```
Type errors → console.log(typeof value), console.log(value)
Race conditions → add delays, check if timing-dependent
Cache issues → clear cache and retry
Environment issues → compare prod vs local env vars
Off-by-one → check boundary values (0, 1, max)
Encoding issues → log hex representation, check charset
Timezone → check UTC vs local time
Float precision → compare with Math.abs(a - b) < epsilon
```

---

### Step 6: Fix Root Cause, Not Symptoms
```typescript
// Symptom fix (wrong): Hides the bug
const getUserName = (user: any) => user?.name ?? 'Unknown';

// Root cause question: WHY is user undefined here?
// Maybe: caller passes null user from an unhandled API error
// Maybe: race condition — component renders before data loads
// Maybe: wrong data fetched (wrong ID used in query)

// Root cause fix: Handle the actual problem
// Option A: Show loading state until user is loaded
if (!user) return <LoadingSpinner />;
// Option B: Fix the query that returns null user for valid IDs
// Option C: Validate before calling component
```

---

### Step 7: Verify the Fix
```
After fixing:
1. Does the original bug no longer occur? (with the exact reproduction steps)
2. Does the fix work for all related edge cases?
3. Did the fix introduce any new issues? (run test suite)
4. Is the fix correct, or just hiding the symptoms?

Document the fix:
- What was the root cause?
- Why did it happen?
- Write a test that would catch this regression
```

---

### Debugging Mindset
```
"The computer is always right." — if behavior is unexpected, your mental model is wrong
"Assume nothing." — verify assumptions with logs/debugger, don't trust your memory
"Simplify before investigating." — reproduce with minimal case
"One change at a time." — if you change multiple things, you don't know which one worked
"Read before searching." — the error message usually contains the answer
```

## Decision Framework

- Evaluate the complexity of the task.
- Identify structural bottlenecks.
- Choose the simplest abstraction that solves the problem.

## Anti-Patterns

```typescript
// An error message is a map — read it completely before searching

// Example stack trace
Error: Cannot read properties of undefined (reading 'name')
    at UserCard (UserCard.tsx:23:18)          ← exactly where it crashed
    at renderWithHooks                         ← React internals (skip these)
    at updateFunctionComponent
    at ProfilePage (ProfilePage.tsx:45:12)    ← what called UserCard
    at App.tsx:12:8                            ← root

// This tells you:
// 1. Something is undefined on line 23 of UserCard.tsx
// 2. Accessing .name on that undefined value
// 3. The undefined value came from ProfilePage, which passed it as a prop

// Wrong approach: Google the error and copy a solution
// Right approach: Go to UserCard.tsx:23, find the .name access,
//                 trace where that value comes from
```

---

## Example in Action

When you don't know where the bug is, bisect — don't search linearly.

```
System: A → B → C → D → E → F (output wrong)

Instead of checking A, then B, then C...
Check at the midpoint: is the data correct after C?
  Yes → bug is in D, E, or F → check E
  No  → bug is in A, B, or C → check B

Halves the search space with each check.
```

```typescript
// Practical bisection: add a log at the middle of a long pipeline
console.log('After transform, before filter:', JSON.stringify(data, null, 2));

// In git: use git bisect to find which commit introduced the bug
git bisect start
git bisect bad HEAD          // current commit is broken
git bisect good v2.2.0       // this version was fine
// Git checks out a middle commit — test it, mark good or bad
git bisect good / git bisect bad
// Repeat until git identifies the exact commit
git bisect reset
```

---
