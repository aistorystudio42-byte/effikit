<!-- @keywords: science, Tesla, visualization, mental simulation, prototyping, systems, innovation -->

# Science — Tesla Mode: Mental Simulation and Visualization

## The Tesla Mindset

Nikola Tesla claimed to design entire machines in his mind with such precision that he could run them mentally, identify wear on components after years of imagined operation, and then build them physically — often without any modifications. He simulated the system in his head before a single bolt was turned.

Tesla Mode: design and simulate a system mentally before building it. Identify failures before they exist.

---

## Mental Simulation Protocol

```
Step 1: Visualize the happy path in full detail
  Trace a request from browser to database and back.
  Name every component it touches.
  What does each component receive? What does it return?

Step 2: Introduce the first failure
  What if the database connection fails at step 3?
  What does the user see?
  What state is the system in?
  Is that state consistent?

Step 3: Introduce concurrent users
  Two users do the same operation simultaneously.
  Is there a shared resource that both modify?
  Who wins? Is the loser notified?

Step 4: Fast-forward time
  What happens after 6 months of use?
  What table has grown 10x? Is there still an index that covers the query?
  What log file has grown without rotation?
  What API key has been rotated on other services but not updated here?

Step 5: Find the unexpected interaction
  What happens if feature A and feature B are used together?
  Has anyone designed for that combination?
```

---

## Applied: Simulating a New Feature Before Building

```
Feature: "Allow users to apply multiple coupons to one order"

Tesla simulation:

Scene 1: Two coupons, both valid
  User applies SAVE10 (10% off) then FLAT5 ($5 off).
  
  Question: Which applies first? Order matters.
  Simulation: 
    If SAVE10 first: $100 → $90 → $85
    If FLAT5 first:  $100 → $95 → $85.50
  
  Discovery: The calculation order produces different results.
  We need to define: percentage discounts apply before flat discounts.
  (This is a business rule that doesn't exist yet — found before coding)

Scene 2: Two percentage coupons
  User applies SAVE10 (10%) then SAVE20 (20%).
  
  Simulation:
    Stacked: $100 → $90 → $72
    Combined: $100 → $70
    Max-only: $100 → $80
  
  Discovery: Three different interpretations. Which is intended?
  (Business definition needed before engineering starts)

Scene 3: Coupon exceeds order total
  Single item: $5. Coupon: $20 flat.
  
  Simulation:
    Subtotal becomes -$15. System charges -$15?
    Or: order is free, but no refund for the remaining $15?
  
  Discovery: Need a floor at $0. Document this edge case.

Scene 4: Two coupons, one expires between "apply" and "checkout"
  User applies both at 11:58 PM. Coupon expires at midnight.
  User confirms checkout at 12:01 AM.
  
  Discovery: Do we validate coupons at apply-time or checkout-time?
  This is a security consideration — not just UX.

Tesla simulation found 4 business rule gaps before a single line was written.
```

---

## Failure Mode Visualization

```typescript
// Tesla exercise: for every external dependency, simulate its failure

// Dependency: Stripe API
// Simulation: Stripe returns 503 at the critical moment

// Without simulation: no timeout configured, request hangs for 30 seconds,
// user's browser times out, order state is ambiguous (charged? not charged?)

// With simulation:
const chargeCustomer = async (amount: number, paymentMethodId: string) => {
  try {
    return await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
    });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeConnectionError) {
      // Stripe unreachable — don't double-charge on retry
      throw new PaymentTemporarilyUnavailableError();
    }
    if (error instanceof Stripe.errors.StripeCardError) {
      throw new PaymentDeclinedError(error.message);
    }
    // Unknown error — log and escalate
    logger.error(error, 'Unknown Stripe error');
    throw new PaymentProcessingError();
  }
};

// Idempotency key: if the request is retried, don't double-charge
const chargeWithIdempotency = (orderId: string, amount: number) =>
  stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    idempotency_key: `order_${orderId}_charge`, // Stripe deduplicates
  });
```

---

## The Pre-Mortem

Tesla imagined failures before they happened. Apply this to projects.

```
Before launching a feature:
  "Imagine it's 6 months from now. The feature has failed catastrophically.
   What happened?"

  Brainstorm backwards:
  - "The coupon system was exploited to get unlimited discounts"
    → Need: per-user coupon usage limits, server-side validation
  
  - "Performance degraded as the coupon table grew to 10M rows"
    → Need: index on (code, active), archive expired coupons
  
  - "Two users applied the same single-use coupon simultaneously"
    → Need: database-level unique constraint + pessimistic lock on apply

  Each imagined failure becomes a concrete design requirement.
  The pre-mortem converts future disasters into present-day checklists.
```

---

## Tesla Checklist

- [ ] Happy path mentally simulated end-to-end (every component named)
- [ ] Failure scenarios simulated (network failure, DB failure, 3rd-party timeout)
- [ ] Concurrent access simulated (two users, same resource, simultaneously)
- [ ] Time-forward simulation done (what degrades after 6 months / 10x data?)
- [ ] Feature interactions considered (A + B used together — is it safe?)
- [ ] Pre-mortem completed: "how would this fail catastrophically?"
- [ ] Each pre-mortem failure converted into a concrete design requirement
