<!-- @keywords: architecture decisions, trade-offs, scalability, system design, technology selection -->

# Architecture — Decision Making and Trade-offs

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to decisions.

## Principles

## Decision Framework

Architecture decisions are irreversible in the short term — they shape the system for years. The decision process matters as much as the decision itself.

```
Good decision process:
  1. State the problem clearly (what forces are in tension?)
  2. List alternatives considered (not just the winner)
  3. Identify constraints (team, time, scale, cost)
  4. Evaluate trade-offs explicitly
  5. Make the decision, commit to it
  6. Set a review date (is this still the right call in 6 months?)
```

---

### Consistency vs Availability (CAP Theorem)

```
In a distributed system, during a network partition you must choose:
  Consistency:   every read sees the latest write (may reject requests)
  Availability:  always respond (may return stale data)

Financial data:
  → Choose consistency (wrong balance is worse than temporary unavailability)

User preference data, analytics:
  → Choose availability (slightly stale preferences are fine)

Practical implication:
  - Use synchronous DB writes for financial operations
  - Use eventual consistency (event sourcing, async) for non-critical data
```

### Coupling vs Cohesion

```
High coupling:   modules depend heavily on each other's internals
High cohesion:   related logic is grouped together

Goal: high cohesion within modules, low coupling between modules

Signal of wrong coupling:
  - Changing one module requires changes in 5 other modules
  - Can't test module A without starting module B

Signal of correct coupling:
  - Changing payment logic only touches the payment module
  - Adding a new feature only touches one module (and shared infrastructure)
```

### Synchronous vs Asynchronous

```
Use synchronous when:
  - Response depends on the result of the operation
  - User is waiting (checkout must know if payment succeeded)
  - Operation is fast (< 500ms)
  - Data consistency is required immediately

Use asynchronous when:
  - User doesn't need to wait (email confirmation)
  - Operation is slow (PDF generation, video encoding)
  - Operation can fail and retry (webhook delivery)
  - Multiple downstream systems need to react (event fan-out)

Example: order checkout
  Sync: validate cart → charge payment → confirm order (user waits ~2s)
  Async: after confirmation → send email, update inventory, notify warehouse
```

---

### When to Denormalize

```
Normalization rule: each fact stored exactly once.
But read performance sometimes requires denormalization.

Denormalize when:
  - A JOIN is expensive and frequently needed
  - Data changes rarely but is read constantly
  - You can tolerate eventual consistency

Example: store `authorName` directly in `posts` table
  + No JOIN needed to display posts
  - If author changes name, need to update all posts (batch job)
  - Acceptable if author name changes are rare

Don't denormalize when:
  - Data changes frequently
  - Consistency is critical
  - The JOIN isn't actually a bottleneck (measure first!)
```

### Single Database vs Multiple Databases

```
Start with one database. Add databases only when:
  - A module has genuinely different storage requirements
    (relational data + document storage + vector search)
  - Independent scaling is required
  - Team/ownership boundaries require data isolation

Cost of multiple databases:
  - No cross-database transactions (eventual consistency required)
  - More operational complexity
  - More to back up, monitor, migrate

Rule: Don't split the database before you've outgrown one.
```

---

### REST vs GraphQL vs gRPC

```
REST:
  + Simple, well-understood, great tooling
  + Stateless, cacheable, HTTP semantics
  - Over-fetching / under-fetching common
  Use when: public API, simple data requirements, broad client compatibility

GraphQL:
  + Client specifies exactly what data it needs
  + Single endpoint, introspection, strong typing
  - Complex caching, N+1 problem without DataLoader
  - Overkill for simple CRUD
  Use when: complex data graph, many different clients with different needs

gRPC:
  + High performance (binary protocol)
  + Strong typing, code generation
  + Streaming support
  - Not browser-native (requires proxy)
  - Less human-readable
  Use when: service-to-service communication, high-throughput internal APIs
```

### When to Add an API Gateway

```
Start without a gateway. Add when:
  - Multiple microservices need a unified entry point
  - Cross-cutting concerns (auth, rate limiting, logging) need centralizing
  - You need request routing and transformation

Gateway responsibilities:
  - SSL termination
  - Authentication (validate JWT before reaching services)
  - Rate limiting
  - Request routing
  - Response aggregation

Don't put business logic in the gateway.
```

---

```
Level 1: Optimize the single instance
  - Profile and fix slow queries
  - Add indexes
  - Cache expensive computations
  → Get 10-100x improvement before considering horizontal scaling

Level 2: Vertical scaling
  - Bigger machine (more CPU, RAM)
  - Larger database instance
  → Simple, no code changes, but has ceiling

Level 3: Horizontal scaling (stateless app servers)
  - Multiple instances behind load balancer
  - Requires: stateless app (no in-memory session), sticky sessions avoided
  - Session in Redis, not in-memory

Level 4: Database read replicas
  - Direct read queries to replicas
  - Writes still go to primary
  - Eventual consistency for reads (replication lag)

Level 5: Sharding / partitioning
  - Split data across multiple database instances
  - Complex: cross-shard queries, transactions impossible
  - Only when data volume exceeds single-machine capacity
```

---

- [ ] Problem stated in terms of forces in tension (not just "what tech to pick")
- [ ] Alternatives documented with reasons rejected
- [ ] Constraints explicit (team size, scale, budget, timeline)
- [ ] Trade-offs acknowledged (no decision is free)
- [ ] Decision recorded as ADR (who decided, when, why)
- [ ] Review date set (revisit if context changes significantly)
- [ ] Team alignment achieved before implementation begins

## Anti-Patterns

- Over-engineering the solution.
- Ignoring context and copying blindly.
- Mixing concerns unnecessarily.

## Example in Action

```typescript
// Apply the core principles identified above in a targeted manner.
// Keep it simple and maintainable.
```
