/**
 * @keywords    HTTP response cache, stale-while-revalidate, swr cache, revalidate fetch, cache-first, network-first, request deduplication, client-side fetch cache, offline-first data
 * @domain      API Cache
 * @use-when    Caching API responses to reduce network requests, implementing stale-while-revalidate, or offline-first patterns
 * @not-when    Server-side rendering cache or database query cache — this is for client-side HTTP response caching
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type CacheStrategy =
  | "cache-first"          // Return cached value, fetch in background only if stale
  | "network-first"        // Always fetch, fall back to cache on failure
  | "stale-while-revalidate" // Return cached immediately, revalidate in background
  | "network-only"         // Never cache — always fetch
  | "cache-only";          // Never fetch — only return cached (or undefined)

export interface CacheEntry<T> {
  data:       T;
  fetchedAt:  number;   // timestamp
  expiresAt:  number;   // timestamp (fetchedAt + ttl)
  staleAt:    number;   // timestamp (fetchedAt + staleTtl)
  key:        string;
  size:       number;   // approximate bytes
}

export interface CacheOptions {
  ttl?:       number;   // time-to-live in ms (default: 5 minutes)
  staleTtl?:  number;   // how long to serve stale before expiry (default: same as ttl)
  maxSize?:   number;   // max entries (LRU eviction when exceeded)
  strategy?:  CacheStrategy;
  tags?:      string[]; // for tag-based invalidation
}

// ─── CacheStore ───────────────────────────────────────────────────────────────

export class CacheStore<T = unknown> {
  private store    = new Map<string, CacheEntry<T>>();
  private tagIndex = new Map<string, Set<string>>();  // tag → keys
  private maxSize: number;
  private defaultTtl: number;
  private defaultStaleTtl: number;

  constructor(opts: { maxSize?: number; ttl?: number; staleTtl?: number } = {}) {
    this.maxSize         = opts.maxSize     ?? 500;
    this.defaultTtl      = opts.ttl         ?? 5 * 60 * 1000;  // 5 min
    this.defaultStaleTtl = opts.staleTtl    ?? this.defaultTtl;
  }

  set(key: string, data: T, opts: CacheOptions = {}): void {
    const ttl      = opts.ttl      ?? this.defaultTtl;
    const staleTtl = opts.staleTtl ?? this.defaultStaleTtl;
    const now      = Date.now();

    const entry: CacheEntry<T> = {
      key,
      data,
      fetchedAt: now,
      expiresAt: now + ttl,
      staleAt:   now + staleTtl,
      size:      estimateSize(data),
    };

    // LRU eviction: remove oldest entry when at capacity
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.evict(oldest);
    }

    // Move to end (most recently used) by delete + re-insert
    this.store.delete(key);
    this.store.set(key, entry);

    // Tag index
    opts.tags?.forEach((tag) => {
      const tagSet = this.tagIndex.get(tag) ?? new Set();
      tagSet.add(key);
      this.tagIndex.set(tag, tagSet);
    });
  }

  get(key: string): CacheEntry<T> | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { this.evict(key); return null; }

    // Touch: move to end for LRU
    this.store.delete(key);
    this.store.set(key, entry);
    return entry;
  }

  isStale(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return true;
    return Date.now() > entry.staleAt;
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    return Date.now() <= entry.expiresAt;
  }

  evict(key: string): void {
    this.store.delete(key);
    this.tagIndex.forEach((keys) => keys.delete(key));
  }

  invalidateByTag(tag: string): void {
    const keys = this.tagIndex.get(tag);
    if (!keys) return;
    keys.forEach((k) => this.store.delete(k));
    this.tagIndex.delete(tag);
  }

  invalidateByPrefix(prefix: string): void {
    for (const key of Array.from(this.store.keys())) {
      if (key.startsWith(prefix)) this.evict(key);
    }
  }

  clear(): void { this.store.clear(); this.tagIndex.clear(); }

  get size(): number  { return this.store.size; }
  get keys(): string[] { return Array.from(this.store.keys()); }
}

// ─── RequestCache — Wraps fetch with full caching strategies ─────────────────

interface RequestCacheConfig {
  store?:    CacheStore<unknown>;
  strategy?: CacheStrategy;
  ttl?:      number;
  staleTtl?: number;
  keyFn?:    (url: string, init?: RequestInit) => string;
}

export class RequestCache {
  private store:    CacheStore<unknown>;
  private strategy: CacheStrategy;
  private ttl:      number;
  private staleTtl: number;
  private keyFn:    (url: string, init?: RequestInit) => string;
  private inflight  = new Map<string, Promise<unknown>>();

  constructor(config: RequestCacheConfig = {}) {
    this.store    = config.store    ?? new CacheStore();
    this.strategy = config.strategy ?? "stale-while-revalidate";
    this.ttl      = config.ttl      ?? 5 * 60 * 1000;
    this.staleTtl = config.staleTtl ?? this.ttl;
    this.keyFn    = config.keyFn    ?? ((url) => url);
  }

  async fetch<T>(
    url: string,
    init?: RequestInit,
    overrides?: Partial<RequestCacheConfig> & { tags?: string[] }
  ): Promise<T> {
    const key      = this.keyFn(url, init);
    const strategy = overrides?.strategy ?? this.strategy;
    const ttl      = overrides?.ttl      ?? this.ttl;
    const staleTtl = overrides?.staleTtl ?? this.staleTtl;

    const doFetch = (): Promise<T> => {
      // Deduplicate concurrent identical requests
      if (this.inflight.has(key)) return this.inflight.get(key) as Promise<T>;

      const req = fetch(url, init)
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<T>; })
        .then((data) => {
          this.store.set(key, data, { ttl, staleTtl, tags: overrides?.tags });
          this.inflight.delete(key);
          return data;
        })
        .catch((err) => { this.inflight.delete(key); throw err; });

      this.inflight.set(key, req);
      return req;
    };

    switch (strategy) {
      case "network-only":
        return doFetch();

      case "cache-only": {
        const entry = this.store.get(key);
        if (!entry) throw new Error(`Cache miss for key: ${key}`);
        return entry.data as T;
      }

      case "cache-first": {
        const entry = this.store.get(key);
        if (entry) {
          // Revalidate in background only when stale
          if (this.store.isStale(key)) doFetch().catch(() => {});
          return entry.data as T;
        }
        return doFetch();
      }

      case "network-first":
        try { return await doFetch(); }
        catch {
          const entry = this.store.get(key);
          if (entry) return entry.data as T;
          throw new Error(`Network failed and no cached data for: ${url}`);
        }

      case "stale-while-revalidate":
      default: {
        const entry = this.store.get(key);
        if (entry) {
          // Always revalidate in background if stale — don't wait
          if (this.store.isStale(key)) doFetch().catch(() => {});
          return entry.data as T;
        }
        return doFetch();
      }
    }
  }

  invalidate(key: string)             { this.store.evict(key); }
  invalidateByTag(tag: string)        { this.store.invalidateByTag(tag); }
  invalidateByPrefix(prefix: string)  { this.store.invalidateByPrefix(prefix); }
  clear()                             { this.store.clear(); }
}

// ─── useRequestCache hook — React integration ─────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";

const DEFAULT_REQUEST_CACHE = new RequestCache();

export function useCachedFetch<T>(
  url: string | null,
  options: {
    strategy?: CacheStrategy;
    ttl?:      number;
    tags?:     string[];
    enabled?:  boolean;
    onSuccess?: (data: T) => void;
    onError?:   (error: Error) => void;
  } = {},
  cache: RequestCache = DEFAULT_REQUEST_CACHE
) {
  const { enabled = true, onSuccess, onError, strategy, ttl, tags } = options;
  const [data, setData]       = useState<T | null>(null);
  const [error, setError]     = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  // FIX: Stabilize callback and array refs to avoid dependency loops and JSON.stringify
  const tagsRef = useRef(tags);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  tagsRef.current = tags;
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const refetch = useCallback(async () => {
    if (!url || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await cache.fetch<T>(url, undefined, { strategy, ttl, tags: tagsRef.current });
      if (mountedRef.current) { setData(result); onSuccessRef.current?.(result); }
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      if (mountedRef.current) { setError(e); onErrorRef.current?.(e); }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [url, enabled, cache, strategy, ttl]);

  useEffect(() => {
    mountedRef.current = true;
    refetch();
    return () => { mountedRef.current = false; };
  }, [refetch]);

  return { data, error, loading, refetch };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function estimateSize(value: unknown): number {
  try { return JSON.stringify(value).length * 2; } // rough byte estimate
  catch { return 0; }
}

export { DEFAULT_REQUEST_CACHE as defaultCache };

/*
 * Usage Examples:
 *
 * // Create a shared cache for the app
 * const appCache = new RequestCache({ strategy: "stale-while-revalidate", ttl: 60_000 });
 *
 * // Fetch with cache (stale-while-revalidate)
 * const users = await appCache.fetch<User[]>("/api/users", undefined, { tags: ["users"] });
 *
 * // Invalidate after mutation
 * await api.post("/users", newUser);
 * appCache.invalidateByTag("users");
 *
 * // React hook
 * const { data, loading, refetch } = useCachedFetch<Product[]>("/api/products", {
 *   strategy: "cache-first",
 *   ttl: 5 * 60 * 1000,
 *   tags: ["products"],
 * }, appCache);
 */
