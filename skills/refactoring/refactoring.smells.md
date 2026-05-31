<!-- @keywords: code smells, technical debt, long method, duplicate code, dead code, coupling, cohesion -->

# Refactoring — Recognizing Code Smells

## Code Smell Catalog

A code smell is a surface indication that something deeper may be wrong. Not every smell requires immediate refactoring — weigh the cost of change against the benefit. But smells compound: a slightly smelly codebase becomes unintelligible over time.

---

## Long Method

**Symptom:** A function that takes more than 20-30 lines, or requires scrolling to read.

**Why it hurts:** Hard to name, test, or reason about. Usually has multiple responsibilities.

**Fix:** Extract methods. If you find yourself writing a comment before a block of code, that block is a function waiting to be named.

```typescript
// ✗ 60-line method doing 5 different things
async function handleCheckout(req, res) {
  // validate cart
  // calculate totals
  // apply coupons
  // charge payment
  // send confirmation
  // update inventory
}

// ✓ Orchestrator calling extracted, named steps
async function handleCheckout(req, res) {
  const cart = await validateAndLoadCart(req.body.cartId, req.user);
  const pricing = await calculateOrderPricing(cart, req.body.couponCode);
  const payment = await chargePayment(req.user, pricing.total, req.body.paymentMethodId);
  const order = await finalizeOrder(cart, pricing, payment);
  await Promise.all([
    sendOrderConfirmation(req.user, order),
    decrementInventory(order.items),
  ]);
  res.status(201).json({ orderId: order.id });
}
```

---

## Duplicate Code (DRY Violations)

**Symptom:** The same logic appears in two or more places.

**Why it hurts:** When the logic changes, you change it in one place and forget the others. Bugs diverge between copies.

**Fix:** Extract to a shared function, class, or hook. But: only extract when the duplication is truly identical in concept, not just similar in form. Three similar-looking things may represent different concepts.

```typescript
// ✗ Same pagination logic in 3 controllers
// users.controller.ts
const page = parseInt(req.query.page as string) || 1;
const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
const offset = (page - 1) * limit;

// products.controller.ts
const page = parseInt(req.query.page as string) || 1;
const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
const offset = (page - 1) * limit;

// ✓ Extracted utility
function parsePagination(query: ParsedQs): Pagination {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20));
  return { page, limit, offset: (page - 1) * limit };
}
```

---

## God Class / God Object

**Symptom:** One class knows too much and does too much. Everything depends on it.

**Why it hurts:** Changing it breaks unrelated features. Impossible to test in isolation.

**Fix:** Identify responsibilities. Each distinct responsibility becomes a new class.

```typescript
// ✗ UserManager does auth, profile, billing, notifications
class UserManager {
  login() { ... }
  register() { ... }
  updateProfile() { ... }
  uploadAvatar() { ... }
  subscribeToPlan() { ... }
  cancelSubscription() { ... }
  sendWelcomeEmail() { ... }
  sendPasswordReset() { ... }
  blockUser() { ... }
  deleteUser() { ... }
}

// ✓ Split by responsibility
class AuthService { login(); register(); }
class UserProfileService { updateProfile(); uploadAvatar(); }
class BillingService { subscribeToPlan(); cancelSubscription(); }
class NotificationService { sendWelcomeEmail(); sendPasswordReset(); }
class UserAdminService { blockUser(); deleteUser(); }
```

---

## Primitive Obsession

**Symptom:** Using primitives (string, number) to represent domain concepts.

**Why it hurts:** Validation is scattered, no self-documentation, easy to mix up arguments.

```typescript
// ✗ Email and password are just strings everywhere
function login(email: string, password: string): Promise<User> { ... }
function sendEmail(from: string, to: string, subject: string): Promise<void> { ... }

// Easy to accidentally swap arguments:
sendEmail(user.name, user.email, ...); // wrong but TypeScript allows it

// ✓ Value objects — self-validating, type-safe
class Email {
  private readonly value: string;
  constructor(raw: string) {
    if (!Email.isValid(raw)) throw new ValidationError('Invalid email format');
    this.value = raw.toLowerCase().trim();
  }
  static isValid(raw: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw); }
  toString(): string { return this.value; }
}

class Money {
  constructor(readonly amountCents: number, readonly currency: string) {
    if (amountCents < 0) throw new ValidationError('Amount cannot be negative');
  }
  add(other: Money): Money {
    if (other.currency !== this.currency) throw new Error('Currency mismatch');
    return new Money(this.amountCents + other.amountCents, this.currency);
  }
}
```

---

## Feature Envy

**Symptom:** A method uses more data and methods from another class than its own.

**Why it hurts:** Indicates the method is in the wrong class.

```typescript
// ✗ OrderService is obsessed with Coupon's internals
class OrderService {
  applyDiscount(order: Order, coupon: Coupon): number {
    if (!coupon.isActive) return 0;
    if (coupon.expiresAt < new Date()) return 0;
    if (coupon.usageCount >= coupon.maxUsage) return 0;
    if (coupon.type === 'percentage') return order.subtotal * (coupon.value / 100);
    return Math.min(coupon.value, order.subtotal);
  }
}

// ✓ Logic moved to the class that owns the data
class Coupon {
  isApplicable(): boolean {
    return this.isActive && this.expiresAt >= new Date() && this.usageCount < this.maxUsage;
  }
  calculateDiscount(subtotal: number): number {
    if (!this.isApplicable()) return 0;
    return this.type === 'percentage' ? subtotal * (this.value / 100) : Math.min(this.value, subtotal);
  }
}
```

---

## Data Clumps

**Symptom:** The same group of parameters appears together repeatedly.

**Fix:** Group into a parameter object or class.

```typescript
// ✗ Latitude/longitude always travel together
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number { ... }
function isWithinRadius(lat: number, lng: number, centerLat: number, centerLng: number, radius: number): boolean { ... }

// ✓ Coordinate object
class Coordinate {
  constructor(readonly lat: number, readonly lng: number) {}
  distanceTo(other: Coordinate): number { ... }
  isWithinRadius(center: Coordinate, radius: number): boolean { ... }
}
```

---

## Dead Code

**Symptom:** Code that is never executed: commented-out code, unreachable branches, unused exports.

**Fix:** Delete it. Version control remembers it — you don't need it in the source.

```typescript
// ✗ Commented-out code (what was it for? is it needed?)
// const legacyUser = await fetchLegacyUser(id);

// ✗ Unreachable code
function getDiscount(type: 'percentage' | 'flat'): number {
  if (type === 'percentage') return 10;
  if (type === 'flat') return 5;
  return 0; // unreachable — type is exhausted
}

// ✗ Unused exports (check with TypeScript's noUnusedLocals)
export function formatDate() { ... } // never imported anywhere
```

---

## Smell Priority Guide

```
Fix immediately (high risk):
  ✗ Duplicate security/financial logic (divergence causes bugs)
  ✗ God class with > 500 lines (changes break everything)
  ✗ Dead code in security-sensitive paths

Fix next sprint:
  ✗ Long methods > 50 lines
  ✗ Duplicate business logic
  ✗ Primitive obsession in domain models

Fix when touching the area:
  ✗ Minor duplication
  ✗ Poor naming in rarely-changed code
  ✗ Dead code in stable areas
```
