<!-- @keywords: art, Beethoven, iteration, revision, craft, persistence, mastery, deep work -->

# Art — Beethoven Mode: Iteration, Craft, and Deep Work

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to beethoven.

## Principles

### The Beethoven Mindset
Beethoven's sketchbooks show the same melody revised 20, 50, 100 times. What sounds inevitable and perfect in the final symphony started as crude, uncertain fragments. The Fifth Symphony's famous opening — ba-ba-ba-BUM — went through dozens of versions before Beethoven found the definitive form.

Beethoven Mode is the discipline of iterating relentlessly toward the precise expression you hear in your head. It requires deep work, craft, and the patience to revise until it's right — not until it's good enough.

---

### Deep Work Protocol
Beethoven composed for 8-12 uninterrupted hours. He didn't check messages. He didn't attend meetings during composition sessions.

```
Deep work conditions for programming:
  - 90-minute minimum blocks (less than 90 min rarely produces depth)
  - Notifications disabled (all of them, including Slack)
  - One problem, one context
  - Physical environment set: same desk, same music or silence
  - Defined entry ritual (same sequence before starting)
  - Defined exit ritual: note exactly where you are and what's next

The ritual matters because:
  Context loading for complex systems takes 15-20 minutes
  Context switching costs 20 minutes of recovery
  4 hours of deep work > 8 hours of interrupted work
```

---

### The Sketch-to-Symphony Process
Beethoven sketched melodies quickly, then revised them meticulously. The ratio was important: generate fast, refine slow.

```typescript
// Applied to code: rough draft first, then iterate

// Phase 1: Sketch — get it working, don't clean as you go
// This is the ugly first draft. Don't share it.
function calculateOrderDiscount_DRAFT(order: any): number {
  // TODO: handle coupon types
  // TODO: handle expired coupons
  // TODO: handle maximum discount rules
  if (order.coupon) {
    return order.subtotal * 0.1; // temporary: 10% flat
  }
  return 0;
}

// Phase 2: First revision — correct types, handle cases
function calculateOrderDiscount_V2(order: Order, coupon: Coupon | null): number {
  if (!coupon) return 0;
  if (coupon.expiresAt < new Date()) return 0;
  if (coupon.type === 'percentage') return order.subtotalCents * (coupon.value / 100);
  if (coupon.type === 'flat') return Math.min(coupon.valueCents, order.subtotalCents);
  return 0;
}

// Phase 3: Second revision — edge cases, tests passing, name perfected
function applyCoupon(subtotalCents: number, coupon: Coupon): number {
  if (!isCouponValid(coupon)) return 0;

  const discount = coupon.type === 'percentage'
    ? Math.round(subtotalCents * coupon.value / 100)
    : coupon.valueCents;

  return Math.min(discount, subtotalCents); // cap at subtotal
}

// Phase 4: Final — in context with other functions, naming consistent
// Extract helpers, verify no edge cases missed, add to test suite
```

---

### The Revision Mindset
Beethoven crossed out entire movements and started over. He didn't preserve bad work to show effort.

```
Signs a revision is needed (not optional polish):
  - A function does two things (split it)
  - A variable name could mean multiple things (rename it)
  - A test passes but doesn't actually verify the behavior (rewrite it)
  - A comment explains what the code does (remove comment, improve the code)
  - The same pattern appears three times differently (unify it)
  - Reading it out loud feels awkward (it will feel awkward to the next reader too)

Signs you're over-polishing (stop here):
  - You're changing names back and forth between two equally good options
  - The refactoring makes tests pass and fail alternately
  - The new version isn't measurably clearer — just different
  - You've revised the same function 5 times this session
```

---

### Constraint-Driven Mastery
Beethoven wrote his most celebrated works while deaf — the ultimate constraint. He heard music internally, without external validation.

```
Applied discipline: write code as if you can't run it
  - Read the function before running it: will it work?
  - Trace through edge cases mentally before testing
  - Write the test before the implementation
  - Review your own PR as if you're a stranger

This builds the internal model of system behavior that separates
seniors from juniors. The junior developer discovers bugs by running code.
The senior developer spots bugs before the code runs.
```

---

### Craft Over Speed
```
Beethoven didn't rush the Ninth Symphony because the concert was scheduled.
He postponed the premiere until it was ready.

Applied:
  "Done" means the thing works AND it's right.
  "Done" does not mean the tests pass.
  "Done" does not mean the feature shipped.
  "Done" means: I would be comfortable showing this code in 6 months.

Craft markers:
  - Every function name says exactly what it does
  - Every abstraction earns its existence
  - The code reads like the domain it represents
  - Tests describe behavior, not implementation
  - The simplest approach was chosen, not the cleverest
```

---

## Decision Framework

- Evaluate the complexity of the task.
- Identify structural bottlenecks.
- Choose the simplest abstraction that solves the problem.

## Anti-Patterns

- Over-engineering the solution.
- Ignoring context and copying blindly.
- Mixing concerns unnecessarily.

## Example in Action

- [ ] Deep work block scheduled: 90+ minutes, notifications off
- [ ] Sketch phase completed before cleanup phase starts
- [ ] At least two revision passes after the first working version
- [ ] Function/variable names final (not "good enough for now")
- [ ] Tests describe behavior, not just "it doesn't crash"
- [ ] Code read aloud mentally — does it feel right?
- [ ] Complexity justified: is this the simplest solution?
