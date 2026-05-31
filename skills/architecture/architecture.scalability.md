<!-- @keywords: scalability, system design, load balancing, caching, horizontal scaling, bottlenecks, capacity -->

# Architecture — Scalability Design

## Scalability vs Performance

```
Performance:   how fast a single request is processed
Scalability:   how the system handles more requests / more data

A fast but unscalable system:
  → Works great for 100 users, falls over at 10,000

A scalable but slow system:
  → Can handle 10,000 users but each one waits 5 seconds

Goal: both. Start with performance, then design for scale.
```

---

## Identifying Bottlenecks Before They Happen

```typescript
// Capacity planning questions for every component:

// Database:
// - How many writes per second can PostgreSQL handle? (~5,000-10,000 on commodity hardware)
// - What's the data growth rate? When will we hit disk limits?
// - Are any queries doing full table scans on growing tables?

// Application:
// - Is the app stateless? (can we add more instances?)
// - What's the memory usage per request? (affects instance sizing)
// - Are there any global locks or in-process caches?

// External APIs:
// - What are the rate limits? (Stripe: 100/s, SendGrid: 600/min)
// - Do we have retries and queuing for rate limit handling?

// Network:
// - What's the payload size? (large JSON responses → bandwidth cost)
// - Are we compressing responses?
```

---

## Caching Architecture

```typescript
// Multi-level cache strategy

class ProductCacheService {
  // L1: In-process memory (fastest, smallest, process-local)
  private localCache = new LRUCache<string, Product>({
    max: 500,
    ttl: 60_000, // 1 minute — short because it's not shared
  });

  // L2: Redis (shared across instances, fast, medium size)
  private redisCache: Redis;

  // L3: Database (ground truth, slowest, unlimited)
  private productRepo: ProductRepository;

  async getProduct(id: string): Promise<Product | null> {
    // Check L1 first
    const local = this.localCache.get(id);
    if (local) return local;

    // Check L2
    const cached = await this.redisCache.get(`product:${id}`);
    if (cached) {
      const product = JSON.parse(cached) as Product;
      this.localCache.set(id, product); // populate L1
      return product;
    }

    // L3: database
    const product = await this.productRepo.findById(id);
    if (product) {
      // Populate both cache levels
      await this.redisCache.set(`product:${id}`, JSON.stringify(product), 'EX', 300);
      this.localCache.set(id, product);
    }
    return product;
  }

  async invalidate(id: string): Promise<void> {
    this.localCache.delete(id);
    await this.redisCache.del(`product:${id}`);
  }
}
```

---

## Read Scaling

```typescript
// Read replicas — route read queries to replica, writes to primary
class DatabaseRouter {
  constructor(
    private readonly primary: Pool,    // writes
    private readonly replica: Pool,    // reads
  ) {}

  async query<T>(sql: string, params: unknown[], options: { write?: boolean } = {}): Promise<T[]> {
    const pool = options.write ? this.primary : this.replica;
    const result = await pool.query(sql, params);
    return result.rows;
  }
}

// Usage in repository
class ProductRepository {
  async findById(id: string): Promise<Product | null> {
    return this.db.query('SELECT * FROM products WHERE id = $1', [id]);
    // Routed to replica automatically (default = read)
  }

  async create(data: CreateProductDto): Promise<Product> {
    return this.db.query('INSERT INTO products ...', [...], { write: true });
    // Explicitly routed to primary
  }
}
```

---

## Write Scaling — Command Queue Pattern

```typescript
// Decouple write acceptance from write execution
// Accept writes instantly, process asynchronously

class OrderController {
  async createOrder(req: Request, res: Response) {
    // Validate input synchronously
    const dto = CreateOrderSchema.parse(req.body);

    // Enqueue the write — don't wait for DB
    const jobId = await this.orderQueue.add('create-order', {
      userId: req.user.id,
      dto,
      requestId: req.requestId,
    });

    // Return 202 Accepted — tell client where to check status
    res.status(202).json({
      jobId,
      statusUrl: `/api/jobs/${jobId}`,
      estimatedWait: '< 5 seconds',
    });
  }
}

// Worker: processes queue at its own pace
class OrderWorker {
  @Process('create-order')
  async process(job: Job<CreateOrderJobData>): Promise<void> {
    await this.orderService.createOrder(job.data.dto, job.data.userId);
  }
}
```

---

## Database Sharding Decision

```
Don't shard until you have to. Signs you need sharding:
  - Write throughput exceeds what primary can handle
  - Data volume exceeds what fits on largest available instance
  - Hot partitions: one row/table gets 80% of traffic

Sharding strategies:

1. Range-based (user ID 1-1M on shard 1, 1M-2M on shard 2)
  + Simple to implement
  - Hot shards if new users are all on latest shard

2. Hash-based (hash(userId) % numShards)
  + Even distribution
  - Range queries require all shards

3. Directory-based (lookup table maps entity to shard)
  + Flexible, can rebalance
  - Lookup table is a bottleneck

Alternative to sharding: Vertical partitioning
  - Split by table type (active data vs archival data)
  - Active orders in primary DB, completed orders > 1 year in separate store
  - Much simpler than horizontal sharding
```

---

## Load Balancing

```yaml
# Nginx load balancer configuration
upstream api_backend {
  least_conn;                    # route to least-busy instance
  server api-1:3000 weight=1;
  server api-2:3000 weight=1;
  server api-3:3000 weight=1;

  # Health check: remove from rotation if /health fails
  keepalive 32;
}

server {
  listen 443 ssl;

  location /api/ {
    proxy_pass http://api_backend;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Request-ID $request_id;
    proxy_read_timeout 30s;

    # Circuit breaker: fail fast if backend is down
    proxy_next_upstream error timeout http_502 http_503;
    proxy_next_upstream_tries 2;
  }

  location /static/ {
    proxy_pass https://cdn.myapp.com;
    proxy_cache_valid 200 30d;
    add_header Cache-Control "public, max-age=2592000, immutable";
  }
}
```

---

## Scalability Checklist

- [ ] App is stateless (no in-process session, no local file storage)
- [ ] Cache layer in place for hot read data (Redis)
- [ ] Background job queue for slow operations (BullMQ, SQS)
- [ ] Database read replicas for read-heavy workloads
- [ ] LIMIT on all collection queries (no unbounded reads)
- [ ] Connection pool sized appropriately (not unlimited)
- [ ] Load balancer with health checks configured
- [ ] Auto-scaling policy defined (CPU/memory thresholds)
- [ ] Capacity planning done: "at 10x current load, what breaks first?"
