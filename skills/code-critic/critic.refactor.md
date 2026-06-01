<!-- @keywords: refactoring, strangler fig pattern, step-by-step refactor, composable functions, rewrite vs refactor, naming, test-safe refactor, incremental improvement, function decomposition -->

# Code Critic — Continuous Surgery, Not Big-Bang Rewrites

## Core Philosophy

Big-bang rewrites fail 90% of the time. The code you're rewriting is full of battle-tested edge case handling you don't know about yet. The new system will re-discover all of those edge cases at 2am in production.

The alternative: the strangler fig. Wrap the old system, implement new behavior alongside it, redirect traffic incrementally, remove the old code when the new is proven. At every point, the system works.

---

**1. Naming is the first refactor.** A badly named variable or function is a tax on every reader forever. Rename before restructuring. Better names reveal the actual structure needed.

**2. Extract functions at the level of their abstraction.** A function that manipulates strings and makes network requests is operating at two abstraction levels. Split them. Each function should do things at one level of abstraction only.

**3. Tests before touching behavior.** Write tests that document what the code currently does (including the bugs) before changing it. These tests are your safety net. Without them, refactoring is just gambling.

**4. One refactor per commit.** Don't rename, restructure, and fix a bug in the same commit. When something breaks, you can't tell what caused it. Each commit should do one type of change.

**5. When to rewrite vs refactor:**

| Rewrite | Refactor |
|---|---|
| Requirements have fundamentally changed | Code works, structure is poor |
| No tests exist and adding them is harder than rewriting | Tests exist or can be added |
| Technology choice is wrong (wrong language, wrong paradigm) | Same technology, same patterns |
| The code is shorter to write from scratch than to understand | Time cost of understanding is the bottleneck |

---

## When to Activate

- A function is over 50 lines and needs to be touched for a new feature
- A module is being extended for the third time and it's becoming unmanageable
- Tests are brittle because the code structure makes isolation impossible
- A bug was fixed incorrectly because the code was too tangled to understand

---

## Principles

## Decision Framework

```
Can you describe what the function does in one sentence?
├── YES → name reflects that? if not, rename first
└── NO  → the function does too many things — extract by responsibility

Are there more than 3 levels of indentation?
├── YES → early return pattern to flatten logic
└── NO  → is there duplicated logic that belongs in a shared function?

Does the function have more than 4 parameters?
├── YES → group related params into an options object
└── NO  → are any params booleans that control flow? → extract separate function

Are there comments explaining what the code does (not why)?
├── YES → the code isn't clear enough — extract into named function
└── NO  → the names are already carrying the meaning, good
```

---

## Anti-Patterns

- Refactoring without tests — any breakage is invisible until production
- Renaming and restructuring in one PR — impossible to review
- "Cleaning up while I'm in here" — scope creep kills focus
- Rewriting to the new framework du jour — you'll rewrite again in 18 months
- Refactoring code you don't fully understand — you'll remove important behavior
- Leaving the old code as comments — dead code is noise, delete it

---

## Example in Action

Refactor an 80-line function into composable pieces, step by step:

```ts
// ORIGINAL — 80-line function doing everything
async function processOrder(orderId: string, userId: string, promoCode?: string) {
  // Step 1: Validate
  const user = await db.users.findOne({ id: userId });
  if (!user) throw new Error('User not found');
  if (user.status === 'suspended') throw new Error('Account suspended');
  
  const order = await db.orders.findOne({ id: orderId });
  if (!order) throw new Error('Order not found');
  if (order.userId !== userId) throw new Error('Not your order');
  if (order.status !== 'pending') throw new Error('Order already processed');

  // Step 2: Apply promo
  let discount = 0;
  if (promoCode) {
    const promo = await db.promos.findOne({ code: promoCode });
    if (!promo) throw new Error('Invalid promo code');
    if (promo.expiresAt < new Date()) throw new Error('Promo expired');
    if (promo.usageCount >= promo.maxUsage) throw new Error('Promo exhausted');
    discount = promo.type === 'percent'
      ? order.total * (promo.value / 100)
      : Math.min(promo.value, order.total);
    await db.promos.update({ id: promo.id }, { usageCount: promo.usageCount + 1 });
  }

  // Step 3: Charge
  const chargeAmount = order.total - discount;
  const charge = await paymentService.charge({
    customerId: user.stripeId,
    amount: chargeAmount,
    currency: 'usd',
    metadata: { orderId, userId, promoCode }
  });
  if (!charge.success) throw new Error(`Payment failed: ${charge.error}`);

  // Step 4: Fulfill
  await db.orders.update({ id: orderId }, { 
    status: 'paid', 
    chargeId: charge.id,
    discount,
    paidAt: new Date()
  });
  await emailService.send({ to: user.email, template: 'order-confirmed', data: { orderId } });
  await inventoryService.reserve(order.items);

  return { orderId, chargeId: charge.id, total: chargeAmount };
}
```

**Step 1 — Rename to reveal structure** (commit: "refactor: rename variables for clarity")

Already clear — move to extraction.

**Step 2 — Extract validation functions** (commit: "refactor: extract order validation")

```ts
async function validateUser(userId: string): Promise<User> {
  const user = await db.users.findOne({ id: userId });
  if (!user) throw new Error('User not found');
  if (user.status === 'suspended') throw new Error('Account suspended');
  return user;
}

async function validateOrder(orderId: string, userId: string): Promise<Order> {
  const order = await db.orders.findOne({ id: orderId });
  if (!order) throw new Error('Order not found');
  if (order.userId !== userId) throw new Error('Not your order');
  if (order.status !== 'pending') throw new Error('Order already processed');
  return order;
}
```

**Step 3 — Extract promo application** (commit: "refactor: extract promo calculation")

```ts
async function applyPromoCode(promoCode: string, orderTotal: number): Promise<number> {
  const promo = await db.promos.findOne({ code: promoCode });
  if (!promo) throw new Error('Invalid promo code');
  if (promo.expiresAt < new Date()) throw new Error('Promo expired');
  if (promo.usageCount >= promo.maxUsage) throw new Error('Promo exhausted');
  
  const discount = promo.type === 'percent'
    ? orderTotal * (promo.value / 100)
    : Math.min(promo.value, orderTotal);
  
  await db.promos.update({ id: promo.id }, { usageCount: promo.usageCount + 1 });
  return discount;
}
```

**Step 4 — Orchestrator is now readable** (commit: "refactor: simplify processOrder orchestration")

```ts
async function processOrder(orderId: string, userId: string, promoCode?: string) {
  const [user, order] = await Promise.all([
    validateUser(userId),
    validateOrder(orderId, userId),
  ]);

  const discount = promoCode ? await applyPromoCode(promoCode, order.total) : 0;
  const charge = await chargeCustomer(user, order, discount);

  await fulfillOrder(order, user, charge, discount);
  return { orderId, chargeId: charge.id, total: order.total - discount };
}
```

Each extracted function is independently testable. The orchestrator reads like a specification.
