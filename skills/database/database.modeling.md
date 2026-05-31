<!-- @keywords: database, schema design, normalization, relations, data modeling, PostgreSQL, indexes -->

# Database — Data Modeling and Schema Design

## Core Principles

A database schema is not just storage — it's a contract about what your data means. A well-designed schema makes invalid states unrepresentable, enforces business rules at the data layer, and remains easy to query efficiently.

---

## Normalization vs Denormalization

### When to Normalize (Default)
Normalization reduces redundancy and keeps data consistent. Use it unless you have a specific reason not to.

```sql
-- Normalized: user address is not duplicated across orders
CREATE TABLE users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE addresses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  street      VARCHAR(255) NOT NULL,
  city        VARCHAR(100) NOT NULL,
  country     CHAR(2)     NOT NULL, -- ISO 3166-1 alpha-2
  is_default  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- At most one default address per user
CREATE UNIQUE INDEX idx_addresses_default
  ON addresses (user_id) WHERE is_default = TRUE;
```

### When to Denormalize
Denormalize when join cost is consistently high and data changes rarely.

```sql
-- Denormalized order: snapshot shipping address at order time
-- Rationale: user can change their address later, but the order was placed with THIS address
CREATE TABLE orders (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES users(id),
  status              VARCHAR(50) NOT NULL DEFAULT 'pending',
  
  -- Snapshot of address at order time — intentional denormalization
  shipping_street     VARCHAR(255) NOT NULL,
  shipping_city       VARCHAR(100) NOT NULL,
  shipping_country    CHAR(2)      NOT NULL,
  
  total_cents         INTEGER      NOT NULL CHECK (total_cents >= 0),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

---

## Relationship Patterns

### One-to-Many
```sql
-- Standard: foreign key on the "many" side
CREATE TABLE posts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(500) NOT NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Many-to-Many
```sql
-- Junction table with composite primary key
CREATE TABLE post_tags (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id  UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- If the junction table needs its own attributes
CREATE TABLE user_roles (
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id    UUID        NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_by UUID        REFERENCES users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);
```

### Self-Referential (Tree Structures)
```sql
-- Adjacency list — simple, works for shallow trees
CREATE TABLE categories (
  id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID         REFERENCES categories(id) ON DELETE SET NULL,
  name      VARCHAR(100) NOT NULL,
  slug      VARCHAR(100) NOT NULL UNIQUE
);

-- For deep tree queries, use recursive CTE
WITH RECURSIVE category_tree AS (
  SELECT id, name, parent_id, 0 AS depth, ARRAY[id] AS path
  FROM categories
  WHERE parent_id IS NULL
  
  UNION ALL
  
  SELECT c.id, c.name, c.parent_id, ct.depth + 1, ct.path || c.id
  FROM categories c
  JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT * FROM category_tree ORDER BY path;
```

---

## Constraints — Enforce Business Rules at DB Level

```sql
CREATE TABLE products (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  sku         VARCHAR(50)   NOT NULL UNIQUE,
  name        VARCHAR(500)  NOT NULL CHECK (char_length(name) >= 3),
  price_cents INTEGER       NOT NULL CHECK (price_cents >= 0),
  stock       INTEGER       NOT NULL DEFAULT 0 CHECK (stock >= 0),
  status      VARCHAR(20)   NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'active', 'archived')),
  weight_kg   DECIMAL(8,3)  CHECK (weight_kg > 0),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Cross-column constraint
  CONSTRAINT active_product_has_price
    CHECK (status != 'active' OR price_cents > 0)
);
```

---

## Indexing Strategy

```sql
-- Primary key: automatic index (B-tree)

-- Foreign keys: always index (used in JOINs and ON DELETE)
CREATE INDEX idx_orders_user_id ON orders (user_id);
CREATE INDEX idx_posts_author_id ON posts (author_id);

-- Frequently filtered columns
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_users_email ON users (email); -- UNIQUE already creates this

-- Composite index: order matters — most selective or most used first
CREATE INDEX idx_orders_user_status ON orders (user_id, status);
-- Useful for: WHERE user_id = ? AND status = ?
-- Also useful for: WHERE user_id = ? (prefix match)
-- Not useful for: WHERE status = ? alone

-- Partial index: index only the rows you query
CREATE INDEX idx_orders_pending ON orders (created_at)
  WHERE status = 'pending';

-- Covering index: include columns to avoid table lookup
CREATE INDEX idx_posts_author_cover ON posts (author_id)
  INCLUDE (title, created_at);
```

### When to Add an Index
```
Query is slow → EXPLAIN ANALYZE → Seq Scan on large table → add index
Don't pre-add indexes — they slow down writes and consume space
Every index is a write penalty — measure before adding
```

---

## Audit Trail Pattern

```sql
-- Append-only audit log — never update, never delete
CREATE TABLE audit_logs (
  id          BIGSERIAL   PRIMARY KEY,
  table_name  VARCHAR(100) NOT NULL,
  record_id   UUID         NOT NULL,
  operation   VARCHAR(10)  NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  changed_by  UUID         REFERENCES users(id),
  changed_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Trigger to auto-log changes
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (table_name, record_id, operation, old_data, new_data, changed_by)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
    current_setting('app.current_user_id', TRUE)::UUID
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_audit
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

---

## Schema Design Checklist

- [ ] Primary keys are UUIDs (or BIGSERIAL for high-insert tables)
- [ ] All foreign keys have an explicit index
- [ ] Business rules enforced with CHECK constraints where possible
- [ ] `created_at` / `updated_at` timestamps on all mutable tables
- [ ] `updated_at` auto-updates via trigger or application logic
- [ ] Soft deletes use `deleted_at TIMESTAMPTZ` (not boolean `is_deleted`)
- [ ] Sensitive columns noted in schema comments
- [ ] No nullable columns where null has no distinct meaning
