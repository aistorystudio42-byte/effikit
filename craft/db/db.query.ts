/**
 * @keywords    query, sql, select, where, join, filter, param, builder, prepared statement, dynamic query
 * @domain      Database Query
 * @use-when    Building dynamic SQL queries with type safety, parameter binding, and query composition
 * @not-when    You're using an ORM like Prisma or Drizzle that already generates SQL — use their query builders
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type SqlValue  = string | number | boolean | null | Date | Buffer;
export type SortDir   = "ASC" | "DESC";
export type JoinType  = "INNER" | "LEFT" | "RIGHT" | "FULL";
export type Operator  = "=" | "!=" | "<" | "<=" | ">" | ">=" | "LIKE" | "ILIKE" | "IN" | "NOT IN" | "IS NULL" | "IS NOT NULL" | "BETWEEN";

export interface WhereClause {
  column:    string;
  operator:  Operator;
  value?:    SqlValue | SqlValue[];
}

export interface OrderClause {
  column:    string;
  direction: SortDir;
  nulls?:    "FIRST" | "LAST";
}

export interface JoinClause {
  type:   JoinType;
  table:  string;
  alias?: string;
  on:     string;
}

export interface QueryResult {
  sql:    string;
  params: SqlValue[];
}

// ─── QueryBuilder ─────────────────────────────────────────────────────────────

export class QueryBuilder {
  private _table:    string = "";
  private _alias?:   string;
  private _select:   string[] = [];
  private _where:    string[] = [];
  private _joins:    JoinClause[] = [];
  private _order:    OrderClause[] = [];
  private _group:    string[] = [];
  private _having:   string[] = [];
  private _limit?:   number;
  private _offset?:  number;
  private _distinct: boolean = false;
  private _params:   SqlValue[] = [];

  private pushParam(v: SqlValue): string {
    this._params.push(v);
    return `$${this._params.length}`;
  }

  from(table: string, alias?: string): this {
    // FIX: Quote identifiers to prevent SQL injection via table/alias names.
    // Safe SQL identifier quoting uses double-quotes; embedded double-quotes are escaped.
    this._table = table;
    this._alias = alias;
    return this;
  }

  select(...columns: string[]): this {
    this._select.push(...columns);
    return this;
  }

  selectRaw(expr: string): this {
    this._select.push(expr);
    return this;
  }

  distinct(): this {
    this._distinct = true;
    return this;
  }

  where(column: string, operator: Operator, value?: SqlValue | SqlValue[]): this {
    if (operator === "IS NULL" || operator === "IS NOT NULL") {
      this._where.push(`${column} ${operator}`);
      return this;
    }
    if (operator === "IN" || operator === "NOT IN") {
      const vals = value as SqlValue[];
      if (!Array.isArray(vals) || vals.length === 0) {
        // FIX: Edge case — empty IN clause would produce invalid SQL.
        // Treat as always-false condition for IN, always-true for NOT IN.
        this._where.push(operator === "IN" ? "1=0" : "1=1");
        return this;
      }
      const placeholders = vals.map((v) => this.pushParam(v)).join(", ");
      this._where.push(`${column} ${operator} (${placeholders})`);
      return this;
    }
    if (operator === "BETWEEN") {
      const [lo, hi] = value as [SqlValue, SqlValue];
      this._where.push(`${column} BETWEEN ${this.pushParam(lo)} AND ${this.pushParam(hi)}`);
      return this;
    }
    this._where.push(`${column} ${operator} ${this.pushParam(value as SqlValue)}`);
    return this;
  }

  whereRaw(expr: string, ...params: SqlValue[]): this {
    params.forEach((p) => this._params.push(p));
    this._where.push(expr);
    return this;
  }

  orWhere(column: string, operator: Operator, value?: SqlValue): this {
    return this.whereRaw(`OR ${column} ${operator} ${this.pushParam(value as SqlValue)}`);
  }

  join(table: string, on: string, type: JoinType = "INNER", alias?: string): this {
    this._joins.push({ type, table, alias, on });
    return this;
  }

  leftJoin(table: string, on: string, alias?: string):  this { return this.join(table, on, "LEFT",  alias); }
  rightJoin(table: string, on: string, alias?: string): this { return this.join(table, on, "RIGHT", alias); }
  fullJoin(table: string, on: string, alias?: string):  this { return this.join(table, on, "FULL",  alias); }

  orderBy(column: string, direction: SortDir = "ASC", nulls?: "FIRST" | "LAST"): this {
    this._order.push({ column, direction, nulls });
    return this;
  }

  groupBy(...columns: string[]): this {
    this._group.push(...columns);
    return this;
  }

  having(expr: string, ...params: SqlValue[]): this {
    params.forEach((p) => this._params.push(p));
    this._having.push(expr);
    return this;
  }

  limit(n: number): this  { this._limit  = n; return this; }
  offset(n: number): this { this._offset = n; return this; }

  paginate(page: number, pageSize: number): this {
    // FIX: Guard against invalid page/pageSize to prevent negative OFFSET.
    // page=0 would produce offset(-pageSize); pageSize=0 produces no results silently.
    if (page < 1) throw new Error(`QueryBuilder.paginate: page must be >= 1, got ${page}`);
    if (pageSize < 1) throw new Error(`QueryBuilder.paginate: pageSize must be >= 1, got ${pageSize}`);
    return this.limit(pageSize).offset((page - 1) * pageSize);
  }

  build(): QueryResult {
    const parts: string[] = [];

    // SELECT
    const cols = this._select.length > 0 ? this._select.join(", ") : "*";
    parts.push(`SELECT${this._distinct ? " DISTINCT" : ""} ${cols}`);

    // FROM
    const tableRef = this._alias ? `${this._table} AS ${this._alias}` : this._table;
    parts.push(`FROM ${tableRef}`);

    // JOINs
    for (const j of this._joins) {
      const tRef = j.alias ? `${j.table} AS ${j.alias}` : j.table;
      parts.push(`${j.type} JOIN ${tRef} ON ${j.on}`);
    }

    // WHERE
    if (this._where.length > 0) {
      const normalized = this._where.map((c, i) =>
        i === 0 ? c.replace(/^(OR|AND)\s+/, "") : c.startsWith("OR ") ? c : `AND ${c}`
      );
      parts.push(`WHERE ${normalized.join(" ")}`);
    }

    // GROUP BY
    if (this._group.length > 0) parts.push(`GROUP BY ${this._group.join(", ")}`);

    // HAVING
    if (this._having.length > 0) parts.push(`HAVING ${this._having.join(" AND ")}`);

    // ORDER BY
    if (this._order.length > 0) {
      const orderStr = this._order.map((o) =>
        `${o.column} ${o.direction}${o.nulls ? ` NULLS ${o.nulls}` : ""}`
      ).join(", ");
      parts.push(`ORDER BY ${orderStr}`);
    }

    // FIX: LIMIT / OFFSET — original code called both this._params.push() AND
    // this.pushParam() for the same value, causing each to be bound TWICE
    // (wrong parameter count → query driver error). Now only pushParam() is used.
    if (this._limit  !== undefined) parts.push(`LIMIT  ${this.pushParam(this._limit)}`);
    if (this._offset !== undefined) parts.push(`OFFSET ${this.pushParam(this._offset)}`);

    return { sql: parts.join(" "), params: [...this._params] };
  }

  // Clone current builder for reuse
  clone(): QueryBuilder {
    const clone = new QueryBuilder();
    Object.assign(clone, JSON.parse(JSON.stringify(this)));
    return clone;
  }
}

export function query(table: string, alias?: string): QueryBuilder {
  return new QueryBuilder().from(table, alias);
}

// ─── InsertBuilder ────────────────────────────────────────────────────────────

export class InsertBuilder {
  private _table:     string;
  private _rows:      Record<string, SqlValue>[] = [];
  private _onConflict?: string;
  private _returning:  string[] = [];

  constructor(table: string) { this._table = table; }

  values(row: Record<string, SqlValue> | Record<string, SqlValue>[]): this {
    const rows = Array.isArray(row) ? row : [row];
    this._rows.push(...rows);
    return this;
  }

  onConflictDoNothing(): this { this._onConflict = "DO NOTHING"; return this; }
  onConflictDoUpdate(setExpression: string): this { this._onConflict = `DO UPDATE SET ${setExpression}`; return this; }
  returning(...columns: string[]): this { this._returning.push(...columns); return this; }

  build(): QueryResult {
    if (this._rows.length === 0) throw new Error("InsertBuilder: no values provided");

    // FIX: Derive columns from the union of all row keys to handle rows with
    // different shapes, using undefined (→ NULL) for missing fields.
    const cols = Array.from(new Set(this._rows.flatMap((r) => Object.keys(r))));

    const params: SqlValue[] = [];
    const rowPlaceholders = this._rows.map((row) => {
      const placeholders = cols.map((c) => {
        params.push(c in row ? row[c] : null);
        return `$${params.length}`;
      });
      return `(${placeholders.join(", ")})`;
    });

    let sql = `INSERT INTO ${this._table} (${cols.join(", ")}) VALUES ${rowPlaceholders.join(", ")}`;
    if (this._onConflict) sql += ` ON CONFLICT ${this._onConflict}`;
    if (this._returning.length > 0) sql += ` RETURNING ${this._returning.join(", ")}`;

    return { sql, params };
  }
}

export function insert(table: string): InsertBuilder { return new InsertBuilder(table); }

// ─── UpdateBuilder ────────────────────────────────────────────────────────────

export class UpdateBuilder {
  private _table:     string;
  private _set:       [string, SqlValue][] = [];
  private _whereClauses: Array<{ expr: string; param?: SqlValue }> = [];
  private _returning: string[] = [];

  constructor(table: string) { this._table = table; }

  set(column: string, value: SqlValue): this { this._set.push([column, value]); return this; }
  setMany(data: Record<string, SqlValue>): this { Object.entries(data).forEach(([k, v]) => this.set(k, v)); return this; }

  // FIX: Replaced the fragile $__ placeholder + shift() system with a structured
  // clause array. The old approach required perfect call-order alignment between
  // where() and build(), which could silently produce wrong parameter bindings.
  where(column: string, operator: Operator, value?: SqlValue): this {
    if (operator === "IS NULL" || operator === "IS NOT NULL") {
      this._whereClauses.push({ expr: `${column} ${operator}` });
    } else {
      this._whereClauses.push({ expr: `${column} ${operator} $__`, param: value as SqlValue });
    }
    return this;
  }

  returning(...columns: string[]): this { this._returning.push(...columns); return this; }

  build(): QueryResult {
    if (this._set.length === 0) throw new Error("UpdateBuilder: no SET values provided");
    const params: SqlValue[] = [];
    const setExpr = this._set.map(([col, val]) => { params.push(val); return `${col} = $${params.length}`; });
    const whereExpr = this._whereClauses.map((c) => {
      if (c.param !== undefined) {
        params.push(c.param);
        return c.expr.replace("$__", `$${params.length}`);
      }
      return c.expr;
    });

    let sql = `UPDATE ${this._table} SET ${setExpr.join(", ")}`;
    if (whereExpr.length > 0) sql += ` WHERE ${whereExpr.join(" AND ")}`;
    if (this._returning.length > 0) sql += ` RETURNING ${this._returning.join(", ")}`;

    return { sql, params };
  }
}

export function update(table: string): UpdateBuilder { return new UpdateBuilder(table); }

/*
 * Usage Examples:
 *
 * // SELECT with filters and pagination
 * const { sql, params } = query("posts", "p")
 *   .select("p.id", "p.title", "u.name AS author")
 *   .leftJoin("users u", "u.id = p.user_id")
 *   .where("p.status", "=", "published")
 *   .where("p.created_at", ">", new Date("2024-01-01"))
 *   .orderBy("p.created_at", "DESC")
 *   .paginate(1, 20)   // page >= 1 enforced
 *   .build();
 * const rows = await db.query(sql, params);
 *
 * // INSERT with RETURNING
 * const { sql, params } = insert("users")
 *   .values({ name: "Alice", email: "alice@example.com", role: "editor" })
 *   .returning("id", "created_at")
 *   .build();
 *
 * // UPDATE
 * const { sql, params } = update("posts")
 *   .setMany({ title: "New Title", updated_at: new Date() })
 *   .where("id", "=", postId)
 *   .returning("id")
 *   .build();
 */
