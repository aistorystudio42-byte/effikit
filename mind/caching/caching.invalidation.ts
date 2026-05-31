/**
 * @keywords    cache invalidation, dependency tracking, tag-based invalidation, versioning, purge, stale
 * @domain      Caching Invalidation
 * @use-when    Invalidating related cache entries when underlying data changes, using tags or dependencies
 * @not-when    Simple TTL expiry is sufficient — this is for event-driven invalidation
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InvalidationRule {
  id: string;
  trigger: string;           // Event type that triggers this rule
  pattern?: RegExp;          // Optional key pattern to restrict which entries are affected
  tags?: string[];           // Invalidate all entries with any of these tags
  cascade?: boolean;         // Also invalidate dependencies of matched entries
}

export interface TaggedCacheEntry<V> {
  key: string;
  value: V;
  tags: string[];
  dependencies: string[];    // Other cache keys this entry depends on
  version: number;
  cachedAt: number;
  ttlMs: number;
}

export interface InvalidationResult {
  invalidatedKeys: string[];
  cascaded: string[];        // Keys invalidated via cascade
  trigger: string;
  timestamp: number;
}

// ─── TaggedCache ──────────────────────────────────────────────────────────────

export class TaggedCache<V = unknown> {
  private store: Map<string, TaggedCacheEntry<V>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();    // tag → Set<key>
  private depIndex: Map<string, Set<string>> = new Map();    // dependency key → Set<dependent keys>
  private globalVersion = 0;

  set(
    key: string,
    value: V,
    options: { tags?: string[]; dependencies?: string[]; ttlMs?: number } = {}
  ): void {
    // Clean up old tag/dep index entries for this key
    this.removeFromIndexes(key);

    const entry: TaggedCacheEntry<V> = {
      key,
      value,
      tags: options.tags ?? [],
      dependencies: options.dependencies ?? [],
      version: ++this.globalVersion,
      cachedAt: Date.now(),
      ttlMs: options.ttlMs ?? 0,
    };

    this.store.set(key, entry);

    // Update tag index
    for (const tag of entry.tags) {
      if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
      this.tagIndex.get(tag)!.add(key);
    }

    // Update dependency index
    for (const dep of entry.dependencies) {
      if (!this.depIndex.has(dep)) this.depIndex.set(dep, new Set());
      this.depIndex.get(dep)!.add(key);
    }
  }

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.ttlMs > 0 && Date.now() - entry.cachedAt > entry.ttlMs) {
      this.invalidateKey(key);
      return undefined;
    }
    return entry.value;
  }

  // Invalidate by tag — removes all entries sharing this tag
  invalidateByTag(tag: string, cascade = false): InvalidationResult {
    const keys = [...(this.tagIndex.get(tag) ?? [])];
    return this.invalidateKeys(keys, `tag:${tag}`, cascade);
  }

  // Invalidate by key pattern
  invalidateByPattern(pattern: RegExp): InvalidationResult {
    const keys = [...this.store.keys()].filter((k) => pattern.test(k));
    return this.invalidateKeys(keys, `pattern:${pattern.source}`, false);
  }

  // Invalidate a specific key and optionally cascade to dependents
  invalidateKey(key: string, cascade = false): InvalidationResult {
    return this.invalidateKeys([key], `key:${key}`, cascade);
  }

  // Invalidate all entries depending on this key
  invalidateDependents(key: string): InvalidationResult {
    const dependents = [...(this.depIndex.get(key) ?? [])];
    return this.invalidateKeys(dependents, `dep:${key}`, true);
  }

  private invalidateKeys(keys: string[], trigger: string, cascade: boolean): InvalidationResult {
    const invalidated: string[] = [];
    const cascaded: string[] = [];
    const toProcess = [...keys];
    const seen = new Set<string>();

    while (toProcess.length > 0) {
      const key = toProcess.shift()!;
      if (seen.has(key)) continue;
      seen.add(key);

      if (!this.store.has(key)) continue;

      invalidated.push(key);
      this.removeFromIndexes(key);
      this.store.delete(key);

      if (cascade) {
        const dependents = [...(this.depIndex.get(key) ?? [])];
        cascaded.push(...dependents);
        toProcess.push(...dependents);
      }
    }

    return { invalidatedKeys: invalidated, cascaded: [...new Set(cascaded)], trigger, timestamp: Date.now() };
  }

  private removeFromIndexes(key: string): void {
    const entry = this.store.get(key);
    if (!entry) return;

    for (const tag of entry.tags) {
      this.tagIndex.get(tag)?.delete(key);
      if (this.tagIndex.get(tag)?.size === 0) this.tagIndex.delete(tag);
    }

    for (const dep of entry.dependencies) {
      this.depIndex.get(dep)?.delete(key);
    }

    // Remove as dependency of other entries
    this.depIndex.delete(key);
  }

  get size(): number { return this.store.size; }
  get version(): number { return this.globalVersion; }

  keys(): string[] { return [...this.store.keys()]; }
  entriesWithTag(tag: string): TaggedCacheEntry<V>[] {
    return [...(this.tagIndex.get(tag) ?? [])]
      .map((k) => this.store.get(k)!)
      .filter(Boolean);
  }
}

// ─── InvalidationRuleEngine ───────────────────────────────────────────────────

export class InvalidationRuleEngine<V = unknown> {
  private rules: InvalidationRule[] = [];
  private cache: TaggedCache<V>;

  constructor(cache: TaggedCache<V>) {
    this.cache = cache;
  }

  addRule(rule: InvalidationRule): this {
    this.rules.push(rule);
    return this;
  }

  removeRule(id: string): this {
    this.rules = this.rules.filter((r) => r.id !== id);
    return this;
  }

  // Trigger an event — applies all matching rules
  trigger(event: string, affectedKey?: string): InvalidationResult[] {
    const results: InvalidationResult[] = [];

    for (const rule of this.rules) {
      if (rule.trigger !== event) continue;
      if (rule.pattern && affectedKey && !rule.pattern.test(affectedKey)) continue;

      if (rule.tags) {
        for (const tag of rule.tags) {
          results.push(this.cache.invalidateByTag(tag, rule.cascade));
        }
      } else if (affectedKey) {
        results.push(this.cache.invalidateKey(affectedKey, rule.cascade));
      }
    }

    return results;
  }
}

// ─── Stale-While-Revalidate ───────────────────────────────────────────────────

export interface SWREntry<V> {
  value: V;
  cachedAt: number;
  staleAt: number;    // After this: serve stale, trigger background refresh
  expiredAt: number;  // After this: don't serve stale, must wait for fresh value
}

export class StaleWhileRevalidateCache<K = string, V = unknown> {
  private store: Map<string, SWREntry<V>> = new Map();
  private revalidating: Set<string> = new Set();
  private serializeKey: (key: K) => string;

  constructor(serializeKey?: (key: K) => string) {
    this.serializeKey = serializeKey ?? ((k) => String(k));
  }

  async get(
    key: K,
    fetcher: () => Promise<V>,
    options: { staleMs?: number; expireMs?: number } = {}
  ): Promise<V> {
    const k = this.serializeKey(key);
    const staleMs  = options.staleMs  ?? 60_000;    // 1 min fresh window
    const expireMs = options.expireMs ?? 300_000;    // 5 min hard expiry

    const entry = this.store.get(k);
    const now = Date.now();

    if (entry) {
      // Fully expired — must fetch synchronously
      if (now > entry.expiredAt) {
        const value = await fetcher();
        this.set(k, value, staleMs, expireMs);
        return value;
      }

      // Stale — serve cached value but trigger background refresh
      if (now > entry.staleAt && !this.revalidating.has(k)) {
        this.revalidating.add(k);
        fetcher()
          .then((v) => { this.set(k, v, staleMs, expireMs); })
          .finally(() => this.revalidating.delete(k));
      }

      return entry.value;
    }

    // Cache miss — fetch and store
    const value = await fetcher();
    this.set(k, value, staleMs, expireMs);
    return value;
  }

  private set(key: string, value: V, staleMs: number, expireMs: number): void {
    const now = Date.now();
    this.store.set(key, { value, cachedAt: now, staleAt: now + staleMs, expiredAt: now + expireMs });
  }

  invalidate(key: K): void { this.store.delete(this.serializeKey(key)); }
  get size(): number { return this.store.size; }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createTaggedCache<V = unknown>(): TaggedCache<V> {
  return new TaggedCache<V>();
}

export function createSWRCache<K = string, V = unknown>(): StaleWhileRevalidateCache<K, V> {
  return new StaleWhileRevalidateCache<K, V>();
}

/*
 * Usage Example:
 *
 * const cache = createTaggedCache<string>();
 *
 * // Store with tags and dependencies
 * cache.set("user:42", "Alice", { tags: ["user", "profile"], ttlMs: 300_000 });
 * cache.set("user:42:posts", "[...]", { tags: ["user", "posts"], dependencies: ["user:42"] });
 *
 * // Invalidate all "user" tagged entries (and cascade to dependents)
 * const { invalidatedKeys } = cache.invalidateByTag("user", true);
 * // Invalidated: ["user:42", "user:42:posts"]
 *
 * // SWR cache
 * const swr = createSWRCache<string, User>();
 * const user = await swr.get("user:42", () => api.fetchUser("42"), { staleMs: 60_000, expireMs: 300_000 });
 * // Returns cached value immediately, refreshes in background when stale
 */
