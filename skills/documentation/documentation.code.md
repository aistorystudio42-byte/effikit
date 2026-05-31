<!-- @keywords: documentation, code comments, JSDoc, inline comments, self-documenting code -->

# Documentation — Code Comments and Inline Documentation

## The Comment Philosophy

The best code is self-documenting. Names, structure, and types communicate intent. Comments add value only when they explain something the code cannot: the **why**, the **tradeoff**, the **constraint**, or the **non-obvious invariant**.

```
Write a comment when:
  ✓ The WHY is non-obvious (why this algorithm? why this constraint?)
  ✓ A workaround was needed for a specific bug or external limitation
  ✓ Business rules that would surprise a future developer
  ✓ Performance-critical decisions that look "wrong" but are intentional
  ✓ Public APIs (functions, classes, types)

Don't write a comment when:
  ✗ It restates what the code already says
  ✗ It describes WHAT the code does (good names do this)
  ✗ It references a ticket number or PR (put that in git commit message)
  ✗ It credits the author (git blame exists)
```

---

## Comments That Add Value

```typescript
// ✓ WHY: non-obvious business rule
// Coupons can only be applied to the subtotal, not to shipping.
// This is a contractual requirement with our shipping provider.
const discountableAmount = order.subtotal;

// ✓ WORKAROUND: external library bug
// bcrypt.compare has a bug where it returns true for empty strings
// against any hash when compiled with certain OpenSSL versions.
// See: https://github.com/kelektiv/node.bcrypt.js/issues/797
if (!plaintext) return false;
return bcrypt.compare(plaintext, hash);

// ✓ INVARIANT: constraint that must hold
// This function is called from a transaction context.
// Do NOT start a new transaction here — it will deadlock.
async function updateInventoryInTransaction(db: TransactionClient, ...) { ... }

// ✓ PERFORMANCE: intentional "wrong-looking" code
// We sort here even though the caller sometimes re-sorts.
// Pre-sorting reduces the average work in the diff algorithm by ~40%.
// Benchmarked in PR #482 — remove only after re-benchmarking.
items.sort(compareById);
```

---

## Comments That Add Noise

```typescript
// ✗ Restates what the code says
// Increment the counter
counter++;

// ✗ Explains an obvious operation
// Get the user by ID
const user = await getUserById(id);

// ✗ References tickets (belongs in commit message, not source)
// TODO(JIRA-1234): fix this
// Added for issue #567

// ✗ Commented-out code
// const legacyUser = await fetchLegacyUser(id); // old approach
// (just delete it — git history remembers)

// ✗ Section dividers that could be functions
// ========== VALIDATION ==========
// ... validation code ...
// ========== PROCESSING ==========
// (extract these sections into named functions)
```

---

## JSDoc for Public APIs

Public functions, classes, and types warrant structured documentation.

```typescript
/**
 * Applies a coupon discount to an order subtotal.
 *
 * Percentage discounts are applied to the subtotal before tax.
 * Flat discounts are capped at the subtotal amount (cannot go negative).
 *
 * @param subtotalCents - Order subtotal in cents before discount
 * @param coupon - Coupon to apply. Pass null for no discount.
 * @returns Discount amount in cents (0 if no valid coupon)
 *
 * @example
 * ```ts
 * applyCouponDiscount(10000, { type: 'percentage', value: 20 }) // 2000
 * applyCouponDiscount(10000, { type: 'flat', value: 15000 })    // 10000 (capped)
 * applyCouponDiscount(10000, null)                               // 0
 * ```
 */
function applyCouponDiscount(subtotalCents: number, coupon: Coupon | null): number {
  if (!coupon) return 0;
  if (coupon.type === 'percentage') return Math.round(subtotalCents * (coupon.value / 100));
  return Math.min(coupon.value, subtotalCents); // flat discount capped at subtotal
}
```

---

## Type Documentation

```typescript
/**
 * Represents a paginated collection of items.
 * Used as the standard response shape for all list endpoints.
 */
interface PaginatedResponse<T> {
  /** The items on the current page */
  data: T[];
  meta: {
    /** Total number of items across all pages */
    total: number;
    /** Current page number, 1-indexed */
    page: number;
    /** Maximum items per page */
    limit: number;
    /** Whether a next page exists */
    hasNext: boolean;
  };
}

/**
 * Possible states for an order throughout its lifecycle.
 *
 * State transitions:
 * pending → processing → completed
 * pending → cancelled
 * processing → cancelled (only before shipment)
 */
type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';
```

---

## TODO Comments — How to Use Them Right

```typescript
// ✗ Vague TODOs that never get done
// TODO: fix this later
// TODO: improve performance

// ✓ Actionable TODOs with context
// TODO: Remove this fallback after all users have migrated to v2 profiles.
//       Safe to remove after 2024-06-01 (90-day migration window closes).
const profile = user.profileV2 ?? legacyProfileAdapter(user.profile);

// ✓ FIXME for known bugs with explanation
// FIXME: Race condition when two requests update the same user concurrently.
// Low probability, tracked in issue #234. Fix requires optimistic locking.
await userRepo.update(id, updates);

// ✓ HACK for temporary workarounds
// HACK: Stripe webhook delivery is unreliable in test mode.
// This retry loop is only active in NODE_ENV=test.
// Remove when Stripe fixes their test webhook reliability (reported to them 2024-02).
if (process.env.NODE_ENV === 'test') { ... }
```

---

## Documentation Checklist

- [ ] All public functions/classes have JSDoc describing behavior, params, and return value
- [ ] Non-obvious business logic has a "why" comment
- [ ] Workarounds reference the issue or external bug they work around
- [ ] No comments that restate what the code already says
- [ ] No commented-out code left in the codebase
- [ ] TODOs are actionable and have a timeline or issue reference
- [ ] Type definitions document state machine transitions where applicable
