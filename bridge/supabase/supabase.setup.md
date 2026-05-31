<!-- @keywords: supabase, postgres, database, auth, storage, realtime, rls, mcp setup, supabase config -->
<!-- @domain: Supabase MCP Server — Setup & Configuration -->

# Supabase MCP Server — Setup & Configuration

## What This Is

The Supabase MCP server connects Claude directly to your Supabase project — enabling schema inspection, query execution, auth configuration review, storage management, and RLS policy analysis without leaving the conversation.

---

## Installation

### Prerequisites
- A Supabase project (free tier works)
- Supabase service role key (for full access) or anon key (read-only)

### Step 1 — Get Your Keys

**Supabase Dashboard → Project Settings → API**

```
URL:            https://xxxxxxxxxxxx.supabase.co
anon key:       eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  (safe for client-side)
service_role:   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  (server-only, bypasses RLS)
```

### Step 2 — Add to claude_desktop_config.json

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-supabase"],
      "env": {
        "SUPABASE_URL": "https://xxxxxxxxxxxx.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
  }
}
```

**Important:** Use `service_role_key` here — the MCP server runs server-side and needs to bypass RLS to inspect schemas. Never expose this key client-side.

### Step 3 — Verify

Restart Claude Desktop. Ask:
> "List all tables in my Supabase database"

---

## Core Concepts

### PostgREST Auto-API

Every table in your Supabase database automatically gets a REST endpoint:
```
GET    /rest/v1/users          → SELECT * FROM users
POST   /rest/v1/users          → INSERT INTO users
PATCH  /rest/v1/users?id=eq.1  → UPDATE users WHERE id = 1
DELETE /rest/v1/users?id=eq.1  → DELETE FROM users WHERE id = 1
```

Claude can query these endpoints or write raw SQL through the MCP connection.

### Row Level Security (RLS)

RLS is Supabase's authorization layer — policies determine what each authenticated user can see/modify. The service role key bypasses RLS entirely (for admin use). Application code uses the anon key and respects RLS.

**Critical rule:** Always enable RLS on every table before going to production.

```sql
-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Allow users to read only their own posts
CREATE POLICY "Users read own posts" ON posts
  FOR SELECT USING (auth.uid() = user_id);
```

### Realtime Channels

Supabase broadcasts database changes over WebSocket:
```typescript
const channel = supabase
  .channel('room1')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, 
    (payload) => console.log(payload.new))
  .subscribe();
```

---

## Common Prompt Examples

```
Show me all tables in my Supabase database with their column names and types
```

```
What RLS policies are currently active on the "posts" table?
```

```
Show me the last 20 rows from the "error_logs" table ordered by created_at
```

```
Check if there are any tables WITHOUT row level security enabled
```

```
Show me the foreign key relationships between all tables in my schema
```

```
What indexes exist on the "users" table and are they being used?
```

```
Show me all auth users that signed up in the last 24 hours
```

```
List all storage buckets and whether they are public or private
```

---

## Key Database Objects to Know

| Object | What It Is |
|--------|-----------|
| `auth.users` | Supabase-managed user accounts |
| `auth.sessions` | Active user sessions |
| `storage.objects` | Files in Storage |
| `storage.buckets` | Storage bucket definitions |
| `realtime.subscription` | Active Realtime subscriptions |
| `pg_stat_activity` | Active database connections |
| `pg_stat_user_tables` | Table-level read/write stats |
| `pg_indexes` | All index definitions |

---

## Environment Variables for Your App

```bash
# .env.local (Next.js)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server-only (never expose client-side)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## TypeScript Client Setup

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Client-side (respects RLS)
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-side only (bypasses RLS — use with care)
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

Generate type-safe Database types:
```bash
npx supabase gen types typescript --project-id xxxxxxxxxxxx > lib/database.types.ts
```
