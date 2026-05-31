<!-- @keywords: backend performance, API latency, throughput, Node.js performance, profiling, bottleneck, async -->
<!-- @domain: Backend Performance Prompts -->

# Backend Performance Prompts

## API Latency Investigation

```
Investigate and fix high API latency for: [endpoint]

**Current performance:**
- P50: [X ms]
- P95: [X ms]
- P99: [X ms]
- Target P99: [Y ms]

**Profiling approach:**

**Step 1 — Add timing instrumentation:**
```typescript
export async function GET(req: Request) {
  const timings: Record<string, number> = {};
  const start = performance.now();
  
  // Time each step
  const dbStart = performance.now();
  const user = await getUser(userId);
  timings.db_getUser = performance.now() - dbStart;
  
  const cacheStart = performance.now();
  const posts = await getPostsFromCache(userId);
  timings.cache_getPosts = performance.now() - cacheStart;
  
  const total = performance.now() - start;
  
  // Log if slow
  if (total > 200) {
    logger.warn('Slow request', { path: req.url, total, timings });
  }
  
  return Response.json(data, {
    headers: { 'Server-Timing': Object.entries(timings)
      .map(([k, v]) => `${k};dur=${v.toFixed(1)}`).join(', ') }
  });
}
```

**Step 2 — Find the bottleneck:**
Look at which timing is >80% of total. That's your target.

**Common bottlenecks:**

| Bottleneck | Symptom | Fix |
|-----------|---------|-----|
| N+1 queries | db_query high, N separate queries | Join or DataLoader |
| Missing index | single query >50ms | EXPLAIN ANALYZE + add index |
| No pagination | large dataset returned | Add LIMIT/cursor |
| Synchronous ops | blocking event loop | Make async or Worker |
| No caching | same data computed repeatedly | Redis cache with TTL |
| External API call | external_request >200ms | Cache response / parallelize |
| Connection pool wait | pool_wait >10ms | Increase pool size or add PgBouncer |

Fix for: [your specific bottleneck].
```

---

## Throughput Optimization

```
Optimize throughput for: [service / endpoint]

**Current:**
- Throughput: [N req/sec]
- Target: [M req/sec]
- Bottleneck hypothesis: [CPU / DB / network / external API]

**Load testing setup:**
```bash
# k6 load test
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },   // ramp up to 100 VUs
    { duration: '1m', target: 100 },    // stay at 100
    { duration: '30s', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<500'],   // P99 must be <500ms
    http_req_failed: ['rate<0.01'],     // error rate <1%
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/posts');
  check(res, { 'status was 200': (r) => r.status === 200 });
  sleep(1);
}
EOF
k6 run load-test.js
```

**Throughput improvements:**

**1. Parallelize independent async operations:**
```typescript
// ❌ Sequential — each awaits the previous
const user = await getUser(id);
const posts = await getPosts(id);
const stats = await getStats(id);

// ✅ Parallel — all run simultaneously
const [user, posts, stats] = await Promise.all([
  getUser(id),
  getPosts(id),
  getStats(id),
]);
```

**2. Move CPU work off main thread:**
```typescript
import { Worker } from 'worker_threads';

// Heavy computation → separate worker
function processInWorker(data: Buffer): Promise<Result> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./heavy-processor.js', { workerData: data });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}
```

**3. Streaming responses for large payloads:**
```typescript
export async function GET() {
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of queryLargeDataset()) {
        controller.enqueue(new TextEncoder().encode(JSON.stringify(chunk) + '\n'));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson' },
  });
}
```

Fix for: [your specific throughput scenario].
```

---

## Caching Strategy Implementation

```
Implement caching for: [endpoint / service]

**What to cache:**
[describe the data — how expensive is it? How often does it change?]

**Cache strategy selection:**

| Data type | Changes | Strategy |
|-----------|---------|---------|
| User profile | On user action | Cache-aside, invalidate on update |
| Public content | Infrequent | TTL-based, CDN + server cache |
| Dashboard aggregates | Every N minutes | TTL-based (short) |
| Search results | Frequently | TTL-based + ETags |
| User permissions | On admin action | Cache with explicit invalidation |

**Redis implementation:**
```typescript
import { redis } from '@/lib/redis';

const CACHE_TTL = 300; // 5 minutes

export async function getUserWithCache(userId: string): Promise<User> {
  const cacheKey = `user:${userId}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as User;
  
  // Cache miss — fetch from DB
  const user = await db.users.findById(userId);
  if (!user) throw new NotFoundError(`User ${userId} not found`);
  
  // Store in cache (don't await — don't block response)
  redis.setex(cacheKey, CACHE_TTL, JSON.stringify(user)).catch(
    (err) => logger.error('Cache write failed', { err, cacheKey })
  );
  
  return user;
}

// Invalidation on update
export async function updateUser(userId: string, data: Partial<User>) {
  const updated = await db.users.update(userId, data);
  await redis.del(`user:${userId}`); // invalidate cache
  return updated;
}
```

**Cache stampede prevention (many simultaneous cache misses):**
```typescript
// Use mutex to prevent multiple concurrent cache-miss DB queries
const mutex = new Map<string, Promise<User>>();

async function getUserSafe(userId: string): Promise<User> {
  const cacheKey = `user:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // If already fetching this key, wait for it
  if (mutex.has(cacheKey)) return mutex.get(cacheKey)!;
  
  const promise = fetchAndCache(userId, cacheKey).finally(
    () => mutex.delete(cacheKey)
  );
  mutex.set(cacheKey, promise);
  return promise;
}
```

Implement for: [your specific caching requirements].
```

---

## Database Query Performance

```
Optimize these queries for high-traffic scenarios.

**Queries:**
[paste slow queries or ORM code]

**Context:**
- Table sizes: [N rows per table]
- Load: [N reads/sec, N writes/sec]
- Current query time: [X ms]

**Optimization techniques:**

**DataLoader pattern (batch N+1 queries):**
```typescript
import DataLoader from 'dataloader';

// Single batch query per request
const userLoader = new DataLoader<string, User>(
  async (userIds) => {
    const users = await db.users.findMany({
      where: { id: { in: [...userIds] } },
    });
    // Return in same order as input
    return userIds.map(id => users.find(u => u.id === id) ?? null);
  },
  { cache: true } // cache within request lifetime
);

// In resolver — looks like N queries, actually batched into 1
const author = await userLoader.load(post.authorId);
```

**Covering indexes for frequently-used projections:**
```sql
-- If this query runs millions of times per day:
SELECT id, title, created_at FROM posts 
WHERE user_id = $1 AND status = 'published'
ORDER BY created_at DESC LIMIT 20;

-- This index covers it completely (no table heap access needed)
CREATE INDEX CONCURRENTLY posts_list_covering
  ON posts (user_id, status, created_at DESC)
  INCLUDE (id, title);
```

**Materialized views for complex aggregations:**
```sql
CREATE MATERIALIZED VIEW user_stats AS
SELECT 
  user_id,
  COUNT(*) as post_count,
  MAX(created_at) as last_post_at,
  SUM(view_count) as total_views
FROM posts
WHERE status = 'published'
GROUP BY user_id;

CREATE UNIQUE INDEX ON user_stats(user_id);

-- Refresh on schedule (non-blocking)
REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats;
```

Optimize for: [your specific query patterns].
```

---

## Memory Efficiency

```
Reduce memory usage in: [service / operation]

**Current problem:**
[high RSS / heap out of bounds / GC thrashing / OOM kills]

**Profiling:**
```bash
# Node.js heap snapshot
node --expose-gc --inspect server.js
# Then in Chrome DevTools: Memory → Heap Snapshot

# Or programmatic
const v8 = require('v8');
const heap = v8.getHeapStatistics();
console.log({ heapUsed: heap.used_heap_size, heapTotal: heap.heap_size_limit });
```

**Memory optimization patterns:**

**1. Stream instead of buffer:**
```typescript
// ❌ Loads entire file/response into memory
const data = await fs.promises.readFile('large-file.csv'); // 500MB in memory

// ✅ Stream in chunks — constant memory usage
const stream = fs.createReadStream('large-file.csv');
const rl = readline.createInterface({ input: stream });
for await (const line of rl) {
  await processLine(line);
}
```

**2. Cursor-based pagination instead of loading all:**
```typescript
// ❌ All N rows loaded into memory at once
const allPosts = await db.posts.findMany(); // 100k rows

// ✅ Process in batches
async function* streamPosts(batchSize = 1000) {
  let cursor: string | undefined;
  while (true) {
    const batch = await db.posts.findMany({
      take: batchSize,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
    });
    if (batch.length === 0) break;
    yield batch;
    cursor = batch[batch.length - 1].id;
  }
}
```

**3. Release references explicitly:**
```typescript
// Large objects should go out of scope ASAP
async function processReport() {
  let largeData = await fetchLargeDataset();
  const summary = computeSummary(largeData);
  largeData = null!; // allow GC before next async operation
  
  await saveSummary(summary);
}
```

Apply to: [your specific memory issue].
```
