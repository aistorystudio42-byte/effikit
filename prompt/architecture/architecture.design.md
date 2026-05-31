<!-- @keywords: architecture, system design, microservice, event-driven, monolith, design decision, ADR -->
<!-- @domain: System Architecture Design Prompts -->

# Architecture Design Prompts

## New System Architecture

```
Design the architecture for: [system name]

**What it does:**
[describe the system's purpose in 2-3 sentences]

**Users & Scale:**
- Users: [N total, N daily active]
- Peak load: [N requests/sec]
- Data volume: [initial / growth rate]
- Geographic distribution: [single region / multi-region / global]

**Key requirements:**
- Availability: [99.9% / 99.99% — what downtime is acceptable?]
- Consistency: [strong / eventual — can users see stale data temporarily?]
- Latency: [P99 < X ms for which operations?]
- Compliance: [GDPR / HIPAA / SOC2 / none]

**Constraints:**
- Team size: [N engineers]
- Timeline: [MVP in X weeks / production in Y months]
- Existing systems to integrate: [list]
- Budget constraints: [if relevant]

**Design the following:**
1. Service decomposition: monolith vs microservices decision with rationale
2. Data stores: which DB for which data and why
3. Communication: sync (REST/gRPC) vs async (queues/events) for each interaction
4. Caching strategy: where, what, and TTL
5. Authentication & authorization approach
6. Deployment: containers, orchestration, CI/CD
7. Observability: logging, metrics, tracing

**For each decision:** the alternatives you considered and why you chose this.
```

---

## Microservices Decomposition

```
Help me decompose this monolith into microservices.

**Monolith description:**
[describe what the monolith does — domain areas, key operations]

**Code structure (if applicable):**
[describe current module/folder structure]

**Reasons to decompose:**
[scalability / team autonomy / independent deployments / technology diversity]

**Design the decomposition:**

1. **Domain boundaries (DDD bounded contexts):**
   - Context A: [name] — owns [entities], handles [operations]
   - Context B: [name] — owns [entities], handles [operations]
   - Context C: [name] — ...

2. **For each service:**
   - Responsibility: [one sentence]
   - Data: [its own DB? shared? which entities it owns]
   - API: [what it exposes to other services]
   - Events: [what events it emits, what events it listens to]

3. **Inter-service communication:**
   - Synchronous (REST/gRPC): [which pairs and why]
   - Asynchronous (events): [which pairs and why]

4. **Migration strategy:**
   - Order of extraction (lowest coupling first)
   - Strangler fig pattern vs big bang
   - How to handle the shared database during transition

**What NOT to decompose:** services that should stay together and why.
```

---

## ADR — Architecture Decision Record

```
Write an Architecture Decision Record (ADR) for this decision.

**Decision to document:**
[describe the technical decision being made]

**Template:**
---
# ADR-[N]: [Title]

## Status
[Proposed / Accepted / Deprecated / Superseded by ADR-X]

## Context
[What is the situation? What problem are we solving? What constraints exist?
Write as if explaining to someone joining the team 2 years from now.]

## Decision
[What are we deciding to do? Be specific.]

## Alternatives Considered

### Option A: [name]
**Pros:** [list]
**Cons:** [list]
**Why rejected:** [reason]

### Option B: [name]
**Pros:** [list]
**Cons:** [list]
**Why rejected:** [reason]

### Option C (chosen): [name]
**Pros:** [list]
**Cons:** [list]
**Why chosen:** [reason]

## Consequences
**Positive:** [what this enables]
**Negative:** [what this costs or constraints]
**Risks:** [what could go wrong]

## Review Date
[When should this decision be revisited?]
---

Fill in based on this decision: [describe your specific decision context]
```

---

## Event-Driven Architecture Design

```
Design an event-driven architecture for: [domain/feature]

**Domain events to handle:**
- [EventName]: triggered when [what happens], consumers: [who cares]
- [EventName]: triggered when [what happens], consumers: [who cares]
- [EventName]: triggered when [what happens], consumers: [who cares]

**Design for each event:**
1. Event schema: { eventId, type, version, timestamp, aggregateId, payload: {...} }
2. Producer: which service emits it and when
3. Consumers: which services subscribe and what they do
4. Delivery guarantee: at-least-once / exactly-once / at-most-once
5. Ordering requirement: [strict per aggregate / none]

**Infrastructure:**
- Message broker: [Kafka / RabbitMQ / SQS/SNS / Redis Streams / Supabase Realtime]
- Consumer group strategy (for parallel consumption)
- Dead letter queue for failed events
- Event store / outbox pattern if strong consistency needed

**Failure scenarios:**
- Consumer is down: [what happens to events?]
- Consumer fails midway: [replay from where?]
- Duplicate event received: [idempotency key strategy]

Show: event schema, producer code pattern, consumer code pattern.
```

---

## API Gateway Design

```
Design an API gateway for: [system description]

**Downstream services:**
- [Service A]: [what it does, its base URL]
- [Service B]: [what it does]
- [Service C]: [what it does]

**Gateway responsibilities:**

1. **Routing:**
   - [/api/v1/users] → Service A
   - [/api/v1/posts] → Service B
   - [/api/v1/media] → Service C

2. **Authentication:**
   - JWT validation at gateway level (don't trust downstream)
   - Pass verified user identity via header to downstream
   - Public routes: [list]

3. **Rate limiting:**
   - Per user: [N req/min]
   - Per IP (unauthenticated): [N req/min]
   - Per endpoint tier (expensive ops): [N req/min]

4. **Other cross-cutting concerns:**
   - Request ID injection (for distributed tracing)
   - Response time logging
   - CORS handling at gateway level
   - Request/response transformation if API versions differ

**Technology choice:**
[nginx / Kong / AWS API Gateway / custom Node middleware / Traefik]
Recommendation with rationale.
```
