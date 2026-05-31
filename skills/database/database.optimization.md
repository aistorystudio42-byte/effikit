<!-- @keywords: database performance, query optimization, index tuning, connection pool, vacuum, statistics -->

# Database — Performance Optimization

## Finding the Problem First

Never optimize what you haven't measured. The three diagnostic tools:

```sql
-- 1. Find slow queries (requires pg_stat_statements extension)
SELECT
  calls,
  mean_exec_time::numeric(10,2) AS avg_ms,
  total_exec_time::numeric(10,2) AS total_ms,
  rows / calls AS avg_rows,
  LEFT(query, 120) AS query_preview
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 2. Find tables with sequential scans on large tables
SELECT
  relname AS table_name,
  seq_scan,
  idx_scan,
  n_live_tup AS row_count,
  ROUND(100.0 * seq_scan / NULLIF(seq_scan + idx_scan, 0), 2) AS seq_scan_pct
FROM pg_stat_user_tables
WHERE n_live_tup > 10000
  AND seq_scan > idx_scan
ORDER BY seq_scan DESC;

-- 3. Find missing indexes (high sequential scan ratio)
SELECT
  schemaname,
  tablename,
  attname AS column,
  n_distinct,
  correlation
FROM pg_stats
WHERE tablename = 'orders'
ORDER BY n_distinct DESC;
```

---

## Index Tuning

### Identifying Unused Indexes
```sql
-- Indexes that haven't been used — candidates for removal
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS times_used,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Partial Indexes — Index Only What You Query
```sql
-- Only index unprocessed queue items — not the millions of processed ones
CREATE INDEX CONCURRENTLY idx_jobs_unprocessed
  ON jobs (created_at ASC)
  WHERE status = 'pending';

-- Only index active users for login queries
CREATE INDEX CONCURRENTLY idx_users_active_email
  ON users (email)
  WHERE deleted_at IS NULL AND is_active = TRUE;
```

### Covering Indexes — Avoid Table Lookups
```sql
-- Query: SELECT name, status FROM orders WHERE user_id = ?
-- Without covering index: index on user_id → then fetch name, status from table
-- With covering index: index contains all needed data — no table access

CREATE INDEX CONCURRENTLY idx_orders_user_cover
  ON orders (user_id)
  INCLUDE (status, total_cents, created_at);
-- "Index Only Scan" in EXPLAIN — no table heap access
```

### Expression Indexes
```sql
-- Query filters on lowercase email — use expression index
CREATE INDEX CONCURRENTLY idx_users_email_lower
  ON users (LOWER(email));

-- Now this query uses the index
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';
```

---

## Query Optimization Patterns

### Push Filters Down — Reduce Rows Early
```sql
-- Wrong: Join everything, then filter
SELECT u.name, o.total_cents
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE o.status = 'completed'
  AND o.created_at > NOW() - INTERVAL '30 days';

-- Correct: Filter in subquery before joining (if optimizer doesn't do it)
SELECT u.name, recent.total_cents
FROM users u
JOIN (
  SELECT user_id, total_cents
  FROM orders
  WHERE status = 'completed'
    AND created_at > NOW() - INTERVAL '30 days'
) recent ON recent.user_id = u.id;
```

### Avoid Functions on Indexed Columns in WHERE
```sql
-- Wrong: Function on column prevents index use
WHERE EXTRACT(YEAR FROM created_at) = 2024
WHERE LOWER(email) = 'alice@example.com'  -- unless expression index exists

-- Correct: Sargable predicates
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'
WHERE email = 'alice@example.com'  -- assuming emails stored lowercase
```

### EXISTS vs IN vs JOIN
```sql
-- EXISTS: Short-circuits on first match — fastest for "does it exist?" checks
SELECT * FROM users u
WHERE EXISTS (
  SELECT 1 FROM orders o WHERE o.user_id = u.id AND o.status = 'completed'
);

-- IN with subquery: Can be slower on large lists
WHERE user_id IN (SELECT user_id FROM vip_users)

-- JOIN: Best when you need data from both tables
-- EXISTS/IN: Best for existence checks without needing joined data
```

---

## Table Maintenance

```sql
-- VACUUM: Reclaims space from dead rows (runs automatically, but may need manual trigger after bulk deletes)
VACUUM ANALYZE orders;

-- VACUUM FULL: Reclaims disk space (locks table — use maintenance window)
VACUUM FULL orders;

-- ANALYZE: Updates statistics for query planner
ANALYZE users;

-- Check table bloat — when to run VACUUM FULL
SELECT
  relname,
  n_live_tup,
  n_dead_tup,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY dead_pct DESC;
```

---

## Connection Pooling

Each database connection consumes ~5-10MB RAM. With 100 app instances each opening 10 connections, that's 1000 connections on the DB.

```typescript
// PgBouncer: external connection pooler (recommended for production)
// Pool mode: transaction pooling — connection returned to pool after each transaction
// Config:
// pool_mode = transaction
// max_client_conn = 10000
// default_pool_size = 25

// Application-level pooling with pg
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,               // per application instance
  min: 2,                // keep warm connections
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 30_000, // kill queries running > 30s
});

// Monitor pool health
setInterval(() => {
  console.log({
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  });
}, 60_000);
```

---

## Optimization Checklist

- [ ] Slow queries identified via `pg_stat_statements`
- [ ] All heavily queried foreign keys have indexes
- [ ] `EXPLAIN ANALYZE` reviewed for top-5 slowest queries
- [ ] Unused indexes removed (write performance cost)
- [ ] Partial indexes for filtered queries (status, deleted_at)
- [ ] Covering indexes for frequent SELECT patterns
- [ ] `AUTOVACUUM` enabled and not blocked
- [ ] Connection pool sized appropriately (not unlimited)
- [ ] `statement_timeout` set to prevent runaway queries
- [ ] Table statistics current (`ANALYZE` scheduled)
