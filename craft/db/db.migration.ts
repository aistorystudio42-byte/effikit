/**
 * @keywords    migration, seed, rollback, version, alter, up, down, changelog, database version
 * @domain      Database Migration
 * @use-when    Running schema migrations in order, tracking applied migrations, and rolling back failed ones
 * @not-when    You're using Prisma Migrate, Flyway, or Liquibase — they manage this for you
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Migration {
  id:          string;         // e.g. "20240101_000_create_users"
  name:        string;
  up:          (runner: MigrationRunner) => Promise<void>;
  down:        (runner: MigrationRunner) => Promise<void>;
  checksum?:   string;         // hash of migration content for drift detection
}

export interface MigrationRecord {
  id:          string;
  name:        string;
  applied_at:  Date;
  checksum?:   string;
  batch:       number;
}

export interface DatabaseAdapter {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<void>;
  transaction(fn: (adapter: DatabaseAdapter) => Promise<void>): Promise<void>;
}

// ─── MigrationRunner — Wraps DB adapter with migration-specific helpers ───────

export class MigrationRunner {
  constructor(private adapter: DatabaseAdapter) {}

  async execute(sql: string, params?: unknown[]): Promise<void> {
    return this.adapter.execute(sql, params);
  }

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    return this.adapter.query<T>(sql, params);
  }

  // DDL helpers for common migration operations
  async createTable(name: string, definition: string): Promise<void> {
    await this.execute(`CREATE TABLE IF NOT EXISTS ${name} (${definition})`);
  }

  async dropTable(name: string): Promise<void> {
    await this.execute(`DROP TABLE IF EXISTS ${name}`);
  }

  async addColumn(table: string, column: string, definition: string): Promise<void> {
    await this.execute(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
  }

  async dropColumn(table: string, column: string): Promise<void> {
    await this.execute(`ALTER TABLE ${table} DROP COLUMN IF EXISTS ${column}`);
  }

  async renameColumn(table: string, from: string, to: string): Promise<void> {
    await this.execute(`ALTER TABLE ${table} RENAME COLUMN ${from} TO ${to}`);
  }

  async alterColumn(table: string, column: string, definition: string): Promise<void> {
    await this.execute(`ALTER TABLE ${table} ALTER COLUMN ${column} ${definition}`);
  }

  async createIndex(name: string, table: string, columns: string[], unique = false): Promise<void> {
    await this.execute(`CREATE ${unique ? "UNIQUE " : ""}INDEX IF NOT EXISTS ${name} ON ${table} (${columns.join(", ")})`);
  }

  async dropIndex(name: string): Promise<void> {
    await this.execute(`DROP INDEX IF EXISTS ${name}`);
  }

  async addForeignKey(table: string, name: string, column: string, refTable: string, refColumn: string, onDelete = "CASCADE"): Promise<void> {
    await this.execute(`ALTER TABLE ${table} ADD CONSTRAINT ${name} FOREIGN KEY (${column}) REFERENCES ${refTable}(${refColumn}) ON DELETE ${onDelete}`);
  }

  async dropConstraint(table: string, name: string): Promise<void> {
    await this.execute(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${name}`);
  }
}

// ─── MigrationManager ─────────────────────────────────────────────────────────

const MIGRATIONS_TABLE = "effikit_migrations";

export class MigrationManager {
  private adapter:    DatabaseAdapter;
  private migrations: Migration[] = [];

  constructor(adapter: DatabaseAdapter) {
    this.adapter = adapter;
  }

  register(migration: Migration | Migration[]): this {
    const list = Array.isArray(migration) ? migration : [migration];
    this.migrations.push(...list);
    // Keep sorted by ID (lexicographic — ISO date prefix ensures order)
    this.migrations.sort((a, b) => a.id.localeCompare(b.id));
    return this;
  }

  // Ensure the tracking table exists
  private async ensureTable(): Promise<void> {
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id         VARCHAR(255) PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        checksum   VARCHAR(64),
        batch      INTEGER      NOT NULL DEFAULT 1
      )
    `);
  }

  private async getApplied(): Promise<MigrationRecord[]> {
    return this.adapter.query<MigrationRecord>(`SELECT * FROM ${MIGRATIONS_TABLE} ORDER BY applied_at ASC`);
  }

  private async getCurrentBatch(): Promise<number> {
    const rows = await this.adapter.query<{ max: number }>(`SELECT COALESCE(MAX(batch), 0) AS max FROM ${MIGRATIONS_TABLE}`);
    return (rows[0]?.max ?? 0);
  }

  // Run all pending migrations
  async up(): Promise<{ applied: string[]; skipped: string[] }> {
    await this.ensureTable();
    const applied    = await this.getApplied();
    const appliedIds = new Set(applied.map((r) => r.id));
    const pending    = this.migrations.filter((m) => !appliedIds.has(m.id));
    const batch      = (await this.getCurrentBatch()) + 1;
    const runner     = new MigrationRunner(this.adapter);
    const results    = { applied: [] as string[], skipped: [] as string[] };

    for (const migration of pending) {
      try {
        await this.adapter.transaction(async (tx) => {
          const txRunner = new MigrationRunner(tx);
          await migration.up(txRunner);
          await tx.execute(
            `INSERT INTO ${MIGRATIONS_TABLE} (id, name, batch, checksum) VALUES ($1, $2, $3, $4)`,
            [migration.id, migration.name, batch, migration.checksum ?? null]
          );
        });
        results.applied.push(migration.id);
        console.log(`  ✅ Applied: ${migration.id}`);
      } catch (err) {
        console.error(`  ❌ Failed: ${migration.id}`, err);
        throw err;
      }
    }

    if (pending.length === 0) console.log("  ℹ️  No pending migrations.");
    return results;
  }

  // Roll back the last batch
  async down(steps: number = 1): Promise<string[]> {
    await this.ensureTable();
    const applied    = await this.getApplied();
    const lastBatch  = await this.getCurrentBatch();
    const toRollback = applied.filter((r) => r.batch === lastBatch).slice(-steps);
    const rolled: string[] = [];

    for (const record of [...toRollback].reverse()) {
      const migration = this.migrations.find((m) => m.id === record.id);
      if (!migration) { console.warn(`  ⚠️  Migration not found: ${record.id}`); continue; }

      try {
        await this.adapter.transaction(async (tx) => {
          const txRunner = new MigrationRunner(tx);
          await migration.down(txRunner);
          await tx.execute(`DELETE FROM ${MIGRATIONS_TABLE} WHERE id = $1`, [record.id]);
        });
        rolled.push(record.id);
        console.log(`  ↩️  Rolled back: ${record.id}`);
      } catch (err) {
        console.error(`  ❌ Rollback failed: ${record.id}`, err);
        throw err;
      }
    }
    return rolled;
  }

  // List migration status
  async status(): Promise<Array<{ id: string; name: string; status: "applied" | "pending"; appliedAt?: Date; batch?: number }>> {
    await this.ensureTable();
    const applied = await this.getApplied();
    const appliedMap = new Map(applied.map((r) => [r.id, r]));

    return this.migrations.map((m) => {
      const record = appliedMap.get(m.id);
      return {
        id:        m.id,
        name:      m.name,
        status:    record ? "applied" : "pending",
        appliedAt: record?.applied_at,
        batch:     record?.batch,
      };
    });
  }
}

// ─── Migration factory — Creates a migration with consistent structure ─────────

export function defineMigration(
  id: string,
  name: string,
  ops: {
    up:   (runner: MigrationRunner) => Promise<void>;
    down: (runner: MigrationRunner) => Promise<void>;
  }
): Migration {
  return { id, name, up: ops.up, down: ops.down };
}

// ─── Example migrations ───────────────────────────────────────────────────────

export const createUsersMigration = defineMigration(
  "20240101_001_create_users",
  "Create users table",
  {
    async up(runner) {
      await runner.createTable("users", `
        id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        email      VARCHAR(255) NOT NULL UNIQUE,
        name       VARCHAR(100),
        role       VARCHAR(50)  NOT NULL DEFAULT 'viewer',
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      `);
      await runner.createIndex("idx_users_email", "users", ["email"], true);
      await runner.createIndex("idx_users_role",  "users", ["role"]);
    },
    async down(runner) {
      await runner.dropTable("users");
    },
  }
);

/*
 * Usage Example:
 *
 * const manager = new MigrationManager(myDatabaseAdapter);
 *
 * manager.register([
 *   createUsersMigration,
 *   defineMigration("20240102_002_create_posts", "Create posts table", {
 *     async up(runner) {
 *       await runner.createTable("posts", `
 *         id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *         user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 *         title   VARCHAR(255) NOT NULL,
 *         body    TEXT
 *       `);
 *     },
 *     async down(runner) { await runner.dropTable("posts"); }
 *   }),
 * ]);
 *
 * await manager.up();             // Apply all pending
 * await manager.down(1);          // Roll back last batch
 * const status = await manager.status();  // Show status of all migrations
 */
