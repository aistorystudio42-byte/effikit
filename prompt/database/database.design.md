<!-- @keywords: database design, schema, data model, entity, relationship, normalization, postgres, SQL -->
<!-- @domain: Database Design Prompts -->

# Database Design Prompts

## Full Schema Design

```
Design a complete database schema for: [application name]

**Domain:**
[describe the application's purpose]

**Core entities:**
[list the main things the system needs to store — users, posts, orders, etc.]

**Key relationships:**
[describe how entities relate — User has many Posts, Order belongs to User, etc.]

**Design requirements:**
- Database: PostgreSQL
- Multi-tenant: [yes/no — if yes, how isolated?]
- Soft delete needed: [yes/no — which entities]
- Audit trail needed: [yes/no — which entities]
- Full-text search needed: [yes/no — which columns]

**Output per table:**
- CREATE TABLE with all columns, types, constraints
- Indexes for common query patterns
- Foreign keys with ON DELETE behavior
- Triggers for: updated_at, search vector, audit log

**Also include:**
- Row Level Security policies (Supabase/PostgreSQL)
- A seed script with realistic test data

**Design principles to follow:**
- Every table has UUID primary key with gen_random_uuid()
- created_at + updated_at on every table
- No nullable foreign keys where the relationship is required
- ENUM types for columns with a fixed set of valid values
```

---

## Normalization Analysis

```
Analyze this schema for normalization issues and improve it.

**Current schema:**
[paste CREATE TABLE statements or describe the tables]

**Problems to find:**
1NF violations:
- [ ] Repeating groups (multiple values in one column)
- [ ] Non-atomic values (comma-separated lists, JSON blobs hiding structure)

2NF violations:
- [ ] Partial dependencies (non-key column depends on part of composite key)

3NF violations:
- [ ] Transitive dependencies (column A → column B → column C, remove B)

Denormalization that's intentional vs accidental:
- [identify columns that are intentionally denormalized for performance]
- [identify columns that appear denormalized but shouldn't be]

**Output:**
- Normalized schema
- Migration SQL to transform old schema → new schema
- Impact on queries: which queries got simpler / more complex?
- When to intentionally denormalize back: [read-heavy scenarios]
```

---

## Time-Series Data Design

```
Design a schema for storing time-series data: [what's being tracked]

**Data characteristics:**
- Insert rate: [N events/second]
- Retention period: [N days / months / years]
- Query patterns:
  - Range queries: [events between T1 and T2]
  - Aggregations: [hourly/daily totals, moving averages]
  - Latest value: [most recent reading per device/user]

**Design considerations:**

**Partitioning:**
```sql
-- Partition by time range for efficient queries and data expiry
CREATE TABLE events (
  id BIGSERIAL,
  device_id UUID NOT NULL,
  value NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (recorded_at);

-- Auto-create monthly partitions
CREATE TABLE events_2025_05 PARTITION OF events
  FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
```

**TimescaleDB option:**
If using TimescaleDB extension:
```sql
SELECT create_hypertable('events', 'recorded_at', chunk_time_interval => INTERVAL '1 day');
```

**Indexes:**
- (device_id, recorded_at DESC) — most common query pattern
- BRIN index on recorded_at — very efficient for time-ordered data

**Aggregation tables:**
Pre-compute hourly/daily summaries as a materialized view or separate table
— avoids scanning millions of rows for dashboards.

Design the complete schema for [specific time-series use case].
```

---

## Multi-Tenancy Schema

```
Design a multi-tenant database schema for: [SaaS product]

**Isolation model — choose one:**

**Option A — Shared tables with tenant_id:**
All tenants share the same tables. Tenant isolation via RLS.
- Pros: simple to manage, cost-efficient
- Cons: noisy-neighbor risk, harder to migrate one tenant
- Best for: many small tenants

**Option B — Schema per tenant:**
Each tenant gets their own PostgreSQL schema (namespace).
- Pros: strong isolation, easy to migrate one tenant
- Cons: connection pool complexity, schema migrations multiply
- Best for: fewer larger tenants, compliance requirements

**Option C — Database per tenant:**
Each tenant gets their own database.
- Pros: maximum isolation, simplest per-tenant operations
- Cons: very high operational overhead, connection management
- Best for: enterprise clients with data residency requirements

**Recommendation for [your use case]:** [A / B / C] because [reason]

**Implement Option A:**
```sql
-- All tables have tenant_id
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  ...
);

-- RLS enforces tenant isolation
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON posts
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

Show: complete schema + RLS policies + application layer to set tenant context.
```

---

## Data Archival Strategy

```
Design a data archival strategy for: [application]

**Data volumes:**
- Table: [name], current size: [N rows / GB], growth: [N rows/day]
- Retention requirement: [active data < N months old, archive older]

**Archival approaches:**

**Option A — Partition-based archival:**
Move old partitions to cold storage (cheaper disk, slower queries).
```sql
-- Detach old partition from main table
ALTER TABLE events DETACH PARTITION events_2024_01;
-- Move to archive schema or tablespace
ALTER TABLE events_2024_01 SET TABLESPACE cold_storage;
```

**Option B — Archive table:**
Copy old rows to an `[table]_archive` table, delete from main.
```sql
-- Move old data to archive
WITH moved AS (
  DELETE FROM events
  WHERE recorded_at < now() - INTERVAL '6 months'
  RETURNING *
)
INSERT INTO events_archive SELECT * FROM moved;
```

**Option C — Export and delete:**
Export to S3/object storage in Parquet format, delete from DB.
Best for: data that's rarely queried but must be retained for compliance.

**Design for [specific use case]:**
- Archive trigger: [age / size / explicit business rule]
- Archive query access: [never / occasionally / must be fast]
- Compliance: [GDPR deletion must cascade to archive?]

Show: implementation + automated job to run archival on schedule.
```
