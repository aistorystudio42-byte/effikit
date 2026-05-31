<!-- @keywords: database performance, query optimization, indexing, connection pool, slow query, PostgreSQL -->

# Performance — Database Optimization

## Database Performance Hierarchy

Fix in this order — each level is cheaper than the next:

```
1. Query optimization    → fix the query (index, rewrite, paginate)
2. Caching               → avoid the query entirely for hot data
3. Connection pooling    → reduce connection overhead
4. Read replicas         → scale reads horizontally
5. Partitioning          → scale data size
6. Sharding              → scale writes (last resort)
```

---

## Finding Slow Queries

```sql
-- Enable pg_stat_statements extension first
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slowest queries by average execution time
SELECT
  calls,
  round(mean_exec_time::numeric, 2) AS avg_ms,
  round(total_exec_time::numeric / 1000, 2) AS total_sec,
  round(stddev_exec_time::numeric, 2) AS stddev_ms,
  rows / calls AS avg_rows,
  left(query, 100) AS query_preview
FROM pg_stat_statements
WHERE calls > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Find queries with high total time (frequent × slow)
SELECT
  calls,
  round(total_exec_time::numeric / 1000, 2) AS total_sec,
  round(mean_exec_time::numeric, 2) AS avg_ms,
  left(query, 100) AS query_preview
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Tables with most sequential scans (missing indexes)
SELECT
  relname AS table_name,
  seq_scan,
  idx_scan,
  n_live_tup AS live_rows,
  round(100.0 * seq_scan / nullif(seq_scan + idx_scan, 0), 1) AS seq_scan_pct
FROM pg_stat_user_tables
WHERE n_live_tup > 10000
  AND seq_scan > idx_scan
ORDER BY seq_scan DESC;
```

---

## EXPLAIN ANALYZE — Reading the Plan

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.email, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.email
HAVING COUNT(o.id) > 0
ORDER BY order_count DESC
LIMIT 50;
```

```
Reading output:
  Seq Scan        → full table scan. On large table = needs index
  Index Scan      → uses B-tree index. Good.
  Index Only Scan → all data from index, no heap access. Best case.
  Bitmap Heap Scan → used when returning many rows via index. Acceptable.
  Hash Join       → builds hash table. Good for large sets.
  Nested Loop     → per outer row, scan inner. Only good for tiny outer set.

Numbers to check:
  Rows=100 Actual Rows=50000 → bad estimate → run ANALYZE on table
  Buffers: hit=50 read=2000  → many disk reads → consider index or caching
  actual time=0.050..2400    → 2.4 seconds for this node → bottleneck here
```

---

## Index Strategy

```sql
-- Rule: index columns that appear in WHERE, JOIN ON, or ORDER BY on large tables
-- Cost: every index slows INSERT/UPDATE/DELETE and uses disk space

-- Basic index on frequently filtered column
CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders (user_id);
CREATE INDEX CONCURRENTLY idx_orders_status ON orders (status);

-- Composite: column order matters — most selective or most used first
-- Covers: WHERE user_id = ? AND status = ?
-- Also covers: WHERE user_id = ? (prefix match)
-- Does NOT cover: WHERE status = ? alone (not a prefix match)
CREATE INDEX CONCURRENTLY idx_orders_user_status ON orders (user_id, status);

-- Partial: index only the rows you actually query
-- Much smaller than full index, fits in memory better
CREATE INDEX CONCURRENTLY idx_orders_pending ON orders (created_at)
  WHERE status = 'pending';

-- Covering: include columns to avoid heap lookup entirely
-- Query: SELECT status, total_cents FROM orders WHERE user_id = ?
CREATE INDEX CONCURRENTLY idx_orders_user_cover ON orders (user_id)
  INCLUDE (status, total_cents, created_at);
-- → Index Only Scan: no table access needed

-- Expression: index on computed value
-- Query: WHERE lower(email) = ?
CREATE INDEX CONCURRENTLY idx_users_email_lower ON users (lower(email));

-- Remove unused indexes — they slow writes and waste space
SELECT indexname, idx_scan AS times_used,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## Query Rewriting Patterns

```sql
-- Pattern: EXISTS instead of IN for large subqueries
-- EXISTS short-circuits on first match — faster for large subqueries

-- Slower: IN with subquery (materializes all rows)
SELECT * FROM users
WHERE id IN (SELECT user_id FROM premium_subscriptions WHERE active = true);

-- Faster: EXISTS (stops at first match)
SELECT * FROM users u
WHERE EXISTS (
  SELECT 1 FROM premium_subscriptions ps
  WHERE ps.user_id = u.id AND ps.active = true
);

-- Pattern: window function instead of correlated subquery
-- Slower: correlated subquery (runs once per row)
SELECT
  id,
  (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count
FROM users u;

-- Faster: JOIN + aggregate
SELECT u.id, COALESCE(o.order_count, 0) AS order_count
FROM users u
LEFT JOIN (
  SELECT user_id, COUNT(*) AS order_count
  FROM orders
  GROUP BY user_id
) o ON o.user_id = u.id;

-- Pattern: Batch update instead of individual row updates
-- Slow: loop calling UPDATE per row (N round trips)
for (const userId of userIds) {
  await db.query('UPDATE users SET processed = true WHERE id = $1', [userId]);
}

-- Fast: single UPDATE with ANY
await db.query(
  'UPDATE users SET processed = true WHERE id = ANY($1::uuid[])',
  [userIds]
);
```

---

## Connection Pool Tuning

```typescript
// PostgreSQL max_connections default: 100
// Every connection uses ~5-10MB RAM
// With 10 app instances × 10 pool size = 100 connections = DB at max capacity

// Rule of thumb: pool_size = (DB max_connections / app_instances) × 0.8
// With 100 max_connections, 5 app instances: (100/5) × 0.8 = 16 per instance

const pool = new Pool({
  max: 16,           // max connections from this instance
  min: 4,            // keep warm connections ready
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 3_000, // fail fast if pool exhausted
  statement_timeout: 30_000,       // kill queries running > 30s
  query_timeout: 30_000,
});

// PgBouncer: put between app and Postgres for true connection multiplexing
// Each app connects to PgBouncer, which maintains small pool to Postgres
// Allows 10,000 app connections → 50 actual Postgres connections
```

---

## Vacuum and Statistics

```sql
-- Dead row bloat slows queries and wastes space
-- Check bloat
SELECT relname, n_dead_tup, n_live_tup,
       round(100.0 * n_dead_tup / nullif(n_live_tup + n_dead_tup, 0), 1) AS dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY dead_pct DESC;

-- Manual VACUUM for immediate cleanup (autovacuum may be too slow after bulk delete)
VACUUM ANALYZE orders;

-- Update statistics for query planner after large data changes
ANALYZE users;

-- Check if autovacuum is running
SELECT relname, last_vacuum, last_autovacuum, last_analyze, last_autoanalyze
FROM pg_stat_user_tables
WHERE relname = 'orders';
```

---

## Database Performance Checklist

- [ ] Slow queries identified via `pg_stat_statements`
- [ ] EXPLAIN ANALYZE run on all queries > 100ms
- [ ] All foreign keys indexed
- [ ] Hot queries use covering indexes (Index Only Scan)
- [ ] Partial indexes on frequently filtered subsets (status, deleted_at)
- [ ] Unused indexes removed (check `pg_stat_user_indexes`)
- [ ] Connection pool sized correctly (not unlimited, not too small)
- [ ] `statement_timeout` set to prevent runaway queries
- [ ] AUTOVACUUM not lagging (no large dead tuple counts)
- [ ] Statistics current after large batch operations (ANALYZE)
