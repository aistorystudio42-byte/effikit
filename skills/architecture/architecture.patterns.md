<!-- @keywords: architecture, patterns, clean architecture, hexagonal, microservices, monolith, DDD -->

# Architecture — Patterns and System Design

## Architecture Decision Framework

Before choosing a pattern, answer these questions:

```
Team size:     1-5 devs → monolith   |  10+ devs → consider decomposition
Deployment:    simple → monolith     |  independent scaling → microservices
Complexity:    CRUD → layered        |  rich domain → DDD + clean architecture
Scale:         low → monolith        |  high throughput → event-driven
```

The most common mistake is choosing microservices for a 3-person team building a new product. Start monolith. Extract services when friction is real, not hypothetical.

---

## Layered Architecture (Default Choice)

Clear separation of concerns. Good for most applications.

```
Presentation Layer  (HTTP, WebSocket, CLI)
    ↓
Application Layer   (Use cases, orchestration)
    ↓
Domain Layer        (Business logic, entities, domain services)
    ↓
Infrastructure Layer (DB, external APIs, file storage)
```

```typescript
// Domain layer: pure business logic, no framework dependencies
class Order {
  private items: OrderItem[] = [];
  private status: OrderStatus = 'pending';

  addItem(product: Product, qty: number): void {
    if (qty < 1) throw new DomainError('Quantity must be at least 1');
    const existing = this.items.find(i => i.productId === product.id);
    if (existing) existing.quantity += qty;
    else this.items.push(new OrderItem(product, qty));
  }

  confirm(): void {
    if (this.items.length === 0) throw new DomainError('Cannot confirm empty order');
    if (this.status !== 'pending') throw new DomainError(`Cannot confirm ${this.status} order`);
    this.status = 'confirmed';
    this.addDomainEvent(new OrderConfirmedEvent(this.id));
  }

  get total(): Money {
    return this.items.reduce((sum, item) => sum.add(item.subtotal), Money.zero());
  }
}

// Application layer: orchestrates domain + infrastructure
class ConfirmOrderUseCase {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly paymentService: PaymentService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(orderId: string, paymentMethod: PaymentMethod): Promise<void> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new NotFoundError('Order');

    order.confirm(); // domain logic

    await this.paymentService.charge(order.total, paymentMethod); // infrastructure
    await this.orderRepo.save(order);
    await this.eventBus.publish(order.pullDomainEvents());
  }
}
```

---

## Hexagonal Architecture (Ports and Adapters)

Domain is at the center. Everything external connects via ports (interfaces).

```typescript
// Port (interface — defined in domain layer)
interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  save(order: Order): Promise<void>;
}

interface PaymentGateway {
  charge(amount: Money, method: PaymentMethod): Promise<PaymentResult>;
}

// Adapter (implementation — defined in infrastructure layer)
class PostgresOrderRepository implements OrderRepository {
  async findById(id: string): Promise<Order | null> {
    const row = await this.db.query('SELECT * FROM orders WHERE id = $1', [id]);
    return row ? OrderMapper.toDomain(row) : null;
  }
  async save(order: Order): Promise<void> {
    await this.db.query('...', OrderMapper.toPersistence(order));
  }
}

class StripePaymentGateway implements PaymentGateway {
  async charge(amount: Money, method: PaymentMethod): Promise<PaymentResult> {
    return this.stripe.paymentIntents.create({ amount: amount.cents, currency: amount.currency });
  }
}

// Test adapter — no real infrastructure needed
class InMemoryOrderRepository implements OrderRepository {
  private store = new Map<string, Order>();
  async findById(id: string) { return this.store.get(id) ?? null; }
  async save(order: Order) { this.store.set(order.id, order); }
}
```

**Benefit:** Business logic testable without any real database or payment provider.

---

## Event-Driven Architecture

Decouples producers from consumers. Enables async workflows and horizontal scaling.

```typescript
// Event definition
interface DomainEvent {
  type: string;
  aggregateId: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
}

// Producer: Order Service publishes events
class OrderService {
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const order = await this.orderRepo.create(dto);

    // Publish event — doesn't know who handles it
    await this.eventBus.publish({
      type: 'order.created',
      aggregateId: order.id,
      occurredAt: new Date(),
      payload: { userId: order.userId, totalCents: order.totalCents, items: order.items },
    });

    return order;
  }
}

// Consumers: independent services react to events
class InventoryService {
  @EventHandler('order.created')
  async onOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.inventory.decrementStock(event.payload.items);
  }
}

class NotificationService {
  @EventHandler('order.created')
  async onOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.email.sendConfirmation(event.payload.userId, event.aggregateId);
  }
}
```

---

## Modular Monolith — Best of Both Worlds

Monolith for deployment simplicity, module boundaries for future extraction.

```
src/
  modules/
    orders/          ← owns order data, exposes only public API
      index.ts       ← public surface: what other modules can call
      internal/      ← private: not importable from other modules
    users/
      index.ts
      internal/
    inventory/
      index.ts
      internal/
  shared/            ← truly shared (errors, logging, DI container)
```

```typescript
// orders/index.ts — only public surface
export { CreateOrderUseCase } from './internal/use-cases/create-order';
export type { Order, OrderStatus } from './internal/domain/order';
// No internal implementation details exported

// inventory/internal/use-cases/allocate-stock.ts
// Imports only from orders' public API:
import type { Order } from '@modules/orders'; // ✓ public API
import { OrderRepository } from '@modules/orders/internal'; // ✗ private — forbidden
```

---

## Architecture Decision Records (ADR)

Document why architectural decisions were made.

```markdown
# ADR-007: Adopt Modular Monolith over Microservices

## Status: Accepted (2024-01-15)

## Context
We need to choose between microservices and monolith for v2.
Team size: 5 engineers. Current scale: 10k users.

## Decision
Adopt a modular monolith with strict module boundaries.

## Reasoning
- Team too small to operate multiple deployment pipelines
- Current scale doesn't require independent scaling
- Module boundaries allow future extraction if needed
- Single database is simpler and sufficient at current scale

## Consequences
+ Simpler deployment and operations
+ Easier refactoring across modules (atomic commits)
- Cannot scale modules independently (acceptable at current scale)
- Requires discipline to respect module boundaries (enforced via ESLint import rules)

## Review Date: 2025-01-15
```

---

## Architecture Checklist

- [ ] Architecture choice matched to team size and scale requirements
- [ ] Layer boundaries enforced (no infrastructure imports in domain)
- [ ] Domain logic has zero framework dependencies
- [ ] Interfaces defined for all external dependencies (testability)
- [ ] Module boundaries enforced with ESLint import rules
- [ ] ADRs written for significant architectural decisions
- [ ] Architecture reviewed annually or when requirements change significantly
