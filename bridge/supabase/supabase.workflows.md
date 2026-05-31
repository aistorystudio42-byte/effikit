<!-- @keywords: supabase, query, migration, rls policy, auth, storage, realtime, SQL, postgres, schema design -->
<!-- @domain: Supabase MCP Server — Workflows & Query Patterns -->

# Supabase MCP Server — Workflows & Query Patterns

## Schema Design Workflow

### Design a Table via Claude

```
Design a Supabase schema for a blog system with:
- Posts (title, body, slug, published_at, status: draft/published)
- Authors (linked to auth.users)
- Tags (many-to-many with posts)
- Comments (nested, soft-deletable)

Include: RLS policies, foreign keys, indexes for common queries,
and a trigger to auto-update updated_at
```

Claude will produce SQL you can run in **Supabase Dashboard → SQL Editor**.

### Standard Table Template

```sql
CREATE TABLE public.posts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  body        TEXT,
  status      TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Indexes for common query patterns
CREATE INDEX posts_user_id_idx ON posts(user_id);
CREATE INDEX posts_status_published_at_idx ON posts(status, published_at DESC);
CREATE INDEX posts_slug_idx ON posts(slug);
```

---

## RLS Policy Patterns

### The Standard Four Policies

```sql
-- SELECT: users can read their own rows
CREATE POLICY "Users can view own posts" ON posts
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT: users can create rows for themselves only
CREATE POLICY "Users can create own posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: users can update their own rows only
CREATE POLICY "Users can update own posts" ON posts
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: users can delete their own rows only
CREATE POLICY "Users can delete own posts" ON posts
  FOR DELETE USING (auth.uid() = user_id);
```

### Public Read + Authenticated Write

```sql
-- Anyone can read published posts
CREATE POLICY "Public can read published posts" ON posts
  FOR SELECT USING (status = 'published');

-- Only authenticated users can write
CREATE POLICY "Authenticated users can insert" ON posts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

### Role-Based Access (Admin pattern)

```sql
-- Store user roles in a separate table
CREATE TABLE public.user_roles (
  user_id UUID REFERENCES auth.users PRIMARY KEY,
  role    TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin'))
);

-- Admins can do anything
CREATE POLICY "Admins have full access" ON posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### Inspect Existing Policies via Claude

```
Show me all RLS policies on the "posts" table — 
for each policy show: name, command (SELECT/INSERT/UPDATE/DELETE), 
and the USING/WITH CHECK expression
```

---

## Query Patterns

### Filtered queries with PostgREST operators

```typescript
// Supabase JS client — common operators
const { data } = await supabase
  .from('posts')
  .select('id, title, created_at, authors(name)')  // join
  .eq('status', 'published')                        // WHERE status = 'published'
  .gte('published_at', '2025-01-01')                // >= date
  .ilike('title', '%typescript%')                   // ILIKE (case-insensitive)
  .order('published_at', { ascending: false })       // ORDER BY
  .range(0, 19);                                    // LIMIT 20 OFFSET 0
```

### Raw SQL for complex queries

```
Run this SQL in my Supabase database:

SELECT 
  p.id,
  p.title,
  u.email as author_email,
  COUNT(c.id) as comment_count,
  MAX(c.created_at) as last_comment_at
FROM posts p
JOIN auth.users u ON u.id = p.user_id
LEFT JOIN comments c ON c.post_id = p.id
WHERE p.status = 'published'
GROUP BY p.id, p.title, u.email
HAVING COUNT(c.id) > 5
ORDER BY last_comment_at DESC
LIMIT 10;
```

### Full-Text Search

```sql
-- Add tsvector column for fast full-text search
ALTER TABLE posts ADD COLUMN search_vector TSVECTOR;

-- Trigger to keep it up to date
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', 
    COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.body, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_search_vector_update
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- GIN index for performance
CREATE INDEX posts_search_idx ON posts USING GIN(search_vector);
```

```typescript
// Client-side full-text search
const { data } = await supabase
  .from('posts')
  .select()
  .textSearch('search_vector', 'typescript hooks', { 
    type: 'websearch', 
    config: 'english' 
  });
```

---

## Auth Workflows

### Email + Password Registration

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword',
  options: {
    data: { display_name: 'Alice' }  // stored in auth.users.raw_user_meta_data
  }
});
```

### OAuth (Google, GitHub, etc.)

```typescript
await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: { redirectTo: `${window.location.origin}/auth/callback` }
});
```

### Session Management

```typescript
// Get current user (cached, no network)
const { data: { user } } = await supabase.auth.getUser();

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') { /* update UI */ }
  if (event === 'TOKEN_REFRESHED') { /* update stored token */ }
  if (event === 'SIGNED_OUT') { /* redirect to login */ }
});
```

---

## Storage Workflows

### Upload a file

```typescript
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.jpg`, file, {
    contentType: 'image/jpeg',
    upsert: true  // overwrite if exists
  });
```

### Get a signed URL (for private buckets)

```typescript
const { data } = await supabase.storage
  .from('documents')
  .createSignedUrl(`${userId}/report.pdf`, 3600); // expires in 1 hour

console.log(data.signedUrl);
```

### Storage RLS policies

```sql
-- Users can upload to their own folder only
CREATE POLICY "Users manage own files" ON storage.objects
  FOR ALL USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Realtime Subscription Patterns

```typescript
// Listen to all changes on a table
const channel = supabase
  .channel('post-changes')
  .on('postgres_changes', {
    event: '*',              // INSERT | UPDATE | DELETE | *
    schema: 'public',
    table: 'posts',
    filter: `user_id=eq.${currentUserId}`  // filter to relevant rows
  }, (payload) => {
    console.log('Change received:', payload);
  })
  .subscribe();

// Always clean up
return () => supabase.removeChannel(channel);
```
