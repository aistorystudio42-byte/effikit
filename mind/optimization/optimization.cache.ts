/**
 * @keywords    function memoization, memoize pure function, computation cache, lazy evaluation, trie-based memo, cache expensive calculation, dynamic programming memo
 * @domain      Optimization Cache
 * @use-when    Caching expensive pure function results to avoid redundant computation
 * @not-when    You need HTTP-level or database-level caching — use craft/api/api.cache.ts instead
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MemoOptions {
  maxSize?: number;      // Max number of cached entries (LRU eviction)
  ttlMs?: number;        // Time-to-live per entry in ms (0 = forever)
  keyFn?: (...args: unknown[]) => string; // Custom cache key serializer
}

interface CacheEntry<T> {
  value: T;
  createdAt: number;
  hits: number;
}

// ─── LRU Memoization ──────────────────────────────────────────────────────────

export class MemoCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private ttlMs: number;
  private keyFn: (...args: unknown[]) => string;
  private hits = 0;
  private misses = 0;

  constructor(options: MemoOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize ?? 1000;
    this.ttlMs = options.ttlMs ?? 0;
    this.keyFn = options.keyFn ?? defaultKeySerializer;
  }

  get(args: unknown[]): T | undefined {
    const key = this.keyFn(...args);
    const entry = this.cache.get(key);
    if (!entry) { this.misses++; return undefined; }

    // Check TTL
    if (this.ttlMs > 0 && Date.now() - entry.createdAt > this.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // LRU: move to end by re-inserting
    this.cache.delete(key);
    entry.hits++;
    this.cache.set(key, entry);
    this.hits++;
    return entry.value;
  }

  set(args: unknown[], value: T): void {
    const key = this.keyFn(...args);

    // Evict LRU entry if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }

    this.cache.set(key, { value, createdAt: Date.now(), hits: 0 });
  }

  invalidate(args: unknown[]): boolean {
    return this.cache.delete(this.keyFn(...args));
  }

  has(args: unknown[]): boolean {
    const key = this.keyFn(...args);
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check TTL
    if (this.ttlMs > 0 && Date.now() - entry.createdAt > this.ttlMs) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  clear(): void { this.cache.clear(); }

  get stats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
    };
  }
}

// ─── memoize() — Wraps any function with LRU caching ──────────────────────────

export function memoize<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  options?: MemoOptions
): (...args: TArgs) => TReturn {
  const cache = new MemoCache<TReturn>(options);

  return (...args: TArgs): TReturn => {
    if (cache.has(args)) return cache.get(args) as TReturn;
    const result = fn(...args);
    cache.set(args, result);
    return result;
  };
}

// ─── memoizeAsync() — Same but for async functions ────────────────────────────

export function memoizeAsync<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options?: MemoOptions
): (...args: TArgs) => Promise<TReturn> {
  const cache = new MemoCache<Promise<TReturn>>(options);

  return (...args: TArgs): Promise<TReturn> => {
    if (cache.has(args)) return cache.get(args) as Promise<TReturn>;

    // Cache the promise itself so concurrent calls share one in-flight request
    const promise = fn(...args).catch((err) => {
      cache.invalidate(args); // Remove failed promise so next call retries
      throw err;
    });

    cache.set(args, promise);
    return promise;
  };
}

// ─── Trie-based Prefix Cache ──────────────────────────────────────────────────
// Efficiently caches and retrieves results for string-prefix based queries (e.g., autocomplete)

interface TrieNode<T> {
  children: Map<string, TrieNode<T>>;
  value?: T;
}

export class PrefixCache<T> {
  private root: TrieNode<T> = { children: new Map() };

  set(key: string, value: T): void {
    let node = this.root;
    for (const char of key) {
      if (!node.children.has(char)) {
        node.children.set(char, { children: new Map() });
      }
      node = node.children.get(char)!;
    }
    node.value = value;
  }

  get(key: string): T | undefined {
    let node = this.root;
    for (const char of key) {
      if (!node.children.has(char)) return undefined;
      node = node.children.get(char)!;
    }
    return node.value;
  }

  // Returns the closest cached ancestor for a prefix (useful for progressive refinement)
  getClosestAncestor(key: string): { value: T; matchedPrefix: string } | undefined {
    let node = this.root;
    let last: { value: T; matchedPrefix: string } | undefined = 
      this.root.value !== undefined ? { value: this.root.value, matchedPrefix: "" } : undefined;

    for (let i = 0; i < key.length; i++) {
      const char = key[i];
      if (!node.children.has(char)) break;
      node = node.children.get(char)!;
      if (node.value !== undefined) {
        last = { value: node.value, matchedPrefix: key.slice(0, i + 1) };
      }
    }

    return last;
  }

  delete(key: string): boolean {
    const path: Array<{ node: TrieNode<T>; char: string }> = [];
    let node = this.root;

    for (const char of key) {
      if (!node.children.has(char)) return false;
      path.push({ node, char });
      node = node.children.get(char)!;
    }

    if (node.value === undefined) return false;
    delete node.value;

    // Prune empty leaf nodes bottom-up
    for (let i = path.length - 1; i >= 0; i--) {
      const { node: parent, char } = path[i];
      const child = parent.children.get(char)!;
      if (child.children.size === 0 && child.value === undefined) {
        parent.children.delete(char);
      }
    }

    return true;
  }
}

// ─── Dependency-tracked Computation Cache ─────────────────────────────────────
// When a dependency changes, all dependent computations are automatically invalidated

export class ReactiveCache<T> {
  private values = new Map<string, T>();
  private deps = new Map<string, Set<string>>(); // key → dep keys
  private rdeps = new Map<string, Set<string>>(); // dep key → dependent keys

  compute(key: string, dependencies: string[], compute: () => T): T {
    // Clean up old reverse dependencies
    const oldDeps = this.deps.get(key);
    if (oldDeps) {
      for (const dep of oldDeps) {
        this.rdeps.get(dep)?.delete(key);
      }
    }
    
    // Track dependencies
    this.deps.set(key, new Set(dependencies));
    for (const dep of dependencies) {
      if (!this.rdeps.has(dep)) this.rdeps.set(dep, new Set());
      this.rdeps.get(dep)!.add(key);
    }

    if (!this.values.has(key)) {
      this.values.set(key, compute());
    }

    return this.values.get(key)!;
  }

  invalidate(key: string): Set<string> {
    const invalidated = new Set<string>();
    this.invalidateRecursive(key, invalidated);
    return invalidated;
  }

  private invalidateRecursive(key: string, visited: Set<string>): void {
    if (visited.has(key)) return;
    visited.add(key);
    this.values.delete(key);

    const dependents = this.rdeps.get(key);
    if (dependents) {
      for (const dep of dependents) this.invalidateRecursive(dep, visited);
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultKeySerializer(...args: unknown[]): string {
  try {
    return JSON.stringify(args);
  } catch {
    return args.map(String).join("|");
  }
}

/*
 * Usage Example:
 *
 * // Memoize expensive pure function
 * const expensiveCalc = memoize((n: number) => fibonacci(n), { maxSize: 500 });
 * expensiveCalc(40); // computed
 * expensiveCalc(40); // cache hit
 *
 * // Memoize async API call with TTL
 * const fetchUser = memoizeAsync((id: string) => api.get(`/users/${id}`), { ttlMs: 60_000 });
 *
 * // Prefix cache for autocomplete
 * const pc = new PrefixCache<string[]>();
 * pc.set("rea", ["React", "Realm", "Read"]);
 * pc.get("rea"); // ["React", "Realm", "Read"]
 * pc.getClosestAncestor("react-dom"); // { value: [...], matchedPrefix: "rea" }
 */
