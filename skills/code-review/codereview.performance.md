<!-- @keywords: code review, performance review, N+1, query optimization, memory leak, complexity -->

# Code Review — Performance Review

## Performance Review Philosophy

Don't flag every suboptimal line — flag things that will actually hurt users. A micro-optimization in a function called once per day is noise. A missing index on a query called 10,000 times per minute is critical.

```
Flag:
  ✓ N+1 queries (database round trip per item in a list)
  ✓ Missing indexes on filtered/sorted columns
  ✓ Unbounded queries (no LIMIT on large tables)
  ✓ Synchronous blocking operations in async handlers
  ✓ Memory leaks (closures retaining large data)
  ✓ Algorithmic complexity issues (O(n²) on large inputs)

Don't flag:
  ✗ `for` vs `forEach` (negligible difference)
  ✗ String concatenation vs template literals (JS engine handles it)
  ✗ Micro-benchmarks without profiling data
```

---

## N+1 Query Detection

The most common and impactful backend performance issue.

```typescript
// RED FLAG: Database call inside a loop

// Pattern 1: explicit loop
const posts = await Post.findAll();
for (const post of posts) {
  post.author = await User.findById(post.authorId); // ✗ N+1
}

// Pattern 2: array method with async callback
const postsWithAuthors = await Promise.all(
  posts.map(post => User.findById(post.authorId)) // ✗ N+1 (N parallel, but still N queries)
);

// Fix: batch load
const posts = await Post.findAll();
const authorIds = [...new Set(posts.map(p => p.authorId))];
const authors = await User.findAll({ where: { id: { $in: authorIds } } });
const authorMap = new Map(authors.map(a => [a.id, a]));
posts.forEach(p => { p.author = authorMap.get(p.authorId); }); // ✓ 2 queries total

// Pattern 3: ORM with eager loading
// Wrong: lazy loads by default
const posts = await Post.findAll(); // + N queries when .author accessed

// Correct: explicit eager load
const posts = await Post.findAll({
  include: [{ model: User, as: 'author', attributes: ['id', 'name', 'avatarUrl'] }]
}); // ✓ single JOIN query
```

---

## Unbounded Queries

```typescript
// RED FLAG: No limit on potentially large result sets

// Vulnerable to huge memory usage and slow response
const allUsers = await db.query('SELECT * FROM users'); // ✗ — could be millions
const allOrders = await Order.findAll(); // ✗

// Safe: always paginate or limit
const users = await db.query('SELECT * FROM users LIMIT $1 OFFSET $2', [limit, offset]); // ✓
const orders = await Order.findAll({ limit: 100, offset: page * 100 }); // ✓

// RED FLAG: Large WHERE IN with user-provided list
const ids = req.body.ids; // attacker sends 100,000 IDs
await User.findAll({ where: { id: ids } }); // ✗

// Safe: cap the input
const ids = req.body.ids.slice(0, 100); // limit to 100
await User.findAll({ where: { id: ids } }); // ✓
```

---

## Missing Index Detection

```typescript
// RED FLAG: Filter or sort on non-indexed column in a query that will grow

// How to spot: look for WHERE/ORDER BY conditions on columns that are not:
//   - primary keys (id)
//   - columns with UNIQUE constraint
//   - explicitly indexed

// Example: this will be slow as the table grows
await Order.findAll({
  where: { status: 'pending', userId: req.user.id },
  order: [['createdAt', 'DESC']],
});

// Review question: "Do we have an index on (userId, status)?"
// If not, add in migration:
// CREATE INDEX CONCURRENTLY idx_orders_user_status ON orders (user_id, status);

// Check existing indexes in review:
await db.query(`
  SELECT indexname, indexdef
  FROM pg_indexes
  WHERE tablename = 'orders'
`);
```

---

## Memory Leak Patterns

```typescript
// RED FLAG: Event listeners added without removal
class DataManager {
  subscribe() {
    eventEmitter.on('data', this.handleData); // ✗ — never removed
  }
}

// Safe: return cleanup function or use once()
class DataManager {
  subscribe() {
    const handler = this.handleData.bind(this);
    eventEmitter.on('data', handler);
    return () => eventEmitter.off('data', handler); // cleanup function
  }
}

// React equivalent
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize); // ✓
}, []);

// RED FLAG: Growing cache with no eviction
const cache = new Map<string, HeavyObject>();
function getOrCompute(key: string): HeavyObject {
  if (!cache.has(key)) cache.set(key, compute(key));
  return cache.get(key)!; // ✗ — cache grows forever
}

// Safe: bounded cache with LRU or TTL
const cache = new LRUCache<string, HeavyObject>({ max: 1000 });
const cache = new TTLCache<string, HeavyObject>({ ttl: 5 * 60 * 1000 });
```

---

## Algorithmic Complexity

```typescript
// RED FLAG: O(n²) or worse on collections that can be large

// Nested loop — O(n²)
for (const item of items) {
  for (const other of items) { // ✗
    if (item.categoryId === other.id) { ... }
  }
}

// Fix: O(n) with Map lookup
const itemMap = new Map(items.map(i => [i.id, i]));
for (const item of items) {
  const category = itemMap.get(item.categoryId); // ✓ O(1) lookup
}

// RED FLAG: Array.includes inside a loop — O(n²)
const validIds = await getValidIds(); // returns array of 10,000 IDs
for (const item of items) {
  if (validIds.includes(item.id)) { ... } // ✗ O(n) per item
}

// Fix: O(n) with Set
const validIdSet = new Set(await getValidIds());
for (const item of items) {
  if (validIdSet.has(item.id)) { ... } // ✓ O(1) per item
}
```

---

## Synchronous Blocking in Async Context

```typescript
// RED FLAG: Synchronous heavy computation in async request handler
// This blocks the event loop — all other requests wait

app.get('/report', async (req, res) => {
  const data = await fetchData();
  const report = generateHeavyReport(data); // ✗ CPU-intensive, blocks event loop
  res.json(report);
});

// Fix options:
// 1. Offload to worker thread (CPU-intensive)
import { Worker } from 'worker_threads';
const report = await runInWorker('generate-report', data);

// 2. Async queue (long operations)
const jobId = await reportQueue.add({ dataId: data.id });
res.json({ jobId, status: 'processing' }); // return immediately, poll for result

// RED FLAG: fs.readFileSync in an Express handler
app.get('/config', (req, res) => {
  const config = fs.readFileSync('/etc/config.json'); // ✗ blocks event loop
  res.json(JSON.parse(config));
});

// Fix: async version
app.get('/config', async (req, res) => {
  const config = await fs.promises.readFile('/etc/config.json'); // ✓
  res.json(JSON.parse(config));
});
```

---

## Performance Review Checklist

- [ ] No N+1 queries (DB calls inside loops)
- [ ] All collection queries have LIMIT/pagination
- [ ] WHERE/ORDER BY columns in hot queries have indexes
- [ ] No growing unbounded caches (eviction policy defined)
- [ ] No CPU-intensive sync operations in async request handlers
- [ ] Array lookups on large collections use Set/Map instead of includes/find
- [ ] Large data transfers compressed (gzip/brotli on API responses)
