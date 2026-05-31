<!-- @keywords: full text search, search, postgres search, tsvector, tsquery, fuzzy search, search ranking, search index -->
<!-- @domain: Database Search Prompts -->

# Database Search Prompts

## Full-Text Search Setup

```
Set up full-text search for: [what users are searching]

**Searchable content:**
- Table: [name]
- Columns to search: [title, body, tags, etc.]
- Language: [english / turkish / multi-language]

**Implementation — PostgreSQL native FTS:**

```sql
-- Step 1: Add tsvector column
ALTER TABLE posts ADD COLUMN search_vector TSVECTOR;

-- Step 2: Function to build search vector (weighted)
CREATE OR REPLACE FUNCTION build_search_vector(
  title TEXT, body TEXT, tags TEXT[]
) RETURNS TSVECTOR AS $$
  SELECT 
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||  -- title: highest weight
    setweight(to_tsvector('english', COALESCE(body, '')), 'B') ||   -- body: medium weight
    setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'C')
$$ LANGUAGE SQL IMMUTABLE;

-- Step 3: Trigger to keep it updated
CREATE OR REPLACE FUNCTION update_post_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := build_search_vector(NEW.title, NEW.body, NEW.tags);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_search_vector_update
  BEFORE INSERT OR UPDATE OF title, body, tags ON posts
  FOR EACH ROW EXECUTE FUNCTION update_post_search_vector();

-- Step 4: GIN index
CREATE INDEX CONCURRENTLY posts_search_idx ON posts USING GIN(search_vector);

-- Step 5: Backfill existing rows
UPDATE posts SET search_vector = build_search_vector(title, body, tags);
```

**Query:**
```sql
-- Basic search
SELECT id, title, 
  ts_rank(search_vector, query) as rank,
  ts_headline('english', title, query, 'MaxFragments=1') as excerpt
FROM posts,
  to_tsquery('english', 'typescript & hooks') as query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;
```

Build this setup for: [your specific search requirements].
```

---

## Search with Ranking and Filters

```
Build a search API with ranking, filters, and pagination.

**Search input:**
- Query text: [free text search]
- Filters: [category, date range, author, status, tags]
- Sort: [relevance / newest / most popular]
- Pagination: [page + limit or cursor]

**Full implementation:**

```typescript
interface SearchParams {
  q: string;
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  sortBy: 'relevance' | 'newest' | 'popular';
  page: number;
  limit: number;
}

async function searchPosts(params: SearchParams) {
  const { q, category, dateFrom, dateTo, tags, sortBy, page, limit } = params;
  
  // Build tsquery (handle special characters)
  const sanitizedQuery = q.trim()
    .split(/\s+/)
    .map(term => term.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .join(' & ');
  
  const result = await sql`
    WITH search_results AS (
      SELECT 
        p.id, p.title, p.slug, p.created_at, p.view_count,
        ts_rank(p.search_vector, to_tsquery('english', ${sanitizedQuery})) as rank,
        ts_headline('english', p.title, to_tsquery('english', ${sanitizedQuery}),
          'MaxFragments=1, MaxWords=10') as excerpt,
        COUNT(*) OVER() as total_count
      FROM posts p
      WHERE 
        p.search_vector @@ to_tsquery('english', ${sanitizedQuery})
        AND p.status = 'published'
        AND (${category}::text IS NULL OR p.category = ${category})
        AND (${dateFrom}::date IS NULL OR p.created_at >= ${dateFrom})
        AND (${dateTo}::date IS NULL OR p.created_at <= ${dateTo})
        AND (${tags}::text[] IS NULL OR p.tags && ${tags})
    )
    SELECT * FROM search_results
    ORDER BY ${sortBy === 'relevance' ? sql`rank DESC` : 
              sortBy === 'newest' ? sql`created_at DESC` : 
              sql`view_count DESC`}
    LIMIT ${limit} OFFSET ${(page - 1) * limit}
  `;
  
  return {
    results: result.rows,
    total: result.rows[0]?.total_count ?? 0,
    page,
    totalPages: Math.ceil((result.rows[0]?.total_count ?? 0) / limit),
  };
}
```

Adapt this for: [your specific search requirements].
```

---

## Fuzzy Search

```
Implement fuzzy search for: [what to search]

**Use case:** [typo tolerance / autocomplete / similarity matching]

**PostgreSQL approaches:**

**Option A — pg_trgm (trigram similarity):**
Best for typo tolerance and partial matching.
```sql
-- Install extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index (fast similarity searches)
CREATE INDEX CONCURRENTLY users_name_trgm_idx 
  ON users USING GIN (name gin_trgm_ops);

-- Similarity search (0-1 score, higher = more similar)
SELECT name, similarity(name, 'johm doe') as score
FROM users
WHERE name % 'johm doe'  -- % operator uses similarity threshold
ORDER BY score DESC
LIMIT 10;

-- Set threshold (default 0.3)
SET pg_trgm.similarity_threshold = 0.2; -- lower = more results
```

**Option B — Levenshtein distance:**
Best for exact typo counting.
```sql
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

SELECT name, levenshtein(name, 'johm doe') as distance
FROM users
WHERE levenshtein(name, 'johm doe') <= 2  -- within 2 edits
ORDER BY distance ASC;
```

**Combined approach (FTS + fuzzy fallback):**
```sql
-- Try exact FTS first, fall back to fuzzy if no results
SELECT * FROM (
  SELECT *, ts_rank(search_vector, query) as rank, 'exact' as match_type
  FROM users, to_tsquery('english', $1) as query
  WHERE search_vector @@ query
  UNION ALL
  SELECT *, similarity(name, $2) as rank, 'fuzzy' as match_type
  FROM users
  WHERE similarity(name, $2) > 0.3
) combined
ORDER BY match_type, rank DESC
LIMIT 10;
```

Build for: [your specific fuzzy search use case].
```

---

## Search Autocomplete

```
Build autocomplete suggestions for: [what to complete]

**Behavior:**
- Trigger: after [N=2] characters typed
- Response time: <100ms
- Suggestions: top [N=10] results
- Matching: [prefix / anywhere / fuzzy]

**Implementation:**

**Database layer:**
```sql
-- Prefix search (fastest — uses B-Tree index)
CREATE INDEX CONCURRENTLY products_name_prefix_idx 
  ON products (name text_pattern_ops); -- enables LIKE 'query%'

-- Prefix query
SELECT id, name, category
FROM products
WHERE name ILIKE $1 || '%'  -- prefix match only
ORDER BY popularity_score DESC, name ASC
LIMIT 10;
```

**API route (Next.js):**
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  
  if (!q || q.length < 2) return Response.json([]);
  
  // Cache autocomplete results aggressively
  const cacheKey = `autocomplete:${q.toLowerCase()}`;
  const cached = await redis.get(cacheKey);
  if (cached) return Response.json(JSON.parse(cached));
  
  const results = await db.query(
    `SELECT id, name FROM products WHERE name ILIKE $1 LIMIT 10`,
    [q + '%']
  );
  
  await redis.setex(cacheKey, 300, JSON.stringify(results.rows)); // 5 min cache
  return Response.json(results.rows);
}
```

**Client-side (React with debounce):**
```typescript
const [query, setQuery] = useState('');
const [suggestions, setSuggestions] = useState([]);

// Debounce to avoid hammering the API
const debouncedQuery = useDebounce(query, 150);

useEffect(() => {
  if (debouncedQuery.length < 2) return setSuggestions([]);
  fetch(`/api/search/autocomplete?q=${encodeURIComponent(debouncedQuery)}`)
    .then(r => r.json())
    .then(setSuggestions);
}, [debouncedQuery]);
```

Build for: [your specific autocomplete requirements].
```

---

## Search Analytics

```
Track and improve search quality using analytics.

**Metrics to capture:**

**1. Zero results rate:**
```sql
-- Queries that returned 0 results
INSERT INTO search_events (query, results_count, user_id, created_at)
VALUES ($1, $2, $3, now());

-- Analyze zero-result queries
SELECT query, count(*) as frequency
FROM search_events
WHERE results_count = 0
AND created_at > now() - INTERVAL '7 days'
GROUP BY query
ORDER BY frequency DESC
LIMIT 20;
```
→ These are content gaps or queries needing synonym mapping.

**2. Search result click-through rate:**
```sql
-- Track which results users click
INSERT INTO search_clicks (query, clicked_item_id, rank_position, user_id)
VALUES ($1, $2, $3, $4);

-- CTR by rank position
SELECT rank_position, 
  count(*) as impressions,
  sum(case when clicked_item_id is not null then 1 else 0 end) as clicks,
  round(100.0 * sum(case when clicked_item_id is not null then 1 else 0 end) 
    / count(*), 1) as ctr_pct
FROM search_events
GROUP BY rank_position
ORDER BY rank_position;
```

**3. Search refinement rate:**
Users who search, then immediately search again (didn't find what they wanted).

**Actions to take based on analytics:**
- High zero results for [query] → add content or synonym mapping
- Low CTR at position 1 → ranking model needs tuning
- High refinement rate → search quality is poor for that query category

Build this analytics system for: [your application].
```
