<!-- @keywords: supabase, best practices, performance, index, rls security, N+1, connection pooling, migration, postgres optimization -->
<!-- @domain: Supabase MCP Server — Best Practices & Optimization -->

# Supabase MCP Server — Best Practices & Optimization

## Security Fundamentals

### The RLS Checklist

Before going to production, run this via Claude:
```
Check my Supabase database for any tables that:
1. Have NO row level security enabled
2. Have RLS enabled but NO policies (blocks all access — silent failure)
3. Have policies with "USING (true)" (allows anyone to read/write)

Show me a risk assessment for each finding
```

**Common RLS mistakes:**

```sql
-- ❌ DANGER: This allows any authenticated user to read ALL rows
CREATE POLICY "auth users can read" ON posts
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ✅ CORRECT: Users read only their own rows
CREATE POLICY "users read own posts" ON posts
  FOR SELECT USING (auth.uid() = user_id);
```

```sql
-- ❌ TRAP: RLS enabled with no policies = nobody can read anything
-- Newly created tables get this state by default
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
-- (no policies added) → SELECT returns 0 rows silently, no error

-- ✅ Always add at least one SELECT policy immediately after enabling RLS
```

### Service Role Key Isolation

```typescript
// ❌ Never use service role in client-side code
// This bypasses RLS for ALL users, creating a privilege escalation vector
const supabase = createClient(url, serviceRoleKey); // in React component

// ✅ Service role only in server contexts
// Next.js API route, Server Action, Edge Function
export async function POST(req: Request) {
  const supabaseAdmin = createClient(url, serviceRoleKey);
  // ... admin operations
}
```

---

## Query Performance

### Index Design

Run this to find missing indexes:
```
Analyze my Supabase query performance — check pg_stat_user_tables 
and pg_stat_user_indexes. Which tables have high seq_scan counts 
relative to idx_scan? Those are missing indexes.
```

**Index types and when to use them:**

```sql
-- B-Tree (default): equality, range, sorting
CREATE INDEX ON posts(user_id);                    -- equality filter
CREATE INDEX ON posts(created_at DESC);            -- time-series ordering
CREATE INDEX ON posts(status, published_at DESC);  -- compound: filter then sort

-- GIN: full-text search, arrays, JSONB
CREATE INDEX ON posts USING GIN(tags);             -- array column
CREATE INDEX ON posts USING GIN(metadata);         -- JSONB column
CREATE INDEX ON posts USING GIN(search_vector);    -- tsvector

-- Partial index: only index a subset of rows
CREATE INDEX ON posts(user_id) WHERE status = 'published';
-- Much smaller index, faster for the common case
```

### The N+1 Problem

```typescript
// ❌ N+1: fetches posts, then 1 query per post for author
const posts = await supabase.from('posts').select('*');
for (const post of posts.data) {
  const author = await supabase.from('users').select().eq('id', post.user_id);
}

// ✅ Single query with join via PostgREST embedding
const { data } = await supabase
  .from('posts')
  .select(`
    id, title, created_at,
    author:users(id, name, avatar_url),
    tags(name),
    _count:comments(count)
  `);
```

### EXPLAIN ANALYZE via Claude

```
Run EXPLAIN ANALYZE on this query in my Supabase database and 
tell me what's slow and what index would fix it:

SELECT p.*, u.email 
FROM posts p 
JOIN auth.users u ON u.id = p.user_id
WHERE p.status = 'published' 
ORDER BY p.created_at DESC 
LIMIT 20;
```

---

## Connection Pooling

Supabase uses PgBouncer. Direct connections (port 5432) bypass PgBouncer — use port 6543 (transaction pooling) for serverless:

```
# Direct (persistent connections — use for long-running servers)
postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres

# Pooled (stateless — use for serverless/edge functions)
postgresql://postgres:password@db.xxxx.supabase.co:6543/postgres?pgbouncer=true
```

**With Prisma:**
```
DATABASE_URL="postgresql://...6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://...5432/postgres"
```

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // used for migrations
}
```

---

## Migration Best Practices

### Never edit tables directly in dashboard

Use SQL migrations so your schema is version-controlled:

```bash
# Initialize Supabase locally
supabase init
supabase link --project-ref xxxxxxxxxxxx

# Create a new migration
supabase migration new add_posts_table

# Edit supabase/migrations/<timestamp>_add_posts_table.sql
# Then push
supabase db push
```

### Safe migration patterns

```sql
-- ✅ Add nullable column — zero downtime
ALTER TABLE posts ADD COLUMN views INTEGER DEFAULT 0;

-- ✅ Add index concurrently — doesn't lock the table
CREATE INDEX CONCURRENTLY posts_views_idx ON posts(views DESC);

-- ⚠️ Renaming a column breaks existing queries — do in 3 steps:
-- Step 1: Add new column
ALTER TABLE posts ADD COLUMN post_body TEXT;
-- Step 2: Deploy code that writes to both columns  
-- Step 3: Migrate data + remove old column
UPDATE posts SET post_body = body;
ALTER TABLE posts DROP COLUMN body;
```

### Ask Claude to review a migration

```
Review this Supabase migration for safety — will it lock the table,
could it fail on a large dataset, and is it reversible?

[paste SQL here]
```

---

## JSONB Usage

```sql
-- Store flexible metadata without separate tables
ALTER TABLE posts ADD COLUMN metadata JSONB DEFAULT '{}';

-- Query JSONB fields
SELECT * FROM posts WHERE metadata->>'category' = 'tech';
SELECT * FROM posts WHERE metadata @> '{"featured": true}';

-- Index specific JSONB paths
CREATE INDEX ON posts((metadata->>'category'));
CREATE INDEX ON posts USING GIN(metadata jsonb_path_ops);
```

---

## What NOT to Do

| Action | Problem | Alternative |
|--------|---------|-------------|
| Expose service_role key to client | Bypasses all RLS — full DB access for anyone | Anon key client-side, service role server-side only |
| SELECT * on large tables | Transfers unused columns | Always specify columns |
| Skip RLS on public-facing tables | Any authenticated user can read/write all data | Enable RLS + explicit policies from day one |
| Use auth.uid() in application code | Client can spoof it without RLS | Always enforce via RLS on the database |
| Delete rows instead of soft delete | Data loss, broken foreign keys | Add `deleted_at TIMESTAMPTZ` column |
| Store files in database as bytea | Extremely slow, bloats DB | Use Supabase Storage |
| Direct postgres port in serverless | Connection exhaustion under load | Use pooled port 6543 |
