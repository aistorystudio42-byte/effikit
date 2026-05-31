<!-- @keywords: database performance, slow query, N+1, index, query optimization, EXPLAIN, postgres tuning -->
<!-- @domain: Database Performance Prompts -->

# Database Performance Prompts

## Query Plan Analysis

```
Analyze this PostgreSQL query plan and optimize.

**The query:**
[paste SQL]

**EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) output:**
[paste]

**How to read the output:**

**Node costs:**
- cost=0.00..X.XX: estimated startup cost..total cost
- rows=N: estimated row count
- actual time=X..Y: actual ms
- actual rows=N: actual row count
- Buffers: shared hit=N (from cache), shared read=N (from disk)

**Red flags:**
- Seq Scan on table with >10k rows + Filter removing many rows → missing index
- actual rows >> estimated rows → stale statistics (run ANALYZE)
- Sort with external sort → insufficient work_mem
- Hash Join with large batches → might benefit from index nested loop
- Shared read >> shared hit → data not in cache (cold cache or too large)

**For each expensive node:**
- What operation it's doing
- Why it's slow
- Exact fix (index DDL, query rewrite, config change)
- Expected plan change after fix

```sql
-- After your fix, verify improvement:
EXPLAIN (ANALYZE, BUFFERS)
[paste fixed query]
-- Compare: Seq Scan → Index Scan, actual time should drop
```
```

---

## Index Design Workshop

```
Design indexes for these access patterns.

**Table schema:**
[paste CREATE TABLE]

**Access patterns (with frequency):**

Pattern 1 — [60%]: [describe: e.g., "find all published posts for a user, sorted by date"]
Query: SELECT ... FROM posts WHERE user_id=$1 AND status='published' ORDER BY created_at DESC LIMIT 20

Pattern 2 — [25%]: [describe]
Query: ...

Pattern 3 — [10%]: [describe]
Query: ...

Pattern 4 — [5%]: [describe]
Query: ...

**Index design for each:**

Pattern 1:
```sql
-- Covers filter (user_id, status) + sort (created_at) + returns needed columns without table access
CREATE INDEX CONCURRENTLY posts_user_published 
  ON posts (user_id, status, created_at DESC)
  INCLUDE (id, title, slug)  -- avoid table lookup for list view
  WHERE status = 'published'; -- partial: only index relevant rows (smaller, faster)
```

**Index selectivity analysis:**
- user_id selectivity: [1/N — good if N is large]
- status selectivity: [1/3 if 3 possible values — less selective, but helps with partial index]
- Combined: highly selective — index will be used

**Write overhead analysis:**
Each index = additional write cost on INSERT/UPDATE/DELETE.
Given [X reads : Y writes], this trade-off is [acceptable / risky].

Design all indexes for the patterns described.
```

---

## Slow Query Log Analysis

```
Analyze these slow queries and fix them.

**Slow query log:**
[paste pg_stat_statements output or slow query log]

**For each slow query:**

1. **Parse the query:** What is it trying to do?

2. **Identify the pattern:**
   - Is it an N+1? (same shape query appearing N times)
   - Is it missing WHERE clause (full table scan)?
   - Is it a large JOIN with no index?
   - Is it doing aggregation on a raw table (use materialized view)?

3. **Get EXPLAIN:** Ask user to run EXPLAIN ANALYZE on the worst offender

4. **Fix options:**
   - Add index
   - Rewrite query (subquery → JOIN, multiple queries → single JOIN)
   - Add cache layer
   - Add pagination/limit
   - Create materialized view for aggregate

5. **Verify:** EXPLAIN after fix shows improvement

**Top 5 slow queries from the log:**
[paste queries]

Analyze and provide fixes in order of impact.
```

---

## Read Replica Strategy

```
Design a read replica routing strategy for: [application]

**Current setup:**
- Primary: [PostgreSQL / Aurora / etc.]
- Read replica(s): [N replicas, replication lag: X ms]

**Query routing rules:**

**Must go to primary:**
- All writes (INSERT, UPDATE, DELETE)
- Reads immediately after a write (replication lag would cause stale read)
- Reads requiring absolute consistency (payment status, inventory count)
- Admin operations

**Can go to replica:**
- Public content reads (blog posts, product listings)
- Analytics queries
- Report generation
- Search queries (if eventual consistency is acceptable)
- Historical data queries

**Implementation:**
```typescript
// Prisma
const primaryDb = new PrismaClient({ datasources: { db: { url: PRIMARY_URL } } });
const replicaDb = new PrismaClient({ datasources: { db: { url: REPLICA_URL } } });

class DatabaseRouter {
  async query<T>(
    operation: 'read' | 'write',
    consistencyRequired: boolean,
    fn: (db: PrismaClient) => Promise<T>
  ): Promise<T> {
    if (operation === 'write' || consistencyRequired) {
      return fn(primaryDb);
    }
    return fn(replicaDb);
  }
}

// Usage
const posts = await db.query('read', false, 
  (db) => db.posts.findMany({ where: { status: 'published' } })
);
```

**Replication lag handling:**
```typescript
// After a write, use primary for N ms to avoid stale reads
async function createPostAndRedirect(data) {
  const post = await primaryDb.posts.create({ data });
  
  // Flag session to use primary for 5 seconds
  await redis.setex(`use-primary:${sessionId}`, 5, '1');
  
  return redirect(`/posts/${post.slug}`);
}
```

Design for: [your specific read/write ratio and consistency requirements].
```

---

## Batch Processing Optimization

```
Optimize this batch processing job for performance.

**Job description:**
[describe what the batch job does — data processing / report generation / 
notifications / data migration]

**Current performance:**
- Records to process: [N]
- Current duration: [X hours]
- Target duration: [Y hours]

**Optimization strategies:**

**1. Chunking and parallelization:**
```typescript
async function processBatchParallel(
  items: string[],
  batchSize: number,
  concurrency: number,
  processor: (batch: string[]) => Promise<void>
) {
  const chunks = chunk(items, batchSize); // lodash chunk
  
  // Process N chunks at a time concurrently
  for (let i = 0; i < chunks.length; i += concurrency) {
    const parallel = chunks.slice(i, i + concurrency);
    await Promise.all(parallel.map(processor));
    
    // Progress logging
    console.log(`Processed ${Math.min((i + concurrency) * batchSize, items.length)} / ${items.length}`);
  }
}
```

**2. Database batch operations:**
```typescript
// ❌ One query per item
for (const item of items) {
  await db.processed.create({ data: transform(item) });
}

// ✅ Batch insert — much faster
const transformed = items.map(transform);
await db.processed.createMany({ data: transformed, skipDuplicates: true });
```

**3. Memory-efficient streaming:**
```typescript
// Don't load all N records at once
async function* streamRecords(batchSize: number) {
  let cursor: string | undefined;
  while (true) {
    const batch = await db.records.findMany({
      take: batchSize,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { id: 'asc' },
    });
    if (batch.length === 0) break;
    yield batch;
    cursor = batch.at(-1)!.id;
  }
}

for await (const batch of streamRecords(1000)) {
  await processBatch(batch);
}
```

Optimize for: [your specific batch job].
```
