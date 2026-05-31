<!-- @keywords: code review, standards, conventions, consistency, maintainability, technical debt -->

# Code Review — Standards and Consistency

## Why Standards Matter in Review

Inconsistency is a form of technical debt. When the same problem is solved three different ways in three files, the next developer has to understand all three. Standards reduce cognitive overhead — you know what to expect.

---

## Naming Consistency Checks

```typescript
// Check: does naming follow established patterns in the codebase?

// If the codebase uses:
getUserById → getOrderById (consistent) ✓
getUserById → fetchOrder (inconsistent — why different verb?) ✗

// If the codebase uses camelCase for files:
user-service.ts → order-service.ts (consistent) ✓
user-service.ts → OrderService.ts (inconsistent) ✗

// If the codebase uses past-tense events:
UserCreated → OrderCreated (consistent) ✓
UserCreated → order.create (inconsistent) ✗

// Review question: "Is this consistent with how we name similar things?"
// Not "Is this my preferred naming?" — that's preference, not standard.
```

---

## Error Handling Consistency

```typescript
// Check: are errors thrown and handled consistently?

// If the codebase throws domain errors:
throw new NotFoundError('User');  // established pattern ✓
throw new Error('User not found'); // inconsistent ✗
return null; // silent failure, inconsistent ✗

// If the codebase uses Result types:
return { ok: false, error: 'User not found' }; // consistent ✓
throw new Error('...'); // inconsistent with established pattern ✗

// Check: are errors propagated or silently swallowed?
try {
  await sendEmail(user.email);
} catch (e) {
  // ✗ silent swallow — caller doesn't know email failed
}

try {
  await sendEmail(user.email);
} catch (e) {
  logger.error(e, 'Email failed'); // ✓ at minimum: log it
  // or: throw/re-throw if caller needs to know
}
```

---

## Abstraction Level Consistency

```typescript
// Check: is the code at the right altitude?

// Inconsistent altitude: mixing high-level orchestration with low-level SQL
async function processCheckout(cartId: string) {
  const cart = await cartService.getById(cartId);        // high-level ✓
  const discount = await couponService.calculate(cart);   // high-level ✓

  // Suddenly: raw SQL in the middle of business logic
  const order = await db.query(                          // ✗ wrong altitude
    'INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING *',
    [cart.userId, cart.total - discount]
  );

  await notificationService.sendConfirmation(order);     // high-level ✓
}

// Consistent: all calls at same level of abstraction
async function processCheckout(cartId: string) {
  const cart = await cartService.getById(cartId);
  const discount = await couponService.calculate(cart);
  const order = await orderService.create(cart, discount); // ✓ same level
  await notificationService.sendConfirmation(order);
}
```

---

## Test Consistency

```typescript
// Check: do tests follow the same structure as existing tests?

// If codebase uses describe/it with AAA:
describe('UserService.createUser', () => {
  it('sends welcome email after registration', async () => {
    // Arrange
    const dto = buildCreateUserDto();
    userRepo.findByEmail.mockResolvedValue(null);

    // Act
    await userService.createUser(dto);

    // Assert
    expect(emailService.sendWelcome).toHaveBeenCalledWith(dto.email);
  });
});

// If new test uses different style:
test('user service creates user', () => {          // ✗ inconsistent structure
  const result = userService.createUser({ ... });  // ✗ no AAA separation
  expect(result).toBeDefined();                    // ✗ weak assertion
});
```

---

## API Response Consistency

```typescript
// Check: do all endpoints follow the same response structure?

// Established pattern in codebase:
// GET /users/:id → { data: User }
// POST /users   → { data: User } + Location header
// DELETE /users/:id → 204 No Content

// New endpoint should follow:
router.get('/products/:id', async (req, res) => {
  const product = await productService.getById(req.params.id);
  res.json({ data: product }); // ✓ follows established pattern
});

// Inconsistent response:
router.get('/categories', async (req, res) => {
  const categories = await categoryService.getAll();
  res.json(categories); // ✗ bare array instead of { data: [...] }
});
```

---

## Dependency Import Consistency

```typescript
// Check: are imports organized consistently?

// Established order: external → internal → types
import express from 'express';           // external ✓
import { db } from '@/database';         // internal ✓
import type { User } from '@/types';     // types ✓

// Inconsistent:
import type { User } from '@/types';     // types first ✗
import express from 'express';
import { db } from '@/database';

// Check: are path aliases used consistently?
import { UserService } from '@/services/user.service';  // alias ✓
import { UserService } from '../../services/user.service'; // relative ✗ (if alias exists)
```

---

## Documentation Consistency

```typescript
// Check: does the PR documentation level match the rest of the codebase?

// If complex functions have JSDoc in the codebase:
/**
 * Calculates order total with coupon and tax.
 * Tax is calculated on post-discount amount.
 */
function calculateOrderTotal(items: Item[], coupon?: Coupon, taxRate = 0.1): number { ... }

// New complex function without doc:
function applyTieredDiscount(subtotal: number, tier: UserTier, orderHistory: Order[]): number {
  // ✗ no explanation of tiering logic — complex enough to warrant a note
}

// Exception: obvious functions don't need docs
function formatDate(date: Date): string { ... } // ✓ self-explanatory, no doc needed
```

---

## Standards Review Checklist

- [ ] Naming follows established codebase conventions
- [ ] Error handling matches the established pattern (throw domain errors / Result type)
- [ ] Functions operate at consistent abstraction levels (no SQL in business layer)
- [ ] API responses follow the established response shape
- [ ] Tests follow established structure (describe/it, AAA)
- [ ] Import style matches codebase (path aliases, ordering)
- [ ] Complex logic documented if documentation exists elsewhere in codebase
- [ ] New patterns introduced only when existing pattern is demonstrably insufficient
