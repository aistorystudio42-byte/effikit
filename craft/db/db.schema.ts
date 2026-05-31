/**
 * @keywords    schema, model, table, type, zod, prisma, drizzle, field, column, relation, validation
 * @domain      Database Schema
 * @use-when    Defining typed database models, runtime validation schemas, and table column definitions
 * @not-when    You're already using Prisma or Drizzle — they provide their own schema DSLs
 */

import { z } from "zod";

// ─── Column Types ─────────────────────────────────────────────────────────────

export type ColumnType =
  | "text" | "varchar" | "char"
  | "integer" | "bigint" | "smallint" | "serial" | "bigserial"
  | "numeric" | "decimal" | "float" | "double"
  | "boolean"
  | "date" | "timestamp" | "timestamptz" | "time"
  | "uuid"
  | "json" | "jsonb"
  | "bytea"
  | "enum";

export interface ColumnDefinition {
  type:         ColumnType;
  primaryKey?:  boolean;
  unique?:      boolean;
  nullable?:    boolean;
  default?:     unknown;
  references?:  { table: string; column: string; onDelete?: "CASCADE" | "SET NULL" | "RESTRICT" };
  enumValues?:  readonly string[];
  length?:      number;
  precision?:   number;
  scale?:       number;
  index?:       boolean;
  check?:       string;
}

// ─── Schema Builder ───────────────────────────────────────────────────────────

export type SchemaColumns = Record<string, ColumnDefinition>;

export interface TableSchema<T extends SchemaColumns> {
  tableName:  string;
  columns:    T;
  indexes?:   Array<{ columns: (keyof T)[]; unique?: boolean; name?: string }>;
  checks?:    string[];
}

export function defineTable<T extends SchemaColumns>(schema: TableSchema<T>): TableSchema<T> {
  return schema;
}

// ─── SQL DDL Generator ────────────────────────────────────────────────────────

const typeToSql: Record<ColumnType, string> = {
  text:        "TEXT",
  varchar:     "VARCHAR",
  char:        "CHAR",
  integer:     "INTEGER",
  bigint:      "BIGINT",
  smallint:    "SMALLINT",
  serial:      "SERIAL",
  bigserial:   "BIGSERIAL",
  numeric:     "NUMERIC",
  decimal:     "DECIMAL",
  float:       "FLOAT",
  double:      "DOUBLE PRECISION",
  boolean:     "BOOLEAN",
  date:        "DATE",
  timestamp:   "TIMESTAMP",
  timestamptz: "TIMESTAMPTZ",
  time:        "TIME",
  uuid:        "UUID",
  json:        "JSON",
  jsonb:       "JSONB",
  bytea:       "BYTEA",
  enum:        "TEXT",  // use CHECK constraint or custom type
};

export function generateCreateTable<T extends SchemaColumns>(schema: TableSchema<T>): string {
  const columns = Object.entries(schema.columns).map(([name, col]) => {
    const def = col as ColumnDefinition;
    let sql = `  ${name} `;

    if (def.type === "varchar" && def.length) sql += `VARCHAR(${def.length})`;
    else if (def.type === "numeric" && def.precision) sql += `NUMERIC(${def.precision}${def.scale ? `,${def.scale}` : ""})`;
    else sql += typeToSql[def.type];

    if (def.primaryKey) sql += " PRIMARY KEY";
    if (def.unique)     sql += " UNIQUE";
    if (!def.nullable && !def.primaryKey) sql += " NOT NULL";
    if (def.default !== undefined) {
      const dv = typeof def.default === "string" ? `'${def.default}'` : def.default;
      sql += ` DEFAULT ${dv}`;
    }
    if (def.references) {
      sql += ` REFERENCES ${def.references.table}(${def.references.column})`;
      if (def.references.onDelete) sql += ` ON DELETE ${def.references.onDelete}`;
    }
    if (def.check) sql += ` CHECK (${def.check})`;
    return sql;
  });

  const lines = [`CREATE TABLE IF NOT EXISTS ${schema.tableName} (`, ...columns.map((c, i) => c + (i < columns.length - 1 ? "," : "")), ");"];

  // Indexes
  const indexes = (schema.indexes ?? []).map((idx) => {
    const name = idx.name ?? `idx_${schema.tableName}_${(idx.columns as string[]).join("_")}`;
    const unique = idx.unique ? "UNIQUE " : "";
    return `CREATE ${unique}INDEX IF NOT EXISTS ${name} ON ${schema.tableName} (${(idx.columns as string[]).join(", ")});`;
  });

  return [...lines, ...indexes].join("\n");
}

// ─── Zod Schema Generator ─────────────────────────────────────────────────────
// Automatically creates Zod validation from column definitions

type ZodType = z.ZodTypeAny;

function columnToZod(col: ColumnDefinition): ZodType {
  let schema: ZodType;

  switch (col.type) {
    case "text":
    case "varchar":
    case "char":
      schema = col.length ? z.string().max(col.length) : z.string();
      break;
    case "uuid":
      schema = z.string().uuid();
      break;
    case "integer":
    case "smallint":
    case "bigint":
    case "serial":
    case "bigserial":
      schema = z.number().int();
      break;
    case "numeric":
    case "decimal":
    case "float":
    case "double":
      schema = z.number();
      break;
    case "boolean":
      schema = z.boolean();
      break;
    case "date":
    case "timestamp":
    case "timestamptz":
      schema = z.union([z.date(), z.string().datetime()]);
      break;
    case "json":
    case "jsonb":
      schema = z.unknown();
      break;
    case "enum":
      if (col.enumValues && col.enumValues.length > 0) {
        schema = z.enum(col.enumValues as [string, ...string[]]);
      } else {
        schema = z.string();
      }
      break;
    default:
      schema = z.unknown();
  }

  if (col.nullable) schema = schema.nullable().optional();
  return schema;
}

export function generateZodSchema<T extends SchemaColumns>(
  schema: TableSchema<T>,
  options: { omit?: (keyof T)[]; partial?: boolean } = {}
): z.ZodObject<Record<string, ZodType>> {
  const shape: Record<string, ZodType> = {};

  for (const [name, col] of Object.entries(schema.columns)) {
    if (options.omit?.includes(name as keyof T)) continue;
    shape[name] = columnToZod(col as ColumnDefinition);
  }

  const obj = z.object(shape);
  return options.partial ? (obj.partial() as unknown as z.ZodObject<Record<string, ZodType>>) : obj;
}

// ─── Pre-built common schemas ─────────────────────────────────────────────────

export const timestamps = {
  created_at: { type: "timestamptz" as const, default: "NOW()", nullable: false },
  updated_at: { type: "timestamptz" as const, default: "NOW()", nullable: false },
};

export const softDelete = {
  deleted_at: { type: "timestamptz" as const, nullable: true },
};

export const primaryId = {
  id: { type: "uuid" as const, primaryKey: true, default: "gen_random_uuid()" },
};

export const serialId = {
  id: { type: "serial" as const, primaryKey: true },
};

// ─── Example table definitions ────────────────────────────────────────────────

export const UsersTable = defineTable({
  tableName: "users",
  columns: {
    ...primaryId,
    email:      { type: "varchar", length: 255, unique: true, nullable: false },
    name:       { type: "varchar", length: 100, nullable: true },
    role:       { type: "enum", enumValues: ["admin", "editor", "viewer"] as const, default: "viewer" },
    avatar_url: { type: "text", nullable: true },
    ...timestamps,
    ...softDelete,
  },
  indexes: [
    { columns: ["email"], unique: true },
    { columns: ["role"] },
  ],
});

export type UserRow = {
  id:         string;
  email:      string;
  name:       string | null;
  role:       "admin" | "editor" | "viewer";
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export const UserInsertSchema = generateZodSchema(UsersTable, { omit: ["id", "created_at", "updated_at", "deleted_at"] });
export const UserUpdateSchema = generateZodSchema(UsersTable, { omit: ["id", "created_at", "updated_at", "deleted_at"], partial: true });

/*
 * Usage Examples:
 *
 * // Generate DDL
 * console.log(generateCreateTable(UsersTable));
 *
 * // Validate incoming data
 * const result = UserInsertSchema.safeParse(req.body);
 * if (!result.success) return res.status(400).json({ errors: result.error.format() });
 *
 * // Define your own table
 * const PostsTable = defineTable({
 *   tableName: "posts",
 *   columns: {
 *     ...primaryId,
 *     user_id:  { type: "uuid",    nullable: false, references: { table: "users", column: "id", onDelete: "CASCADE" } },
 *     title:    { type: "varchar", length: 255, nullable: false },
 *     content:  { type: "text",    nullable: true },
 *     status:   { type: "enum",    enumValues: ["draft", "published", "archived"] as const },
 *     ...timestamps,
 *   },
 * });
 */
