<!-- @keywords: developer velocity, shipping speed, decision making, momentum, workflow optimization -->

# Performance Boost — Velocity and Shipping Speed

## Velocity vs Busyness

Velocity is measured by value shipped per week — not lines of code written, tickets closed, or hours worked. A developer who ships one critical feature per week has higher velocity than one who closes 20 tickets of low-impact bug fixes.

```
Velocity killers:
  Large PRs that take days to review and integrate
  Unclear requirements discovered mid-implementation
  Blocked waiting for approvals or dependencies
  Rebuilding things that already exist
  Over-engineering for hypothetical future requirements
  Context switching between too many concurrent tasks

Velocity multipliers:
  Small, focused PRs merged daily
  Requirements clarified before implementation starts
  Work parallelized intelligently
  Existing libraries and patterns reused
  Simplest solution shipped first, complexity added when proven needed
```

---

## The Small PR Discipline

```
PR size rule: < 400 lines changed per PR (excluding generated files)
  
Why this matters:
  400 lines: 15 minutes to review → merged same day
  1000 lines: 45 minutes to review → reviewed "when there's time" → 3 days
  2000 lines: 2 hours to review → "I'll do it tomorrow" → week delay

How to break large PRs:
  1. Feature PR: split by layer (DB migration → service → API → frontend)
  2. Refactoring PR: split by file or concern (rename → extract → restructure)
  3. Feature flags: ship code behind a flag, enable separately
  4. Stacked PRs: each builds on the previous, merged in sequence

The 1-hour rule:
  If a PR takes more than 1 hour to implement,
  it's probably too large or the requirements are unclear.
  Stop and split the work.
```

---

## Decision Speed

Slow decisions kill velocity as surely as bad code. Most decisions are reversible — treat them as such.

```
Decision types:
  Type 1: Irreversible (database architecture, public API contracts, security model)
  Type 2: Reversible (implementation details, UI layout, naming, technology choice within a module)

  Type 1 → slow down, gather input, document tradeoffs
  Type 2 → decide in < 1 hour, ship, course-correct with data

The mistake: treating Type 2 decisions like Type 1.
  "Should we use a Map or an object for this cache?"
  → This is Type 2. Pick one. Ship. Change it in 10 minutes if wrong.

The 2-minute rule for Type 2:
  If you can't decide in 2 minutes, flip a coin.
  Both options are fine — you're burning real time picking between them.

The bias toward action:
  A shipped imperfect solution beats a perfect unshipped one.
  Shipping creates feedback. Feedback creates improvement.
  Not shipping creates nothing.
```

---

## Parallelizing Work

```
Wrong: work sequentially, then wait
  Engineer A: implements feature (3 days)
  → Engineer B: reviews and merges (1 day)
  → Engineer A: fixes review feedback (1 day)
  → QA: tests (1 day)
  Total: 6 days, A idle for 2 days

Right: work in parallel
  Engineer A: implements and writes tests simultaneously
  Engineer A: sends for review while writing docs
  Engineer B: reviews in 30-min blocks, not batched at end
  QA: writes test cases while engineer implements
  Total: 3.5 days, everyone productive throughout

Technical parallelization:
  Backend and frontend implement behind a feature flag simultaneously
  Backend uses contract test (mock), frontend uses mock API
  Both merge when ready, integration tested before flag enabled
```

---

## Unblocking Yourself

```
Blocked on a decision? 
  → Make a decision with explicit assumptions, proceed, note to revisit
  → "I'm proceeding as if X is true. If X isn't true, change Y."

Blocked on a dependency?
  → Build behind a mock/stub, integrate when dependency is ready
  → Identify what you CAN do while waiting

Blocked on unclear requirements?
  → Write your interpretation down, share it, get confirmation
  → Timebox the clarification: "if no answer by 3pm, proceeding with interpretation A"

Blocked on knowledge?
  → 15 minutes of research, then ask
  → Don't spend 4 hours trying to avoid looking ignorant
  → A 5-minute explanation from a senior saves 4 hours of confused research

Velocity principle:
  Being blocked is normal. Staying blocked is a choice.
```

---

## Measuring Your Own Velocity

```typescript
// Weekly velocity self-assessment (Friday, 10 minutes)

interface WeeklyReview {
  shipped: string[];          // what actually merged to main?
  blocked: string[];          // what stopped me?
  timeSinks: string[];        // what took longer than expected?
  wins: string[];             // what went surprisingly well?
  nextWeekFocus: string;      // one thing that will increase velocity
}

// Example:
const week = {
  shipped: [
    'Coupon validation service with tests',
    'Rate limiting middleware on auth endpoints',
  ],
  blocked: [
    'Waiting 2 days for design approval on checkout redesign',
  ],
  timeSinks: [
    'Debugging the timezone issue — 4 hours for a 3-line fix',
  ],
  wins: [
    'Found existing util library that handled CSV export — saved a day',
  ],
  nextWeekFocus: 'Define checkout requirements before starting to avoid mid-sprint pivots',
};

// Pattern recognition over 4 weeks:
// If "blocked on approvals" appears every week → process problem, not individual problem
// If "underestimated complexity" appears every week → estimation problem → spike first
// If "found existing solution" appears → spending enough time on research
```

---

## Velocity Checklist

- [ ] PRs < 400 lines (split if larger)
- [ ] Requirements confirmed before implementation starts (not discovered mid-sprint)
- [ ] Type 2 decisions made in < 1 hour
- [ ] Blocked items escalated within 30 minutes of discovering blocker
- [ ] Work parallelized: test writing happens alongside implementation
- [ ] Weekly review done: what shipped, what blocked, what to improve
- [ ] One velocity-limiting pattern identified and addressed per week
