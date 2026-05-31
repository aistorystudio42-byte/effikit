<!-- @keywords: design pattern, factory, observer, strategy, repository, singleton, dependency injection, pattern implementation -->
<!-- @domain: Software Design Pattern Prompts -->

# Design Pattern Implementation Prompts

## Repository Pattern

```
Implement the Repository pattern for: [Entity name]

**Why:** Decouple business logic from data access so the storage layer 
can change without touching domain code.

**Interface to define:**
interface [Entity]Repository {
  findById(id: string): Promise<[Entity] | null>
  findMany(filter: [FilterType]): Promise<[Entity][]>
  create(data: Create[Entity]): Promise<[Entity]>
  update(id: string, data: Partial<[Entity]>): Promise<[Entity]>
  delete(id: string): Promise<void>
}

**Implementations needed:**
1. [Entity]PrismaRepository — real Prisma implementation
2. [Entity]InMemoryRepository — for tests (no DB required)

**Requirements:**
- Both implement the same interface exactly
- InMemory version stores in a Map<string, Entity>
- Transactions: add beginTransaction/commit/rollback if update + delete 
  need to happen atomically
- Error types: custom RepositoryError with .code ('NOT_FOUND' | 'DUPLICATE' | 'UNKNOWN')

Show: interface, both implementations, and a service that uses the interface.
```

---

## Observer / Event Bus

```
Implement a type-safe event bus for: [application area]

**Events to handle:**
- [EventName]: { payload shape }
- [EventName]: { payload shape }
- [EventName]: { payload shape }

**Requirements:**
- TypeScript: subscribing to an event gives typed payload in the callback
- No `any` in the event map
- Unsubscribe: subscribe() returns an unsubscribe function
- Async handlers supported
- Error in one handler must not prevent others from running
- Optional: once() for single-fire subscriptions

**Pattern:**
type EventMap = {
  'user:created': { id: string; email: string }
  'order:placed': { orderId: string; total: number }
}

class EventBus<TMap extends Record<string, unknown>> { ... }

Show: implementation + 3 usage examples.
```

---

## Strategy Pattern

```
Implement the Strategy pattern for: [varying behavior]

**Context:** [describe the algorithm/behavior that needs to vary]

**Strategies needed:**
- [StrategyA]: [what it does differently]
- [StrategyB]: [what it does differently]
- [StrategyC]: [what it does differently]

**Interface:**
interface [Name]Strategy {
  execute(input: [InputType]): [OutputType]
}

**Context class:**
class [Context] {
  constructor(private strategy: [Name]Strategy) {}
  setStrategy(s: [Name]Strategy): void
  run(input: [InputType]): [OutputType]
}

**Requirements:**
- Strategies are swappable at runtime
- Context doesn't need to know which strategy is active
- Each strategy is independently testable
- Factory function to create the right strategy from a config/env value

Show: interface, all strategies, context class, factory, and example usage.
```

---

## Factory Pattern

```
Implement a Factory for creating: [object family]

**Problem:** [why construction is complex — many variants, dependencies, config]

**Variants to create:**
- [VariantA]: needs [params], produces [Shape]
- [VariantB]: needs [params], produces [Shape]
- [VariantC]: needs [params], produces [Shape]

**Factory type:**
- Simple factory function: createX(type: 'a' | 'b' | 'c', config): X
- OR Abstract Factory: interface for families of related objects

**Requirements:**
- Return type is the union of all variant types (discriminated by a `type` field)
- Invalid input throws a typed FactoryError, not a generic Error
- Factories are pure (no side effects, no async)
- Easy to add a new variant without modifying existing code

Show: all types, factory implementation, and 4 usage examples.
```

---

## Middleware / Pipeline Pattern

```
Implement a middleware pipeline for: [processing task]

**Context:** [what data flows through the pipeline]

**Middleware to implement:**
- [Step1Middleware]: [what it does to the data]
- [Step2Middleware]: [what it does]
- [Step3Middleware]: [what it does]

**Pattern:**
type Next = () => Promise<void>
type Middleware<TCtx> = (ctx: TCtx, next: Next) => Promise<void>

class Pipeline<TCtx> {
  use(middleware: Middleware<TCtx>): this
  run(ctx: TCtx): Promise<TCtx>
}

**Requirements:**
- Each middleware can: modify ctx, call next(), or short-circuit by not calling next()
- Execution order: same order as .use() calls
- Error in middleware propagates and skips remaining middlewares
- Context is mutable (middlewares add to it)
- TypeScript: ctx type is known throughout

Show: Pipeline class, all middleware, and a usage example that chains them.
```
