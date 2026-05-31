<!-- @keywords: migration, schema migration, zero downtime, rollback, alter table, add column, rename, seed data -->
<!-- @domain: Database Migration Prompts -->

# Database Migration Prompts

## Safe Zero-Downtime Migration

```
Write a zero-downtime migration for: [schema change]

**Change needed:** [describe what needs to change]
**Table size:** [N rows — large tables need extra care]
**Can the table be locked?** [no — production with active writes]

**Multi-step pattern for column rename:**
(Can't rename in one shot — breaks running application instances)

Step 1 — Add new column (backward compatible):
```sql
-- Non-blocking — no table lock
ALTER TABLE users ADD COLUMN display_name TEXT;
```

Step 2 — Backfill existing rows (batched):
```sql
-- Do in batches to avoid long lock + replication lag
UPDATE users 
SET display_name = username
WHERE display_name IS NULL
  AND id BETWEEN [start] AND [end];
-- Repeat until complete
```

Step 3 — Deploy code that writes to BOTH columns

Step 4 — Make new column NOT NULL with default:
```sql
-- Safe only after backfill is complete
ALTER TABLE users ALTER COLUMN display_name SET NOT NULL;
```

Step 5 — Deploy code that reads from new column only

Step 6 — Drop old column:
```sql
-- Only after all instances use new column
ALTER TABLE users DROP COLUMN username;
```

Write the complete migration steps for: [your specific change].
Include timing guidance: which steps require code deploys between them.
```

---

## Add Index Safely

```
Add indexes to this table without locking it.

**Table:** [name]
**Table size:** [N rows]
**Column(s) to index:** [column list]
**Index type:** [B-Tree / GIN / GiST / partial]
**Desired index:** [describe the query it should support]

**Safe index creation (PostgreSQL):**
```sql
-- CONCURRENTLY builds the index without locking the table
-- Takes longer, but production traffic is not blocked
CREATE INDEX CONCURRENTLY idx_posts_user_id_created_at
  ON posts (user_id, created_at DESC);

-- Partial index — only index rows that match the condition
-- Much smaller, faster for queries that filter on status
CREATE INDEX CONCURRENTLY idx_posts_published
  ON posts (user_id, created_at DESC)
  WHERE status = 'published';

-- GIN index for JSONB or full-text search
CREATE INDEX CONCURRENTLY idx_posts_search
  ON posts USING GIN (search_vector);

-- Covering index — includes extra columns to avoid table lookup
CREATE INDEX CONCURRENTLY idx_posts_list
  ON posts (user_id, created_at DESC)
  INCLUDE (title, slug, status);
```

**Verify index is being used:**
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, title FROM posts
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 20;
-- Look for: "Index Scan using idx_posts_list" — not "Seq Scan"
```

Write the specific indexes needed for: [your query patterns].
```

---

## Data Migration Script

```
Write a data migration script for: [data transformation]

**From state:** [describe current data shape]
**To state:** [describe target data shape]
**Rows to migrate:** [N rows]

**Script requirements:**
- Idempotent: safe to run multiple times (check before insert/update)
- Batched: process [1000-10000] rows per transaction
- Logged: output progress every [N] rows
- Resumable: can be interrupted and restarted without data corruption
- Dry-run mode: run with --dry-run to preview without changing data

**Template:**
```sql
-- Migration: [describe what this does]
-- Safe to run: yes (idempotent)
-- Estimated time: [X minutes on production]

DO $$
DECLARE
  batch_size INT := 5000;
  offset_val INT := 0;
  rows_processed INT;
BEGIN
  LOOP
    UPDATE target_table t
    SET new_column = [transformation logic]
    FROM source_table s
    WHERE t.id = s.id
      AND t.new_column IS NULL  -- idempotency check
      AND t.id IN (
        SELECT id FROM target_table
        WHERE new_column IS NULL
        ORDER BY id
        LIMIT batch_size
      );
    
    GET DIAGNOSTICS rows_processed = ROW_COUNT;
    EXIT WHEN rows_processed = 0;
    
    RAISE NOTICE 'Processed % rows', rows_processed;
    PERFORM pg_sleep(0.1); -- brief pause between batches
  END LOOP;
  
  RAISE NOTICE 'Migration complete';
END $$;
```

Write the migration for: [your specific transformation].
```

---

## Rollback Migration

```
Write a rollback procedure for this migration.

**Forward migration:**
[paste the migration that was applied]

**When to use this rollback:**
[what problems would trigger a rollback]

**Rollback SQL:**
For each forward change, write the exact inverse:

| Forward | Rollback |
|---------|---------|
| ADD COLUMN | DROP COLUMN |
| CREATE TABLE | DROP TABLE IF EXISTS |
| CREATE INDEX | DROP INDEX |
| ALTER TYPE | [revert to original type] |
| INSERT/UPDATE data | DELETE/UPDATE back to original |
| ADD CONSTRAINT | DROP CONSTRAINT |

**Data rollback considerations:**
- If rows were inserted: DELETE WHERE [identifying condition]
- If rows were updated: store original values in a temp table before migration
- If columns were dropped: data is gone — rollback only removes the structure

**Rollback script:**
```sql
-- Rollback for migration: [name]
-- Must be run immediately if issues arise — do not wait

BEGIN;

-- [rollback step 1]
-- [rollback step 2]
-- [rollback step 3]

COMMIT;

-- Verify rollback succeeded
SELECT [query to confirm original state is restored];
```
```

---

## Seed Data

```
Write a seed script for: [environment and purpose]

**Purpose:** [development / testing / demo / staging initial data]

**Seed requirements:**
- [N] users with realistic data (not foo@bar.com)
- [N] [entities] per user
- Relationships: [describe the relationships that must exist]
- Specific test cases: [admin user / user with empty state / user with max data]

**Data quality standards:**
- Names: realistic first + last names from diverse backgrounds
- Emails: [format: firstname.lastname@example.com]
- Dates: within last [N] months (not all the same date)
- Amounts: realistic range with some variance (not all 100.00)
- Text content: realistic length (not "lorem" — domain-appropriate text)

**Script format:**
```typescript
// seed.ts — using Prisma as example
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
    },
  });
  
  // Create test users and their data...
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

Write a seed script for: [your specific data needs].
```
