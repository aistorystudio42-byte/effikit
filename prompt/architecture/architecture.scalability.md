<!-- @keywords: scalability, horizontal scaling, load balancing, caching strategy, database scaling, sharding, CDN -->
<!-- @domain: Scalability Architecture Prompts -->

# Scalability Architecture Prompts

## Scalability Assessment

```
Assess the scalability limits of this system and design improvements.

**Current system:**
[describe architecture — single server / small cluster / monolith / etc.]

**Current metrics:**
- Users: [N]
- Peak RPS: [N requests/sec]
- DB size: [N GB / N rows in largest table]
- Response time P99: [X ms]

**Scale target (in 12 months):**
- Users: [10× / 100× current]
- Peak RPS: [target]
- Acceptable P99: [target ms]

**Bottleneck analysis:**

For each component, estimate when it breaks at scale:
1. **Web server:** [current capacity → when does it saturate?]
2. **Database:** [current connections, query volume → bottleneck point]
3. **Cache:** [hit rate, eviction rate → at what scale does cache miss rate spike?]
4. **External API calls:** [rate limits, latency → how do they compound at scale?]
5. **Background jobs:** [queue depth growth → when do jobs fall behind?]

**For each bottleneck:** specific architectural change to address it.
```

---

## Database Scaling Strategy

```
Design a database scaling strategy for: [application]

**Current state:**
- Database: [PostgreSQL / MySQL / MongoDB]
- Size: [N GB, N rows in heaviest tables]
- Load: [N reads/sec, N writes/sec]
- Primary bottleneck: [connection exhaustion / slow queries / disk I/O / CPU]

**Scaling options to evaluate:**

**1. Read replicas:**
- When: read-heavy workload (>80% reads)
- How: route read queries to replica, writes to primary
- Lag concern: eventual consistency acceptable for [which queries]?

**2. Connection pooling (PgBouncer / RDS Proxy):**
- When: connection exhaustion under serverless/many instances
- Config: pool size, mode (transaction vs session)

**3. Vertical scaling:**
- When: CPU-bound queries, can't shard
- Limit: max instance size, then must go horizontal

**4. Sharding:**
- When: data volume exceeds single instance (>2TB) or write load is extreme
- Shard key selection: [what to shard on and why]
- Cross-shard query problem: how to handle joins across shards

**5. Read cache (Redis):**
- Cache which queries: [hot, expensive, rarely-changing]
- TTL strategy: [what's acceptable staleness for each query type]
- Invalidation: [how to keep cache consistent on writes]

**Recommend:** ordered action plan from "do this first" to "do this at 100× scale."
```

---

## Caching Architecture

```
Design a comprehensive caching strategy for: [application]

**Application profile:**
- Read/write ratio: [N:1]
- Hot data: [what % of data is accessed >80% of the time?]
- Acceptable staleness: [which data can be stale? For how long?]

**Cache layers to implement:**

**Layer 1 — Browser/CDN cache:**
- Static assets: max-age 31536000 (1 year, content-hashed filenames)
- API responses with Cache-Control + stale-while-revalidate
- Which routes should be cached at CDN? [list public routes]

**Layer 2 — Application cache (Redis):**
- What to cache: [list: expensive DB queries, computed results, session data]
- Cache key strategy: [namespace:entity:id:variant]
- TTL per data type:
  - User sessions: 24h
  - [Data type A]: [TTL]
  - [Data type B]: [TTL]
- Eviction policy: [allkeys-lru / volatile-lru]
- Invalidation triggers: [which write operations clear which keys]

**Layer 3 — In-process memory cache:**
- For: [configuration, permission maps, rarely-changing reference data]
- Max size: [N MB per instance]
- Refresh interval: [N seconds]

**Cache coherence:**
How to handle write-through vs write-back vs write-around for each data type.
```

---

## Background Job Architecture

```
Design a background job system for: [application]

**Jobs to handle:**
- [JobA]: triggered by [event], runs every [interval / on-demand], 
  duration ~[X sec], acceptable lag [Y sec]
- [JobB]: ...
- [JobC]: ...

**Design:**

**Queue infrastructure:**
- Technology: [BullMQ (Redis) / SQS / RabbitMQ / Inngest]
- Why this choice for this workload

**Job types:**
1. Immediate jobs (user-triggered, need to start in <1s):
   - [list jobs]
   
2. Scheduled jobs (cron-based):
   - [job]: [cron expression]
   
3. Long-running jobs (minutes to hours):
   - [list jobs] — these need progress tracking and heartbeats

**Reliability patterns:**
- Retry strategy: exponential backoff with jitter, max [N] retries
- Dead letter queue: after N failures, move to DLQ for manual inspection
- Idempotency: each job safe to run multiple times (deduplication key)
- Timeout: kill jobs that exceed [N minutes] to free worker

**Worker scaling:**
- Auto-scale workers based on queue depth
- Concurrency per worker: [N] (based on job type — CPU vs I/O bound)

Show: queue setup, job class pattern, worker config, monitoring strategy.
```

---

## Rate Limiting Architecture

```
Design a rate limiting system for: [API / service]

**Why rate limiting:**
[prevent abuse / protect downstream / fair usage / cost control]

**Rate limits by actor:**

| Actor | Scope | Limit | Window | Burst |
|-------|-------|-------|--------|-------|
| Anonymous IP | per IP | [N] | 1 minute | [M] |
| Authenticated user | per user | [N] | 1 minute | [M] |
| API key (free tier) | per key | [N] | 1 hour | [M] |
| API key (paid tier) | per key | [N] | 1 hour | [M] |
| Admin | per user | unlimited | — | — |

**Rate limit by endpoint:**
- Auth endpoints (login, register): much stricter than defaults
- Read endpoints: generous (data is cheap to serve)
- Write endpoints: moderate
- Expensive endpoints (export, bulk): strict

**Algorithm:**
- [Token bucket / Sliding window / Fixed window]
- Why this choice for this use case

**Implementation:**
- Storage: Redis (single source of truth, TTL-based cleanup)
- Responses: 429 Too Many Requests + Retry-After header + X-RateLimit-* headers
- Distributed: same Redis instance for all app servers

Show: Redis key schema + rate limiter middleware code.
```
