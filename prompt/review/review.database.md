<!-- @keywords: database review, schema review, query review, index audit, migration review, data model -->
<!-- @domain: Database Schema & Query Review Prompts -->

# Database Review Prompts

## Schema Design Review

```
Review this database schema design.

**Schema:**
[paste CREATE TABLE statements or ORM model definitions]

**Application context:**
- Read/write ratio: [mostly reads / balanced / mostly writes]
- Expected table sizes: [users: 1M rows, posts: 10M rows]
- Critical query patterns: [list the 3-5 most important queries]

**Review for:**
1. Normalization: is data duplicated where it shouldn't be?
2. Missing constraints: NOT NULL, UNIQUE, CHECK constraints that should exist
3. Foreign keys: are relational references enforced at DB level?
4. Indexes: are there indexes on columns used in WHERE, JOIN, ORDER BY?
5. Data types: VARCHAR(255) everywhere? INT vs BIGINT? TEXT vs VARCHAR?
6. Naming: consistent snake_case, clear names, no reserved words?
7. Timestamps: created_at and updated_at on every table?
8. Soft delete: if using deleted_at, is it indexed and consistently applied?

**Output:**
Schema issues prioritized by: [breaks correctness → performance → convention]
For each: exact SQL to fix it.
```

---

## Query Performance Review

```
Review these queries for performance issues.

**Database:** [PostgreSQL / MySQL / SQLite]
**Table sizes:** [table: N rows, table: N rows]

**Queries:**
[paste SQL queries or ORM code]

**EXPLAIN output (if available):**
[paste EXPLAIN ANALYZE output]

**Review for:**
1. Sequential scans on large tables (Seq Scan in EXPLAIN)
2. Missing indexes on JOIN and WHERE columns
3. SELECT * returning unnecessary columns
4. Subqueries that could be rewritten as JOINs
5. N+1: ORM code that generates one query per row
6. Implicit type casting in WHERE clause defeating index use
7. Functions on indexed columns in WHERE (WHERE LOWER(email) = ...)
8. Unbounded result sets (no LIMIT)

**For each issue:**
- Estimated query time before fix
- Exact index to add or query to rewrite
- Estimated query time after fix
```

---

## Migration Review

```
Review this database migration before applying it.

**Migration:**
[paste migration SQL or ORM migration file]

**Database state:**
- Current table size: [N rows]
- Is the table actively receiving writes during deployment? [yes / no]
- Deployment approach: [zero-downtime / with downtime window]

**Safety checklist:**
- [ ] Does this lock the table? (ALTER TABLE on large table = table lock)
- [ ] Is there a rollback? (Is the migration reversible without data loss?)
- [ ] Are there foreign key constraints being added? (Need to backfill first)
- [ ] Are there NOT NULL columns being added? (Need a default value or backfill)
- [ ] Are indexes created with CONCURRENTLY? (Non-blocking for Postgres)
- [ ] Are any column renames or drops? (Requires multi-step deploy)
- [ ] Will any existing queries break after this migration?

**Risk assessment:**
- Risk level: [LOW / MEDIUM / HIGH]
- Estimated duration on production data size
- Rollback procedure if something goes wrong
- Safe or needs changes before running?
```

---

## ORM Query Review

```
Review these ORM queries for correctness and performance.

**ORM:** [Prisma / Drizzle / TypeORM / Sequelize]
**Queries:**
[paste ORM query code]

**Review for:**
1. N+1 patterns: loops calling individual queries instead of include/join
2. Over-fetching: selecting all fields when only 2 are needed (select/pick)
3. Missing transactions: multiple write operations not wrapped in a transaction
4. Type safety: are return types correct, or are you casting to `any`?
5. Null safety: unhandled case where findUnique returns null
6. Incorrect relations: loading nested relations that could be separate queries

**For each issue:**
- Original ORM code
- Fixed ORM code
- Generated SQL comparison (before → after)
- Performance improvement
```

---

## Index Strategy Review

```
Design an index strategy for these query patterns.

**Table definition:**
[paste table schema]

**Current indexes:**
[paste existing index definitions]

**Query patterns to optimize (with relative frequency):**
1. [60% of queries]: [describe — e.g., "find posts by user_id ordered by created_at"]
2. [25%]: [describe]
3. [10%]: [describe]
4. [5%]: [describe]

**Design index strategy:**
For each query pattern:
- Which columns should be indexed
- Index type: B-Tree / GIN / GiST / BRIN / partial
- Composite vs single-column
- Index column order rationale (selectivity, sort direction)
- Estimated size impact

**Trade-offs:**
Each index speeds up reads but slows down writes. Given the read/write ratio 
[N:1], what's the right balance?

**Final index set:**
List every CREATE INDEX statement needed, with a comment for each.
```
