<!-- @keywords: database optimization, slow query, EXPLAIN, index tuning, vacuum, statistics, connection pool, query plan -->
<!-- @domain: Database Performance Optimization Prompts -->

# Database Optimization Prompts

## Performance Audit

```
Audit the performance of this database.

**Database:** PostgreSQL [version]
**Current issues:**
- Slow queries: [describe symptoms — which operations, how slow]
- High CPU: [% usage, when it spikes]
- High memory: [RAM usage pattern]
- Connection issues: [exhausted pool / slow connection establishment]

**Data to provide:**
```sql
-- 1. Top slow queries
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 2. Tables with most sequential scans (missing indexes)
SELECT schemaname, tablename, seq_scan, idx_scan,
  seq_scan::float / NULLIF(seq_scan + idx_scan, 0) as seq_ratio
FROM pg_stat_user_tables
WHERE seq_scan > 100
ORDER BY seq_scan DESC;

-- 3. Table sizes
SELECT tablename, 
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) as total_size
FROM pg_tables WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;

-- 4. Index usage
SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC; -- Low scan count = possibly unused index
```

Paste the output above and I'll identify: missing indexes, unused indexes, 
queries to rewrite, and configuration tuning recommendations.
```

---

## EXPLAIN ANALYZE Deep Dive

```
Analyze this query execution plan.

**Query:**
[paste query]

**EXPLAIN ANALYZE output:**
[paste full EXPLAIN ANALYZE output]

**Key node types to identify:**

**Seq Scan (bad on large tables):**
- Row count: [actual rows]
- Filter: [removed rows count]
- Fix: index on the filter column

**Hash Join / Merge Join:**
- Build side rows: [large = memory pressure]
- Fix: index on join condition if nested loop would be faster

**Sort:**
- Method: [disk / quicksort]
- Fix: index covering the ORDER BY columns

**Rows estimate vs actual:**
- Off by >10×? → run ANALYZE to update statistics
- Consistently wrong? → custom statistics or partial index

**For each expensive node:**
- What it's doing
- Why it's expensive
- Specific fix (index, rewrite, statistics update)
- Expected improvement

**Also check:**
- Buffers: hit vs read (high read = no cache — adjust shared_buffers)
- JIT compilation enabled? (for complex analytical queries)
```

---

## PostgreSQL Configuration Tuning

```
Tune PostgreSQL configuration for: [workload type]

**Workload:** [web application / analytics / mixed / write-heavy]
**Server specs:**
- RAM: [N GB]
- CPU: [N cores]
- Storage: [SSD / HDD / NVMe]
- Connections: [expected N concurrent]

**Key parameters to tune:**

```
# Memory
shared_buffers = [25% of RAM — e.g., 4GB for 16GB server]
effective_cache_size = [75% of RAM — e.g., 12GB]
work_mem = [RAM / (max_connections × 2) — but min 4MB]
maintenance_work_mem = [5% of RAM — for VACUUM, CREATE INDEX]

# Write performance
wal_buffers = 64MB
checkpoint_completion_target = 0.9
max_wal_size = [2-4GB for write-heavy]

# Connections (use PgBouncer if >100 connections)
max_connections = [100 — most apps with pooler]

# Query planner
random_page_cost = 1.1  # if SSD
effective_io_concurrency = 200  # if SSD

# Autovacuum (tune for table update frequency)
autovacuum_vacuum_scale_factor = 0.02  # more aggressive than default 0.2
autovacuum_analyze_scale_factor = 0.01
```

Recommend specific values for the server specs provided.
Explain the impact of each setting on the described workload.
```

---

## Vacuum and Bloat

```
Diagnose and fix table bloat and vacuum issues.

**Problem:**
[table growing unexpectedly / queries getting slower over time / 
high dead tuple count / autovacuum not keeping up]

**Diagnostic queries:**
```sql
-- Tables with most dead tuples (bloat candidates)
SELECT relname, n_dead_tup, n_live_tup,
  n_dead_tup::float / NULLIF(n_live_tup + n_dead_tup, 0) as dead_ratio,
  last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- Check autovacuum settings per table
SELECT reloptions FROM pg_class WHERE relname = 'your_table';

-- Estimate physical bloat
SELECT tablename,
  pg_size_pretty(bloat_bytes) as bloat,
  round(bloat_ratio * 100, 1) as bloat_pct
FROM ... -- use pgstattuple extension or bloat estimation query
```

**Fix options:**

1. **Manual VACUUM:** Cleans dead tuples but keeps space for reuse
```sql
VACUUM ANALYZE high_bloat_table;
```

2. **VACUUM FULL:** Reclaims disk space but locks the table
```sql
VACUUM FULL high_bloat_table; -- avoid on production tables > 1GB
```

3. **pg_repack:** Reclaims space without locking (extension)
```bash
pg_repack --table high_bloat_table
```

4. **Tune autovacuum per table:**
```sql
ALTER TABLE high_update_table SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_vacuum_threshold = 100
);
```

Diagnose and fix: [your specific table/vacuum issue].
```

---

## Connection Pool Optimization

```
Optimize database connection pooling for: [application]

**Application:**
- Runtime: [Node.js / Python / serverless / mixed]
- Instances: [N application servers / pods / lambdas]
- Connection pool library: [pg / Prisma / Drizzle / PgBouncer]

**Problem:**
[connection exhaustion / slow connection acquisition / 
"too many connections" error / connection leaks]

**Diagnostic:**
```sql
-- Current connections
SELECT state, count(*) 
FROM pg_stat_activity 
GROUP BY state;

-- Long-running connections (potential leaks)
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'idle in transaction'
ORDER BY duration DESC;
```

**Optimization strategy:**

**For serverless (Lambda / Vercel Functions / Edge):**
- Use PgBouncer in transaction pooling mode (port 6543 in Supabase)
- Pool size: 25 (not 1000 — many functions, small per-function pool)
- Connection string must include: ?pgbouncer=true

**For traditional Node.js servers:**
- pg pool max: [CPU cores × 2, max 20]
- Idle timeout: 30s (release idle connections)
- Connection timeout: 5s (fail fast if pool exhausted)

**PgBouncer configuration:**
```ini
[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
```

Configure and fix for: [your specific connection issue].
```
