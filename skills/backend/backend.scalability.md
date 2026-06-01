<!-- @keywords: backend scalability patterns, offload to queue and worker, rate limiting implementation, application-level caching, scale a node backend -->

# Backend — Scalability Patterns

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to scalability.

## Principles

### Scaling Mindset
Before scaling, measure. Most systems don't need to scale — they need to be fixed. A slow query is not a scaling problem. A missing index is not a scaling problem. Only after optimizing the single instance should you think about horizontal scaling.

```
Step 1: Profile — where is the actual bottleneck?
Step 2: Optimize — fix the root cause (index, query, algorithm)
Step 3: Cache — reduce repeated work
Step 4: Scale — if still not enough, add instances
```

---

### Background Job Processing
Heavy operations should never block the HTTP response.

```typescript
// Job definition
interface SendEmailJob {
  type: 'send-email';
  payload: {
    to: string;
    template: string;
    data: Record<string, unknown>;
  };
}

// Queue producer
class OrderService {
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const order = await this.orderRepo.create(dto);
    
    // Don't await — push to queue and return immediately
    await this.queue.push({
      type: 'send-email',
      payload: { to: dto.userEmail, template: 'order-confirmation', data: { orderId: order.id } }
    });

    return order; // Response in ~10ms, not 500ms
  }
}

// Queue consumer — runs in separate worker process
class EmailWorker {
  async process(job: SendEmailJob): Promise<void> {
    const html = await this.templateService.render(job.payload.template, job.payload.data);
    await this.emailProvider.send({ to: job.payload.to, html });
  }
}

// Bull/BullMQ implementation
const emailQueue = new Queue('email', { connection: redisConfig });
const emailWorker = new Worker('email', async (job) => {
  await emailWorkerInstance.process(job.data);
}, { connection: redisConfig, concurrency: 5 });
```

**Jobs that should always be async:** Email sending, PDF generation, image processing, webhook delivery, heavy reports, third-party API calls with SLA uncertainty.

---

### Rate Limiting
```typescript
// Token bucket algorithm — allows bursts, limits sustained rate
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,
    private readonly refillRate: number, // tokens per second
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  consume(count = 1): boolean {
    this.refill();
    if (this.tokens < count) return false;
    this.tokens -= count;
    return true;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// Distributed rate limiting with Redis
class DistributedRateLimiter {
  async isAllowed(identifier: string, limit: number, windowSeconds: number): Promise<boolean> {
    const key = `ratelimit:${identifier}`;
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, windowSeconds);
    }
    
    return current <= limit;
  }
}
```

---

### Database Connection Pooling
```typescript
// Never create a new connection per request
// Pool connections and reuse them

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  max: 20,           // maximum pool size
  min: 5,            // keep at least 5 connections alive
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

// Health check — detect pool exhaustion early
const checkDbHealth = async (): Promise<boolean> => {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    return true;
  } finally {
    client.release();
  }
};
```

---

### Graceful Shutdown
```typescript
const server = app.listen(port);

const shutdown = async (signal: string) => {
  console.log(`${signal} received, starting graceful shutdown`);
  
  // Stop accepting new connections
  server.close(async () => {
    // Wait for in-flight requests to complete
    await waitForActiveRequests();
    
    // Drain job queues
    await emailQueue.close();
    
    // Close DB pool
    await pool.end();
    
    process.exit(0);
  });

  // Force exit if shutdown takes too long
  setTimeout(() => process.exit(1), 30_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

---

## Decision Framework

### Cache Layer Decision

```
Data changes rarely + read often     → Long TTL cache (hours/days)
Data changes frequently + read often → Short TTL cache (seconds/minutes)
Data is user-specific                → Per-user cache key
Data is computed / expensive         → Memoize with TTL
Data is real-time critical           → Don't cache
```

### Redis Caching Implementation
```typescript
class CacheService {
  constructor(private readonly redis: Redis) {}

  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number,
  ): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached) as T;

    const data = await fetcher();
    await this.redis.setex(key, ttlSeconds, JSON.stringify(data));
    return data;
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) await this.redis.del(...keys);
  }
}

// Usage in service
class ProductService {
  async getProduct(id: string): Promise<Product> {
    return this.cache.getOrFetch(
      `product:${id}`,
      () => this.productRepo.findById(id),
      300, // 5 minutes
    );
  }

  async updateProduct(id: string, data: UpdateProductDto): Promise<Product> {
    const product = await this.productRepo.update(id, data);
    await this.cache.invalidatePattern(`product:${id}*`);
    return product;
  }
}
```

### Cache Invalidation Strategies
```typescript
// Strategy 1: TTL-based — simple, eventually consistent
await redis.setex(key, 60, JSON.stringify(data));

// Strategy 2: Event-based — strong consistency
eventBus.subscribe('product.updated', async (event) => {
  await cache.delete(`product:${event.productId}`);
});

// Strategy 3: Write-through — update cache on every write
async updateUser(id: string, data: UpdateUserDto): Promise<User> {
  const user = await this.userRepo.update(id, data);
  await this.cache.set(`user:${id}`, user, 600);
  return user;
}
```

---

## Anti-Patterns

- Over-engineering the solution.
- Ignoring context and copying blindly.
- Mixing concerns unnecessarily.

## Example in Action

- [ ] Slow queries identified and indexed
- [ ] Cache layer in place for hot data
- [ ] Heavy operations moved to background jobs
- [ ] Rate limiting applied to public endpoints
- [ ] Database connection pool configured (not default unlimited)
- [ ] Health check endpoint responds < 100ms
- [ ] Graceful shutdown handles in-flight requests
- [ ] Stateless application (session in Redis, not memory)
