<!-- @keywords: migrations, schema changes, rollback, versioning, database evolution, zero downtime -->

# Database — Migrations and Schema Evolution

## Migration Philosophy

A migration is a unit of intentional schema change. It must be: **reversible** (can roll back), **idempotent** (safe to run twice), and **non-destructive** to existing data unless explicitly intended.

Never modify a migration that has already been run in production. Write a new migration instead.

---

## Migration File Structure

```typescript
// migrations/20240315_add_user_tier.ts

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table
      .enum('tier', ['free', 'pro', 'enterprise'])
      .notNullable()
      .defaultTo('free')
      .comment('Subscription tier. Determines feature access.');
  });

  // Backfill existing rows if needed
  await knex('users').update({ tier: 'free' });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('tier');
  });
}
```

---

## Zero-Downtime Migration Patterns

Adding a column and deploying code that uses it in one step is risky — the old code runs while the migration is in progress.

### The Expand-Contract Pattern

```
Step 1 (Expand):   Add new column as nullable
Step 2 (Deploy):   Deploy code that writes to both old and new column
Step 3 (Backfill): Fill new column for existing rows
Step 4 (Constrain): Add NOT NULL constraint and index
Step 5 (Contract): Deploy code that only uses new column
Step 6 (Cleanup):  Drop old column in a final migration
```

```typescript
// Step 1: Expand — add nullable column
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.string('display_name', 100).nullable(); // was stored in 'name'
  });
}

// Step 3: Backfill — separate migration
export async function up(knex: Knex): Promise<void> {
  // Batch update — don't lock the whole table
  let offset = 0;
  const batchSize = 1000;
  
  while (true) {
    const updated = await knex('users')
      .whereNull('display_name')
      .update({ display_name: knex.raw('name') })
      .limit(batchSize);
    
    if (updated === 0) break;
    offset += batchSize;
    await new Promise(r => setTimeout(r, 50)); // brief pause between batches
  }
}

// Step 4: Constrain — add NOT NULL + index
export async function up(knex: Knex): Promise<void> {
  // CONCURRENTLY doesn't lock — safe on live table
  await knex.raw(`
    CREATE INDEX CONCURRENTLY idx_users_display_name
    ON users (display_name)
  `);
  
  await knex.schema.alterTable('users', (table) => {
    table.string('display_name', 100).notNullable().alter();
  });
}
```

---

## Dangerous Operations and Safe Alternatives

### Adding NOT NULL Column
```sql
-- DANGEROUS: Locks entire table while backfilling (can take minutes on large tables)
ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';

-- SAFE: Three-step approach
-- Step 1: Add as nullable
ALTER TABLE users ADD COLUMN status VARCHAR(20);

-- Step 2: Backfill in batches (application code)
UPDATE users SET status = 'active' WHERE status IS NULL AND id IN (
  SELECT id FROM users WHERE status IS NULL LIMIT 1000
);

-- Step 3: Add constraint
ALTER TABLE users ALTER COLUMN status SET NOT NULL;
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'active';
```

### Renaming a Column
```sql
-- DANGEROUS in one step: Old code breaks immediately
ALTER TABLE users RENAME COLUMN email TO email_address;

-- SAFE: Expand-contract
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN email_address VARCHAR(255);
-- Step 2: Deploy code writing to both
-- Step 3: Backfill
UPDATE users SET email_address = email;
-- Step 4: Add NOT NULL
ALTER TABLE users ALTER COLUMN email_address SET NOT NULL;
-- Step 5: Deploy code only reading new column
-- Step 6: Drop old column
ALTER TABLE users DROP COLUMN email;
```

### Creating an Index
```sql
-- DANGEROUS: Locks table during index build
CREATE INDEX idx_users_email ON users (email);

-- SAFE: Build concurrently (doesn't lock)
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);
-- Note: CONCURRENTLY cannot run inside a transaction
```

---

## Migration Tracking and Versioning

```typescript
// knexfile.ts
export default {
  client: 'postgresql',
  connection: process.env.DATABASE_URL,
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
    extension: 'ts',
  },
};

// Migration naming convention
// YYYYMMDDHHMMSS_short_description.ts
// 20240315143022_add_user_display_name.ts
// 20240316090000_create_subscription_table.ts
// 20240316100000_add_subscription_status_index.ts
```

---

## Rollback Strategy

```typescript
// Always write the down() function — even if you plan to never use it
export async function down(knex: Knex): Promise<void> {
  // Reverse of up() in reverse order
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('tier');
  });
}

// For destructive migrations (dropping columns), save the data first
export async function up(knex: Knex): Promise<void> {
  // Archive before dropping
  await knex.raw(`
    CREATE TABLE users_legacy_profile_backup AS
    SELECT id, profile_json FROM users;
  `);
  
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('profile_json');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Restore from backup
  await knex.schema.alterTable('users', (table) => {
    table.jsonb('profile_json');
  });
  
  await knex.raw(`
    UPDATE users u
    SET profile_json = b.profile_json
    FROM users_legacy_profile_backup b
    WHERE b.id = u.id;
  `);
}
```

---

## Migration Checklist

- [ ] Migration filename includes timestamp (for ordering)
- [ ] `up()` and `down()` both implemented
- [ ] Large table changes use batching, not single UPDATE
- [ ] New indexes created with `CONCURRENTLY`
- [ ] NOT NULL columns added as nullable first, then constrained
- [ ] Migration tested on a copy of production data before deploying
- [ ] Destructive operations (DROP COLUMN) delayed until old code is fully retired
- [ ] No migration modifies already-run migrations
