<!-- @keywords: refactoring, clean code, extract method, decomposition, abstraction, code smells -->

# Refactoring — Patterns and Techniques

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to patterns.

## Principles

### Refactoring Discipline
Refactoring is changing code structure without changing observable behavior. The moment you add a feature while refactoring, you've done two things at once — and now it's hard to tell which change broke something.

**Rule: Always have tests before refactoring.** If tests don't exist, write them first. Refactor under green tests only.

---

### Extract Function / Method
The most common and valuable refactoring. When a piece of code needs a comment to explain it, extract it into a function with a name that replaces the comment.

```typescript
// Before: complex, mixed concerns
async function processOrder(orderId: string) {
  const order = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  
  // Calculate discount
  let discount = 0;
  if (order.couponCode) {
    const coupon = await db.query('SELECT * FROM coupons WHERE code = $1', [order.couponCode]);
    if (coupon && coupon.expiresAt > new Date() && coupon.usageCount < coupon.maxUsage) {
      discount = coupon.type === 'percentage'
        ? order.subtotal * (coupon.value / 100)
        : coupon.value;
    }
  }
  
  // Send confirmation
  const user = await db.query('SELECT * FROM users WHERE id = $1', [order.userId]);
  const emailHtml = `<h1>Order Confirmed</h1><p>Total: $${((order.subtotal - discount) / 100).toFixed(2)}</p>`;
  await emailService.send({ to: user.email, subject: 'Order Confirmed', html: emailHtml });
}

// After: each concern extracted, named clearly
async function processOrder(orderId: string) {
  const order = await orderRepo.findById(orderId);
  const discount = await calculateCouponDiscount(order);
  await sendOrderConfirmation(order, discount);
}

async function calculateCouponDiscount(order: Order): Promise<number> {
  if (!order.couponCode) return 0;
  const coupon = await couponRepo.findByCode(order.couponCode);
  if (!isCouponValid(coupon)) return 0;
  return applyCoupon(order.subtotal, coupon);
}

function isCouponValid(coupon: Coupon | null): coupon is Coupon {
  if (!coupon) return false;
  return coupon.expiresAt > new Date() && coupon.usageCount < coupon.maxUsage;
}
```

---

### Replace Conditional with Polymorphism
Long if/switch chains on type become hard to extend. Polymorphism lets you add new types without touching existing code.

```typescript
// Before: switch on type
function calculateShipping(order: Order): number {
  switch (order.shippingMethod) {
    case 'standard': return 5_99 + Math.ceil(order.weightKg) * 1_00;
    case 'express': return 12_99 + Math.ceil(order.weightKg) * 2_00;
    case 'overnight': return 24_99 + Math.ceil(order.weightKg) * 4_00;
    case 'pickup': return 0;
    default: throw new Error(`Unknown shipping method: ${order.shippingMethod}`);
  }
}

// After: polymorphism — add new shipping methods without modifying existing code
interface ShippingStrategy {
  calculate(order: Order): number;
}

class StandardShipping implements ShippingStrategy {
  calculate(order: Order) { return 5_99 + Math.ceil(order.weightKg) * 1_00; }
}

class ExpressShipping implements ShippingStrategy {
  calculate(order: Order) { return 12_99 + Math.ceil(order.weightKg) * 2_00; }
}

class PickupShipping implements ShippingStrategy {
  calculate(_order: Order) { return 0; }
}

const shippingStrategies: Record<string, ShippingStrategy> = {
  standard: new StandardShipping(),
  express: new ExpressShipping(),
  pickup: new PickupShipping(),
};

function calculateShipping(order: Order): number {
  const strategy = shippingStrategies[order.shippingMethod];
  if (!strategy) throw new Error(`Unknown shipping method: ${order.shippingMethod}`);
  return strategy.calculate(order);
}
```

---

### Replace Magic Numbers with Named Constants
```typescript
// Before: magic numbers everywhere
function canUserUpload(user: User, fileSizeBytes: number): boolean {
  if (user.tier === 'free' && fileSizeBytes > 10 * 1024 * 1024) return false;
  if (user.tier === 'pro' && fileSizeBytes > 100 * 1024 * 1024) return false;
  return true;
}

// After: intent is clear
const FILE_SIZE_LIMITS = {
  free: 10 * 1024 * 1024,   // 10 MB
  pro: 100 * 1024 * 1024,   // 100 MB
  enterprise: Infinity,
} as const;

function canUserUpload(user: User, fileSizeBytes: number): boolean {
  const limit = FILE_SIZE_LIMITS[user.tier as keyof typeof FILE_SIZE_LIMITS];
  return fileSizeBytes <= limit;
}
```

---

### Introduce Parameter Object
When a function takes many related parameters, group them into an object.

```typescript
// Before: parameter list grows out of control
function searchProducts(
  query: string,
  category: string | null,
  minPrice: number | null,
  maxPrice: number | null,
  inStock: boolean,
  sortBy: string,
  sortOrder: 'asc' | 'desc',
  page: number,
  limit: number,
): Promise<Product[]> { ... }

// After: object parameter — extensible without signature change
interface ProductSearchParams {
  query: string;
  category?: string;
  priceRange?: { min: number; max: number };
  inStock?: boolean;
  sort?: { by: string; order: 'asc' | 'desc' };
  pagination?: { page: number; limit: number };
}

function searchProducts(params: ProductSearchParams): Promise<Product[]> { ... }
```

---

### Decompose Large Classes
A class with too many responsibilities should be split.

```typescript
// Before: UserService does everything
class UserService {
  async register(dto: RegisterDto): Promise<User> { ... }
  async login(credentials: Credentials): Promise<Tokens> { ... }
  async refreshToken(token: string): Promise<Tokens> { ... }
  async resetPassword(email: string): Promise<void> { ... }
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> { ... }
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> { ... }
  async uploadAvatar(userId: string, file: Buffer): Promise<string> { ... }
  async deleteAccount(userId: string): Promise<void> { ... }
  async sendVerificationEmail(userId: string): Promise<void> { ... }
  async verifyEmail(token: string): Promise<void> { ... }
}

// After: focused, single-responsibility services
class UserAuthService {
  async register(dto: RegisterDto): Promise<User> { ... }
  async login(credentials: Credentials): Promise<Tokens> { ... }
  async refreshToken(token: string): Promise<Tokens> { ... }
}

class PasswordService {
  async resetPassword(email: string): Promise<void> { ... }
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> { ... }
}

class UserProfileService {
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> { ... }
  async uploadAvatar(userId: string, file: Buffer): Promise<string> { ... }
  async deleteAccount(userId: string): Promise<void> { ... }
}

class EmailVerificationService {
  async sendVerificationEmail(userId: string): Promise<void> { ... }
  async verifyEmail(token: string): Promise<void> { ... }
}
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

Before starting:
- [ ] Tests exist and are passing (green)
- [ ] Change is purely structural — no feature changes

During:
- [ ] One refactoring technique at a time
- [ ] Run tests after each step
- [ ] Commit after each step (small, reversible)

After:
- [ ] All tests still pass
- [ ] No new test coverage gaps introduced
- [ ] Code is measurably simpler (fewer lines, fewer conditions, better naming)
