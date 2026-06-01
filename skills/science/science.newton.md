<!-- @keywords: science, Newton, laws, patterns, systematic thinking, cause and effect, invariants -->

# Science — Newton Mode: Laws, Invariants, and Systematic Thinking

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to newton.

## Principles

### The Newton Mindset
Newton didn't just discover gravity — he discovered that the same force that makes apples fall also governs the orbits of planets. He looked for the **universal law** that explains many specific observations. Newton Mode: look past the specific incident to the underlying invariant that governs all similar incidents.

---

### Discovering the Laws of Your System
Every software system has laws — invariants that must always hold. Finding and naming them makes them enforceable.

```
Example: Order Processing System Laws

Newton's Law 1: Conservation of Inventory
  "Total inventory never increases without a purchase order,
   and never decreases without an order confirmation or write-off."

  Applied: if inventory goes down, there MUST be a corresponding order event.
  If there isn't one, the system has a bug (entropy entered the system).
  Test: `sum(inventory_changes) = sum(order_quantities)` — always.

Newton's Law 2: Monotonic Order Status
  "An order's status only moves forward: pending → processing → shipped → delivered.
   It never moves backward except through explicit cancellation."

  Applied: if order.status = 'delivered' becomes 'pending' without cancellation,
  something is wrong. Audit log shows how.

Newton's Law 3: Price Immutability After Confirmation
  "Once an order is confirmed, its prices are locked.
   Product price changes do not affect confirmed orders."

  Applied: order_items stores a price_at_time_of_order column.
  Join to products.price is wrong for historical orders.
```

---

### Inertia and Technical Debt
Newton's First Law: an object in motion stays in motion. A system in its current state tends to stay in its current state unless acted upon.

```
Technical inertia:
  A codebase using jQuery will keep using jQuery
  until the activation energy of migration is applied.
  
  A deployment process that requires manual steps will keep requiring manual steps
  until someone bears the cost of automating it.

  A team that doesn't write tests will keep not writing tests
  until the pain of bugs exceeds the comfort of skipping tests.

Newton's Law applied:
  1. Identify what has inertia (current patterns, habits, tools)
  2. Calculate the activation energy required to change
  3. Decide if the force applied (team effort) exceeds the activation energy
  4. Apply consistently — a brief force doesn't overcome inertia, sustained force does

Practical: automation pays for itself through repetition.
  A 2-hour migration script that runs once isn't worth it.
  A 2-hour CI/CD improvement that runs 100 times is 200 hours saved.
```

---

### The Inverse Square Law of Communication
Newton's gravity weakens with the square of distance. Team communication degrades similarly.

```
In-person / synchronous:    100% information transfer
Slack message:              ~60% (missing tone, context, face)
Asynchronous text doc:      ~40% (missing conversation, Q&A)
Documentation without context: ~20%

Applied to code reviews:
  The longer a PR sits, the less context the author retains.
  A PR reviewed in 2 hours costs the author 10 minutes to re-contextualize.
  A PR reviewed in 5 days costs the author 2 hours.

Applied to technical debt documentation:
  A decision documented the day it's made: 90% of context captured.
  A decision documented 6 months later: 40% of context remains.
  A decision documented 2 years later: "I don't remember why we did this."

Corollary: document now, before the information entropy sets in.
```

---

### Gravity — What Your System Pulls Toward
Every system has gravity — the state it naturally collapses toward if no external force is applied.

```
Without discipline, codebases gravitate toward:
  → God objects (one class that knows everything)
  → Scattered business logic (a little in controllers, a little in models, a little in utils)
  → Undocumented dependencies (who calls this function? nobody knows)
  → Manual deployment steps ("just run these 7 commands")

Newton would ask: "What is the natural resting state of this system?"
Then design structures that make the right state the gravitational attractor:

  → Linting rules that prevent god objects (max file length, max function length)
  → Architecture tests that prevent logic in wrong layers
  → Required ADR for new dependencies
  → CI/CD that makes manual deployment impossible
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

Newton's Third Law: every action has an equal and opposite reaction. In systems: every operation has an equal and opposite undo.

```typescript
// Design reversibility into every state-changing operation

interface Operation<T> {
  execute(): Promise<T>;
  undo(): Promise<void>;
}

class ReserveInventoryOperation implements Operation<Reservation> {
  async execute(): Promise<Reservation> {
    return inventoryRepo.reserve(this.productId, this.qty);
  }
  async undo(): Promise<void> {
    await inventoryRepo.release(this.productId, this.qty);
  }
}

class ChargePaymentOperation implements Operation<Payment> {
  async execute(): Promise<Payment> {
    return paymentService.charge(this.amount, this.method);
  }
  async undo(): Promise<void> {
    await paymentService.refund(this.paymentId);
  }
}

// Saga: if any step fails, undo all previous steps
class CheckoutSaga {
  private completed: Operation<unknown>[] = [];

  async run(operations: Operation<unknown>[]): Promise<void> {
    for (const operation of operations) {
      try {
        await operation.execute();
        this.completed.push(operation);
      } catch (err) {
        // Undo in reverse order
        for (const done of this.completed.reverse()) {
          await done.undo().catch(undoErr => logger.error(undoErr));
        }
        throw err;
      }
    }
  }
}
```

---

- [ ] System invariants identified and named (the laws that must always hold)
- [ ] Every state-changing operation has an undo (reversibility designed in)
- [ ] Technical inertia acknowledged: what will resist change and what force is needed?
- [ ] Natural gravitational state of the system identified (where does it drift without discipline?)
- [ ] Enforcement mechanisms in place (linting, tests, CI) so gravity doesn't win
- [ ] Laws documented so new team members understand the invariants
