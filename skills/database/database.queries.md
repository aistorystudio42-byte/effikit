<!-- @keywords: SQL, query optimization, EXPLAIN, joins, subquery, window functions, aggregation, CTE -->

# Database — Query Writing and Optimization

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to queries.

## Principles

### Query Thinking: Set Operations, Not Loops
SQL operates on sets. The moment you think "I'll loop through rows and check each one," you've likely found a query that will be 10–1000x slower than it needs to be. Describe what data you want, not how to retrieve it.

---

### EXPLAIN ANALYZE — Reading Execution Plans
Before optimizing, understand what the database is actually doing.

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.name;
```

### Reading the Output
```
Seq Scan       → Table scan, no index. Large table = problem
Index Scan     → Using index. Good.
Index Only Scan → Never hits table. Best case.
Hash Join      → Building hash table, then probing. Good for large sets.
Nested Loop    → For each outer row, scan inner. Good only with small outer set.
Sort           → In-memory sort. Check if index could eliminate this.

Rows=1000 Actual Rows=50000 → Stale statistics, run ANALYZE
Buffers: hit=50 read=5000   → Too many disk reads, consider caching or index
```

---

### JOINs
```sql
-- INNER JOIN: only matching rows from both sides
SELECT p.title, u.name as author
FROM posts p
INNER JOIN users u ON u.id = p.author_id
WHERE p.status = 'published';

-- LEFT JOIN: all posts, with user if exists (handles orphaned data)
SELECT p.title, COALESCE(u.name, 'Deleted User') as author
FROM posts p
LEFT JOIN users u ON u.id = p.author_id;

-- Multiple joins — order matters for readability (driving table first)
SELECT
  o.id as order_id,
  u.email,
  p.name as product_name,
  oi.quantity,
  oi.unit_price_cents
FROM orders o
JOIN users u ON u.id = o.user_id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE o.status = 'completed'
  AND o.created_at >= '2024-01-01';
```

---

### CTEs — Common Table Expressions
CTEs improve readability for complex queries. Modern PostgreSQL optimizes them well.

```sql
-- Multi-step query with CTEs
WITH
  -- Step 1: Active users in last 30 days
  active_users AS (
    SELECT DISTINCT user_id
    FROM sessions
    WHERE created_at > NOW() - INTERVAL '30 days'
  ),
  
  -- Step 2: Their order totals
  user_order_totals AS (
    SELECT
      o.user_id,
      COUNT(o.id) as order_count,
      SUM(o.total_cents) as lifetime_value_cents
    FROM orders o
    WHERE o.status = 'completed'
    GROUP BY o.user_id
  )

-- Final result
SELECT
  u.email,
  u.name,
  COALESCE(ot.order_count, 0) as order_count,
  COALESCE(ot.lifetime_value_cents, 0) / 100.0 as lifetime_value
FROM users u
JOIN active_users au ON au.user_id = u.id
LEFT JOIN user_order_totals ot ON ot.user_id = u.id
ORDER BY lifetime_value DESC
LIMIT 100;
```

---

### Window Functions — Analytics Without Subqueries
```sql
-- Rank users by order count within each country
SELECT
  u.name,
  u.country,
  COUNT(o.id) as order_count,
  RANK() OVER (PARTITION BY u.country ORDER BY COUNT(o.id) DESC) as country_rank,
  ROW_NUMBER() OVER (ORDER BY COUNT(o.id) DESC) as global_rank
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name, u.country;

-- Running total
SELECT
  created_at::DATE as date,
  SUM(total_cents) as daily_revenue_cents,
  SUM(SUM(total_cents)) OVER (ORDER BY created_at::DATE) as running_total_cents
FROM orders
WHERE status = 'completed'
GROUP BY created_at::DATE
ORDER BY date;

-- Previous/next row access
SELECT
  id,
  status,
  created_at,
  LAG(status) OVER (PARTITION BY order_id ORDER BY created_at) as previous_status,
  LEAD(status) OVER (PARTITION BY order_id ORDER BY created_at) as next_status
FROM order_status_history;
```

---

### Aggregation Patterns
```sql
-- Group and filter with HAVING
SELECT
  user_id,
  COUNT(*) as order_count,
  AVG(total_cents) as avg_order_cents
FROM orders
WHERE created_at > NOW() - INTERVAL '1 year'
GROUP BY user_id
HAVING COUNT(*) >= 5          -- filter on aggregated value
ORDER BY avg_order_cents DESC;

-- Conditional aggregation
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'completed') / COUNT(*),
    2
  ) as completion_rate_pct
FROM orders
GROUP BY month
ORDER BY month;
```

---

### N+1 Query Problem
The most common performance killer in ORMs.

```typescript
// N+1 problem: 1 query for posts + N queries for each author
const posts = await Post.findAll();                 // 1 query
for (const post of posts) {
  const author = await User.findById(post.authorId); // N queries!
  post.authorName = author.name;
}

// Solution 1: JOIN in single query
const posts = await Post.findAll({
  include: [{ model: User, as: 'author', attributes: ['name'] }]
});

// Solution 2: Separate query + in-memory join
const posts = await Post.findAll();
const authorIds = [...new Set(posts.map(p => p.authorId))];
const authors = await User.findAll({ where: { id: authorIds } });
const authorMap = new Map(authors.map(a => [a.id, a]));
posts.forEach(p => { p.author = authorMap.get(p.authorId); });
// 2 queries total, not N+1
```

---

### Pagination
```sql
-- Offset pagination — simple, but slow for deep pages
SELECT * FROM posts
ORDER BY created_at DESC
LIMIT 20 OFFSET 200; -- page 11 — scans 220 rows, returns 20

-- Cursor pagination — fast at any depth
SELECT * FROM posts
WHERE created_at < $1 -- cursor: last seen created_at
  AND (created_at != $1 OR id < $2) -- tiebreaker for same timestamp
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

**Use cursor pagination when:** Dataset is large, users scroll deep, real-time data changes.
**Use offset when:** Users navigate to specific page numbers, dataset is small.

---

## Decision Framework

- Evaluate the complexity of the task.
- Identify structural bottlenecks.
- Choose the simplest abstraction that solves the problem.

## Anti-Patterns

- Over-engineering the solution.
- Ignoring context and copying blindly.
- Mixing concerns unnecessarily.

## Example in Action

- [ ] Slow queries identified via `pg_stat_statements` or slow query log
- [ ] `EXPLAIN ANALYZE` run on every query touching > 10k rows
- [ ] JOINs use indexed foreign keys
- [ ] N+1 queries eliminated in ORM layer
- [ ] `SELECT *` replaced with explicit column list in production
- [ ] Cursor pagination used for large datasets
- [ ] CTEs used for complex multi-step queries (readability + correctness)
- [ ] Statistics up to date (`ANALYZE` run after bulk inserts)
