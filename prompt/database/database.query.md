<!-- @keywords: SQL query, complex query, aggregate, window function, CTE, subquery, join, optimize query -->
<!-- @domain: Database Query Writing Prompts -->

# Database Query Prompts

## Complex Analytics Query

```
Write a SQL query for: [analytics question]

**Database:** PostgreSQL
**Tables involved:**
[describe tables or paste schema]

**What the query must return:**
[describe the result set — columns, grouping, ordering]

**Example result:**
| column1 | column2 | column3 |
|---------|---------|---------|
| [example row] | | |

**Constraints:**
- Time range: [last N days / between dates]
- Minimum thresholds: [e.g., only users with >N events]
- Nulls: [how to handle — exclude / treat as 0 / treat as 'unknown']

**Performance requirements:**
- Table size: [N rows in each table]
- Must complete in: [X ms / seconds]
- Indexes available: [list]

**Write the query using:**
- CTEs for readability (name each step)
- Window functions if rankings/running totals are needed
- Explain each CTE with a comment
```

---

## Window Function Queries

```
Write these queries using PostgreSQL window functions.

**Use cases:**

**1. Running total:**
[column to sum], partitioned by [grouping column], ordered by [time column]

**2. Rank within group:**
Rank [items] by [metric] within each [group], top N per group

**3. Moving average:**
[N]-period moving average of [metric] per [dimension]

**4. Previous row comparison:**
Show current [value] and previous period's [value] in same row

**5. Percentile ranking:**
What percentile is each [entity] in relative to [group]?

**Pattern templates:**
```sql
-- Running total
SUM(amount) OVER (PARTITION BY user_id ORDER BY created_at) as running_total

-- Rank within group (top N)
ROW_NUMBER() OVER (PARTITION BY category ORDER BY score DESC) as rank

-- Moving average (7-day)
AVG(daily_revenue) OVER (
  ORDER BY date 
  ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
) as moving_avg_7d

-- Lag (previous row)
LAG(value, 1) OVER (PARTITION BY user_id ORDER BY date) as prev_value

-- Percentile
PERCENT_RANK() OVER (ORDER BY score) as percentile
```

Write the full queries for the use cases described above.
```

---

## CTE-Based Complex Query

```
Rewrite this complex query using CTEs for readability.

**Original query (hard to read):**
[paste complex SQL with nested subqueries]

**Or build from scratch:**
[describe the multi-step query logic in plain English]

Step 1: [first data transformation / filter]
Step 2: [join / aggregate]
Step 3: [further filter or enrich]
Step 4: [final shape]

**CTE structure:**
```sql
WITH
step1 AS (
  -- [what this CTE does]
  SELECT ...
),
step2 AS (
  -- [what this CTE does]
  SELECT ...
  FROM step1
  JOIN ...
),
step3 AS (
  -- [what this CTE does]
  SELECT ...
  FROM step2
  WHERE ...
)
SELECT * FROM step3
ORDER BY ...;
```

Each CTE should be independently understandable.
Name CTEs by what they represent, not what they do (users_with_orders, not step1).
```

---

## Query Optimization

```
Optimize this slow PostgreSQL query.

**Query:**
[paste query]

**EXPLAIN ANALYZE output:**
[paste output — or describe if not available]

**Table sizes:**
- [table]: [N rows]
- [table]: [N rows]

**Current execution time:** [X ms]
**Target:** [Y ms]

**Analyze and fix:**

1. Identify the expensive nodes in EXPLAIN ANALYZE:
   - Seq Scan on large table? → add index
   - Hash Join with large build side? → consider index nested loop
   - Filter removing most rows? → push filter down or add partial index
   - Sort on large result? → index covers the ORDER BY
   - High "actual rows" vs "estimated rows"? → ANALYZE to update statistics

2. Rewrite options:
   - Replace subquery with JOIN or CTE
   - Replace correlated subquery with lateral join
   - Add covering index (includes all needed columns)
   - Use materialized CTE for expensive subquery used multiple times

3. For each optimization:
   - What's the fix
   - Expected improvement (estimate)
   - Side effects (write performance, storage)

Output: optimized query + required indexes.
```

---

## Bulk Operations

```
Write efficient bulk data operations for: [use case]

**Operation:** [bulk insert / bulk update / bulk delete / upsert]
**Volume:** [N rows per operation]
**Frequency:** [one-time / recurring / real-time]

**Bulk insert (COPY is fastest):**
```sql
-- For massive inserts, COPY from CSV is 10-100× faster than individual INSERTs
COPY table_name (col1, col2, col3)
FROM '/tmp/data.csv'
WITH (FORMAT CSV, HEADER true, DELIMITER ',');

-- For application-level bulk insert
INSERT INTO table_name (col1, col2)
VALUES 
  (val1a, val1b),
  (val2a, val2b),
  -- batch 1000 rows per statement, not one per row
  (valNa, valNb);
```

**Upsert (insert or update):**
```sql
INSERT INTO products (id, name, price, updated_at)
VALUES (...batch...)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  updated_at = now()
WHERE products.price != EXCLUDED.price; -- only update if actually changed
```

**Bulk delete with batch processing (avoid locking):**
```sql
-- Delete in batches to avoid long-running transaction holding locks
DELETE FROM events
WHERE id IN (
  SELECT id FROM events
  WHERE created_at < now() - INTERVAL '1 year'
  LIMIT 10000  -- batch size
);
-- Run this in a loop until 0 rows deleted
```

Write the implementation for: [specific bulk operation needed].
```
