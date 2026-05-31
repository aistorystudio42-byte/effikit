<!-- @keywords: backend, design patterns, CQRS, event sourcing, domain events, middleware, interceptor -->

# Backend — Design Patterns and Scalable Structures

## When to Apply a Pattern

Patterns solve specific recurring problems. Applying a pattern where the problem doesn't exist adds complexity without benefit. Before adopting any pattern, identify the exact problem it solves in your current context.

---

## CQRS — Command Query Responsibility Segregation

**Problem it solves:** Read and write models have different optimization needs. A write operation needs validation and consistency; a read operation needs speed and flexibility.

```typescript
// Commands — change state, return minimal confirmation
interface CreateOrderCommand {
  userId: string;
  items: Array<{ productId: string; quantity: number }>;
  shippingAddress: Address;
}

class CreateOrderHandler {
  async execute(cmd: CreateOrderCommand): Promise<{ orderId: string }> {
    const user = await this.userRepo.findById(cmd.userId);
    if (!user) throw new NotFoundError('User');

    const products = await this.productRepo.findByIds(cmd.items.map(i => i.productId));
    const order = Order.create(user, products, cmd.items, cmd.shippingAddress);
    
    await this.orderRepo.save(order);
    await this.eventBus.publish(new OrderCreatedEvent(order.id));
    
    return { orderId: order.id };
  }
}

// Queries — read state, return rich data, never modify
interface GetOrderDetailsQuery {
  orderId: string;
  userId: string;
}

class GetOrderDetailsHandler {
  async execute(query: GetOrderDetailsQuery): Promise<OrderDetailsView> {
    // Can use optimized read model, denormalized view, or direct SQL join
    return this.db.queryOne<OrderDetailsView>(`
      SELECT o.*, u.name as user_name, 
             json_agg(oi.*) as items
      FROM orders o
      JOIN users u ON u.id = o.user_id
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.id = $1 AND o.user_id = $2
      GROUP BY o.id, u.name
    `, [query.orderId, query.userId]);
  }
}
```

**Use CQRS when:** Read/write ratio is heavily skewed, read models require complex joins, you need separate scaling for reads and writes.

**Don't use CQRS when:** Simple CRUD, small teams, no clear scaling requirement.

---

## Domain Events

Decouple side effects from core business logic. When order is created, payment, email, and inventory should not be orchestrated directly inside `OrderService`.

```typescript
// Event definition
class OrderCreatedEvent {
  readonly type = 'order.created';
  readonly occurredAt = new Date();
  
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly totalAmount: number,
  ) {}
}

// Event bus
interface EventBus {
  publish<T>(event: T): Promise<void>;
  subscribe<T>(eventType: string, handler: (event: T) => Promise<void>): void;
}

// Handlers — each concern in its own handler
class PaymentHandler {
  async handle(event: OrderCreatedEvent) {
    await this.paymentService.initializePayment(event.orderId, event.totalAmount);
  }
}

class NotificationHandler {
  async handle(event: OrderCreatedEvent) {
    const user = await this.userRepo.findById(event.userId);
    await this.emailService.sendOrderConfirmation(user.email, event.orderId);
  }
}

// Registration
eventBus.subscribe('order.created', e => paymentHandler.handle(e));
eventBus.subscribe('order.created', e => notificationHandler.handle(e));
```

**Result:** `OrderService.createOrder()` only creates an order. Payment, email, and inventory are separate handlers that react to the event.

---

## Middleware Chain

```typescript
// Express middleware — composable, single responsibility
type Middleware = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

// Authentication middleware
const authenticate: Middleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    req.user = await verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Authorization middleware — factory pattern for flexible rules
const authorize = (requiredRole: UserRole): Middleware =>
  (req, res, next) => {
    if (!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };

// Rate limiting middleware
const rateLimit = (options: RateLimitOptions): Middleware => {
  const store = new Map<string, { count: number; resetAt: number }>();
  
  return (req, res, next) => {
    const key = req.ip!;
    const now = Date.now();
    const record = store.get(key);
    
    if (!record || record.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }
    
    if (record.count >= options.max) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    
    record.count++;
    next();
  };
};

// Usage — compose middleware per route
router.post('/admin/users',
  authenticate,
  authorize('admin'),
  rateLimit({ windowMs: 60_000, max: 10 }),
  createUserController
);
```

---

## Repository Pattern with Specifications

For complex queries, the Specification pattern keeps repositories clean.

```typescript
// Specification — encapsulates query criteria
interface Specification<T> {
  toQuery(): QueryConditions;
  and(other: Specification<T>): Specification<T>;
  or(other: Specification<T>): Specification<T>;
}

class ActiveUserSpec implements Specification<User> {
  toQuery() { return { isActive: true, deletedAt: null }; }
  and(other: Specification<User>) { return new AndSpec(this, other); }
  or(other: Specification<User>) { return new OrSpec(this, other); }
}

class PremiumUserSpec implements Specification<User> {
  toQuery() { return { tier: 'premium' }; }
  and(other: Specification<User>) { return new AndSpec(this, other); }
  or(other: Specification<User>) { return new OrSpec(this, other); }
}

class UserRepository {
  async findBySpec(spec: Specification<User>): Promise<User[]> {
    return this.db.findMany('users', spec.toQuery());
  }
}

// Compose specifications
const activePremiumUsers = new ActiveUserSpec().and(new PremiumUserSpec());
const users = await userRepo.findBySpec(activePremiumUsers);
```

---

## Unit of Work Pattern

Ensures multiple repository operations either all succeed or all fail together.

```typescript
interface UnitOfWork {
  users: UserRepository;
  orders: OrderRepository;
  products: ProductRepository;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  transaction<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T>;
}

class PostgresUnitOfWork implements UnitOfWork {
  private client: PoolClient;

  async transaction<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T> {
    this.client = await this.pool.connect();
    await this.client.query('BEGIN');
    
    try {
      const result = await work(this);
      await this.client.query('COMMIT');
      return result;
    } catch (err) {
      await this.client.query('ROLLBACK');
      throw err;
    } finally {
      this.client.release();
    }
  }
}

// Usage
await uow.transaction(async (uow) => {
  const order = await uow.orders.create(orderData);
  await uow.products.decrementStock(order.items);
  // If either fails, both rollback
});
```

---

## Pattern Selection Guide

| Problem | Pattern |
|---------|---------|
| Read/write model mismatch | CQRS |
| Side effects spreading into core logic | Domain Events |
| Complex query criteria | Specification |
| Multi-repo atomic operations | Unit of Work |
| Cross-cutting concerns (auth, logging) | Middleware |
| Same operation, different implementations | Strategy |
| Building complex objects step by step | Builder |
