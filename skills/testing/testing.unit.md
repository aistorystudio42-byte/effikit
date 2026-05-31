<!-- @keywords: unit testing, Jest, vitest, mocking, test isolation, assertions, TDD -->

# Testing — Unit Tests

## What Makes a Good Unit Test

A unit test verifies that a **single unit of behavior** works correctly in isolation. It runs fast (< 50ms), has no external dependencies (no DB, no HTTP, no file system), and fails for exactly one reason.

```
Good unit test properties:
  Fast       → milliseconds, not seconds
  Isolated   → no shared state between tests
  Repeatable → same result every run
  Self-validating → pass or fail, no manual inspection
  Targeted   → tests one thing, fails for one reason
```

---

## What to Unit Test

```
Test:
  ✓ Business logic functions (calculations, transformations, validations)
  ✓ Utility functions with non-trivial logic
  ✓ State transitions (reducers, state machines)
  ✓ Error handling paths
  ✓ Edge cases (empty input, null, max values, boundary conditions)
  ✓ Pure functions — they're easiest to test and most valuable

Don't unit test:
  ✗ Simple getters/setters with no logic
  ✗ Third-party libraries (they have their own tests)
  ✗ Implementation details (private methods, internal state)
  ✗ Things that are better covered by integration tests
```

---

## Test Structure: Arrange-Act-Assert

```typescript
describe('OrderPricingService', () => {
  describe('calculateTotal', () => {
    it('applies percentage discount to subtotal', () => {
      // Arrange: set up the system under test
      const service = new OrderPricingService();
      const items = [
        { price: 10_00, quantity: 2 },  // 20.00
        { price: 5_00, quantity: 1 },   // 5.00
      ];                                // subtotal: 25.00
      const coupon = { type: 'percentage', value: 20 }; // 20% off

      // Act: execute the behavior being tested
      const total = service.calculateTotal(items, coupon);

      // Assert: verify the outcome
      expect(total).toBe(20_00); // 25.00 - 20% = 20.00
    });

    it('does not allow total to go below zero with flat discount', () => {
      const service = new OrderPricingService();
      const items = [{ price: 5_00, quantity: 1 }]; // 5.00
      const coupon = { type: 'flat', value: 10_00 };  // 10.00 off

      const total = service.calculateTotal(items, coupon);

      expect(total).toBe(0); // floor at 0, not negative
    });
  });
});
```

---

## Mocking

Mock external dependencies — not the code you're testing.

```typescript
// The system under test depends on UserRepository and EmailService
// We don't want real DB calls or real emails in unit tests

describe('UserService.createUser', () => {
  let userService: UserService;
  let userRepo: jest.Mocked<UserRepository>;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    // Fresh mocks for each test — no shared state
    userRepo = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    } as jest.Mocked<UserRepository>;

    emailService = {
      sendWelcome: jest.fn(),
    } as jest.Mocked<EmailService>;

    userService = new UserService(userRepo, emailService);
  });

  it('creates user and sends welcome email', async () => {
    userRepo.findByEmail.mockResolvedValue(null);      // email not taken
    userRepo.create.mockResolvedValue({ id: '123', email: 'alice@example.com', name: 'Alice' });

    await userService.createUser({ email: 'alice@example.com', name: 'Alice', password: 'pass123' });

    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'alice@example.com', name: 'Alice' })
    );
    expect(emailService.sendWelcome).toHaveBeenCalledWith('alice@example.com');
  });

  it('throws ConflictError when email already registered', async () => {
    userRepo.findByEmail.mockResolvedValue({ id: '456', email: 'alice@example.com' } as User);

    await expect(
      userService.createUser({ email: 'alice@example.com', name: 'Alice', password: 'pass123' })
    ).rejects.toThrow(ConflictError);

    expect(userRepo.create).not.toHaveBeenCalled();
    expect(emailService.sendWelcome).not.toHaveBeenCalled();
  });
});
```

---

## Testing Edge Cases

```typescript
describe('parseAmount', () => {
  // Happy path
  it('parses valid dollar amounts', () => {
    expect(parseAmount('$42.50')).toBe(42_50);
    expect(parseAmount('$0.01')).toBe(1);
    expect(parseAmount('$1,000.00')).toBe(1_000_00);
  });

  // Boundary conditions
  it('handles zero', () => expect(parseAmount('$0.00')).toBe(0));
  it('handles maximum safe integer range', () => {
    expect(parseAmount('$999,999.99')).toBe(99_999_999);
  });

  // Invalid input
  it('throws on empty string', () => {
    expect(() => parseAmount('')).toThrow('Invalid amount format');
  });
  it('throws on non-string', () => {
    expect(() => parseAmount(null as any)).toThrow();
  });
  it('throws on negative amount', () => {
    expect(() => parseAmount('-$5.00')).toThrow('Amount cannot be negative');
  });

  // Locale/encoding edge cases
  it('handles different decimal separators', () => {
    expect(parseAmount('42,50', { locale: 'de-DE' })).toBe(42_50);
  });
});
```

---

## Testing Reducers and State Machines

Reducers are pure functions — ideal for unit testing.

```typescript
describe('cartReducer', () => {
  it('adds new item to empty cart', () => {
    const state = { items: [] };
    const action = { type: 'ADD_ITEM' as const, payload: { id: 'p1', name: 'Widget', price: 10_00 } };

    const next = cartReducer(state, action);

    expect(next.items).toHaveLength(1);
    expect(next.items[0]).toMatchObject({ id: 'p1', qty: 1 });
  });

  it('increments quantity when adding existing item', () => {
    const state = { items: [{ id: 'p1', name: 'Widget', price: 10_00, qty: 2 }] };
    const action = { type: 'ADD_ITEM' as const, payload: { id: 'p1', name: 'Widget', price: 10_00 } };

    const next = cartReducer(state, action);

    expect(next.items).toHaveLength(1);   // not duplicated
    expect(next.items[0].qty).toBe(3);    // incremented
  });

  it('does not mutate original state', () => {
    const state = { items: [{ id: 'p1', qty: 1 }] };
    const original = JSON.stringify(state);

    cartReducer(state, { type: 'CLEAR' });

    expect(JSON.stringify(state)).toBe(original); // immutable
  });
});
```

---

## Test Quality Guidelines

```typescript
// Test names describe behavior, not implementation
// Wrong:
it('calls findByEmail and then create');
// Right:
it('creates user when email is not already registered');

// One assertion per test (where practical) — clearer failure messages
// Wrong:
it('processes order correctly', () => {
  expect(order.total).toBe(100);
  expect(order.status).toBe('confirmed');
  expect(emailSent).toBe(true);
});
// Right: split into three tests with specific names

// Don't test implementation details
// Wrong: testing that a specific private method was called
// Right: testing the observable outcome (return value, state change, side effect)

// Avoid logic in tests — no if/loops in test body
// If you need a loop, use test.each
test.each([
  [10_00, 0.1, 9_00],   // [price, discount, expected]
  [20_00, 0.5, 10_00],
  [5_00,  0.0, 5_00],
])('applies %.0f% discount: $%d → $%d', (price, discount, expected) => {
  expect(applyDiscount(price, discount)).toBe(expected);
});
```
