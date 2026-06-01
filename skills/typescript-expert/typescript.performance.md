<!-- @keywords: TypeScript performance, compilation speed, instantiation depth, combinatorial explosion, interface vs type alias, project references, incremental compilation, tsc performance, build time -->

# Check time:      44.3s

## Core Philosophy

TypeScript compilation should be fast enough that developers don't think about it. When compile times cross 10 seconds, developers start skipping type checks. When they cross 30 seconds, they disable strict mode. The performance of your type system directly determines whether it gets used correctly.

Most TypeScript performance problems have one of three causes: instantiation depth limits hit by over-engineered generics, combinatorial explosion from union types, or missing project references causing full re-compilation.

---

## When to Activate

- `tsc --noEmit` takes more than 10 seconds
- IDE autocomplete lags by more than 1 second
- Type errors appear long after file saves
- Monorepo builds with many TypeScript packages

---

## Principles

### Profiling First
Before optimizing, measure:

```bash
tsc --noEmit --extendedDiagnostics 2>&1 | grep -E "Files|Instantiations|Check time"

tsc --noEmit --diagnostics

tsc --noEmit --generateTrace ./trace-output
```

Key metrics to watch:
- **Instantiations count** > 1M signals a type explosion
- **Check time** > 5s on a modern machine means real structural issues
- **Files loaded** — are you accidentally including `node_modules` source?

---

### Interface vs Type Alias Performance
Interfaces are cached by the compiler after the first check. Type aliases with complex intersections and conditionals are re-evaluated on each use.

```ts
// SLOW — type alias with intersection re-evaluated each time
type UserWithPermissions = User & Permission & AuditInfo & { readonly id: string };

// FASTER — interface caches the shape
interface UserWithPermissions extends User, Permission, AuditInfo {
  readonly id: string;
}
```

**Rule:** For object shapes that are used in many places, prefer `interface` over `type`. Use `type` for unions, primitionals, and complex computed types.

---

### Instantiation Depth Reduction
Deeply recursive conditional types cause exponential instantiation:

```ts
// SLOW — recursive generic with 20+ levels hits instantiation limit
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// FASTER — use depth limit parameter
type DeepReadonly<T, Depth extends number = 5> = Depth extends 0
  ? T
  : { readonly [P in keyof T]: T[P] extends object
      ? DeepReadonly<T[P], [-1, 0, 1, 2, 3, 4][Depth]>
      : T[P] };

// FASTEST for most cases — use library (type-fest) that handles this correctly
import type { ReadonlyDeep } from 'type-fest';
```

---

### Combinatorial Explosion Prevention
Union types multiply instantiations:

```ts
// EXPLOSION — 4 × 4 × 4 = 64 type combinations
type Status = 'a' | 'b' | 'c' | 'd';
type Priority = 'low' | 'med' | 'high' | 'crit';
type Category = 'bug' | 'feat' | 'docs' | 'chore';
type Issue = { status: Status; priority: Priority; category: Category };
// Any generic that distributes over Issue creates 64 instantiations

// CONTROLLED — use discriminated union at the top level instead
type Issue =
  | { kind: 'bug'; severity: 'low' | 'high' }
  | { kind: 'feat'; priority: 'low' | 'med' | 'high' }
  | { kind: 'docs' };
// Now conditionals only instantiate per kind, not across all combinations
```

---

### Project References
The single biggest build time improvement for monorepos:

```json
// packages/api/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist"
  },
  "references": [
    { "path": "../shared" },
    { "path": "../types" }
  ]
}
```

```bash
tsc --build --incremental

tsc --build --watch
```

With project references, TypeScript reads `.d.ts` files from built packages instead of re-type-checking their source — typically 60-80% build time reduction in monorepos.

---

## Decision Framework

- Evaluate the complexity of the task.
- Identify structural bottlenecks.
- Choose the simplest abstraction that solves the problem.

## Anti-Patterns

- Wildcard includes in tsconfig: `"include": ["**/*"]` pulls in test fixtures, build outputs, and node_modules internal types
- Circular references between project reference packages — tsc detects and errors
- Running `tsc` without `--incremental` in watch mode — full rebuild every file save
- `skipLibCheck: false` in large projects — type-checking all node_modules adds minutes

---

## Example in Action

45-second compile time fixed to under 8 seconds:

**Initial diagnosis:**
```bash
tsc --noEmit --extendedDiagnostics 2>&1
```

**Problem 1 — tsconfig includes too much:**
```json
// BEFORE
{ "include": ["src", "tests", "scripts", "**/*.ts"] }

// AFTER — explicit inclusions only
{ "include": ["src/**/*.ts"], "exclude": ["node_modules", "dist", "coverage"] }
```
Result: Files dropped from 2,847 to 891. Check time: 44s → 28s.

**Problem 2 — Recursive mapped type with deep unions:**
```ts
// BEFORE — found with trace analysis
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
// Used on a type with 15 nested levels — 3.8M instantiations from this alone

// AFTER — cap depth, use type-fest for production use
import type { PartialDeep } from 'type-fest';
```
Result: Instantiations dropped from 4.2M to 890K. Check time: 28s → 12s.

**Problem 3 — Missing incremental compilation:**
```json
// AFTER adding to tsconfig
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./node_modules/.cache/.tsbuildinfo"
  }
}
```
Result: Subsequent builds (nothing changed): 12s → 1.2s. Typical development build (1-3 files changed): 12s → 3-5s.

**Final state:** Cold build 8.2s (down from 44s). Incremental hot build 1-4s.
