<!-- @keywords: architecture pattern, CQRS, event sourcing, saga, outbox, BFF, strangler fig, hexagonal -->
<!-- @domain: Advanced Architecture Pattern Prompts -->

# Advanced Architecture Pattern Prompts

## CQRS Implementation

```
Implement CQRS (Command Query Responsibility Segregation) for: [domain]

**Why CQRS here:**
[describe the read/write asymmetry — e.g., "writes are complex with validation, 
reads serve 3 different clients with different shapes"]

**Commands (writes) to implement:**
- [CommandName]: validates [rules], modifies [entities], emits [events]
- [CommandName]: ...

**Queries (reads) to implement:**
- [QueryName]: returns [data shape] for [consumer]
- [QueryName]: returns [data shape] for [consumer]

**Design:**
1. Command handler: validates input → applies business rules → persists → emits event
2. Query handler: reads from read model (can be different DB/schema from write model)
3. Event handler: listens to domain events → updates read model projections

**TypeScript pattern:**
interface Command<TResult> { readonly _type: string }
interface CommandHandler<TCommand, TResult> {
  handle(command: TCommand): Promise<TResult>
}

Show: command definitions, handlers, query handlers, and read model projections.
```

---

## Outbox Pattern

```
Implement the Transactional Outbox pattern for: [event publishing scenario]

**Problem:** We need to publish [events] to [Kafka/SQS/etc.] when [database operation] 
happens, but we can't lose events if the publish fails after the DB commit.

**Implementation:**

1. **Outbox table:**
```sql
CREATE TABLE outbox_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

2. **In the same transaction as business operation:**
   - Write to main table AND outbox_events atomically

3. **Outbox worker:**
   - Polls for unpublished events
   - Publishes to message broker
   - Marks as published

**Implement:**
- The combined write transaction
- The polling worker with retry logic
- Idempotency: what happens if an event is published twice?
- Dead letter handling for events that repeatedly fail
```

---

## Saga Pattern

```
Design a Saga for: [distributed transaction]

**Multi-step process:**
Step 1: [service A: action] → on success: [step 2], on failure: [compensation]
Step 2: [service B: action] → on success: [step 3], on failure: [compensate step 1 and 2]
Step 3: [service C: action] → on success: [complete], on failure: [compensate all]

**Saga type:**
- Choreography (event-based): each service publishes events, next step listens
- Orchestration (coordinator): a saga orchestrator calls each service in sequence

**Recommendation:** [based on the complexity, recommend one]

**Implement:**
1. The saga state machine with all states and transitions
2. Each step's success handler and compensation handler
3. The orchestrator (if orchestration) or event handlers (if choreography)
4. Saga persistence: how to resume if the orchestrator crashes mid-saga
5. Idempotency: each step safe to retry

TypeScript with discriminated union for saga state.
```

---

## Hexagonal Architecture

```
Refactor this code to follow Hexagonal Architecture (Ports & Adapters).

**Current code:**
[paste current implementation — likely tangled business logic with framework code]

**Goal:** Isolate the domain logic from infrastructure (framework, DB, external APIs)

**Design:**

**Core (Domain):**
- Entities: [list]
- Domain services: [list]
- Ports (interfaces the domain needs): IUserRepository, IEmailService, etc.

**Application layer:**
- Use cases: [list — each is a command or query the system can handle]
- Each use case takes a command/query object, uses ports, returns result

**Adapters (Infrastructure):**
- Primary (driving): HTTP controllers, CLI handlers, test drivers
- Secondary (driven): Prisma repository, SendGrid email, Redis cache

**Rule:** 
- Domain layer has zero imports from framework or infrastructure
- Use cases import only ports (interfaces), not concrete implementations
- Dependency injection wires concrete adapters to ports

Show: the refactored structure with clear layer boundaries.
```

---

## Strangler Fig Migration

```
Plan a Strangler Fig migration for: [legacy system description]

**Legacy system:**
[describe what it does, what's wrong with it, why it needs replacing]

**New system:**
[describe target architecture]

**Migration strategy:**

**Phase 1 — Identify seams:**
- Find the natural boundaries in the legacy system
- These become the extraction order (lowest coupling first)

**Phase 2 — Route traffic at the facade:**
- Add a routing layer (nginx, API gateway, feature flag) in front of both systems
- All traffic still goes to legacy initially

**Phase 3 — Extract and redirect feature by feature:**
For each feature [in order of low→high coupling]:
- [ ] Build replacement in new system
- [ ] Test in parallel (dark launch — run both, compare outputs)
- [ ] Shift X% of traffic to new system
- [ ] Monitor for errors
- [ ] Shift 100%, remove old code

**Phase 4 — Final migration:**
- Remove the routing facade
- Decommission legacy

**Risk mitigation:**
- Never migrate two high-risk features simultaneously
- Keep rollback path for each phase
- Data migration strategy: sync vs one-time cutover

Produce: migration plan with specific feature extraction order for [system].
```
