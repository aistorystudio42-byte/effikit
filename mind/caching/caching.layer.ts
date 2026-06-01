/**
 * @keywords    multi-tier cache, L1 L2 cache hierarchy, in-memory plus Redis cache, write-through write-back policy, read-through cache, tiered cache coordination
 * @domain      Caching Layer
 * @use-when    Building a multi-tier cache (L1 in-memory + L2 Redis/file) with consistent read/write policies
 * @not-when    A single-level cache is sufficient — don't add layers you won't need
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CacheLayer<V = unknown> {
  name: string;
  get(key: string): Promise<V | undefined> | V | undefined;
  set(key: string, value: V, ttlMs?: number): Promise<void> | void;
  delete(key: string): Promise<boolean> | boolean;
  clear(): Promise<void> | void;
}

export type WritePolicy = "write-through" | "write-back" | "write-around";
export type ReadPolicy  = "read-through"  | "cache-aside";

export interface LayeredCacheConfig {
  writePolicy?: WritePolicy;
  readPolicy?:  ReadPolicy;
  writeback?: {
    intervalMs: number;   // How often to flush dirty keys to lower layers
    maxDirtyKeys?: number; // Force flush when this many dirty keys accumulate
  };
}

export interface LayeredCacheStats {
  layers: Array<{ name: string; hits: number; misses: number }>;
  totalRequests: number;
  overallHitRate: number;
}

// ─── LayeredCache ─────────────────────────────────────────────────────────────

export class LayeredCache<V = unknown> {
  private layers: CacheLayer<V>[];
  private config: Required<LayeredCacheConfig>;
  private hitCounts: number[];
  private missCounts: number[];
  private dirtyKeys: Map<string, { ttlMs?: number }> = new Map();
  private writebackTimer: ReturnType<typeof setInterval> | null = null;

  constructor(layers: CacheLayer<V>[], config: LayeredCacheConfig = {}) {
    if (layers.length === 0) throw new Error("LayeredCache requires at least one layer");
    this.layers = layers;
    this.hitCounts  = new Array(layers.length).fill(0);
    this.missCounts = new Array(layers.length).fill(0);

    this.config = {
      writePolicy: config.writePolicy ?? "write-through",
      readPolicy:  config.readPolicy  ?? "read-through",
      writeback: config.writeback ?? { intervalMs: 5000, maxDirtyKeys: 100 },
    };

    if (this.config.writePolicy === "write-back") {
      this.startWritebackTimer();
    }
  }

  async get(key: string): Promise<V | undefined> {
    for (let i = 0; i < this.layers.length; i++) {
      const value = await this.layers[i].get(key);

      if (value !== undefined) {
        this.hitCounts[i]++;

        // Read-through: backfill upper layers on cache miss
        if (this.config.readPolicy === "read-through" && i > 0) {
          for (let j = 0; j < i; j++) {
            await this.layers[j].set(key, value);
          }
        }

        return value;
      }

      this.missCounts[i]++;
    }

    return undefined;
  }

  async set(key: string, value: V, ttlMs?: number): Promise<void> {
    switch (this.config.writePolicy) {
      case "write-through":
        // Write to all layers synchronously
        await Promise.all(this.layers.map((l) => l.set(key, value, ttlMs)));
        break;

      case "write-back":
        // Write to L1 immediately, mark dirty for later flush to lower layers
        await this.layers[0].set(key, value, ttlMs);
        this.dirtyKeys.set(key, { ttlMs });
        if (this.dirtyKeys.size >= (this.config.writeback.maxDirtyKeys ?? 100)) {
          await this.flushDirtyKeys();
        }
        break;

      case "write-around":
        // Bypass cache — write directly to the last layer only
        await this.layers[this.layers.length - 1].set(key, value, ttlMs);
        break;
    }
  }

  async delete(key: string): Promise<void> {
    this.dirtyKeys.delete(key);
    await Promise.all(this.layers.map((l) => l.delete(key)));
  }

  async clear(): Promise<void> {
    this.dirtyKeys.clear();
    await Promise.all(this.layers.map((l) => l.clear()));
  }

  // Force flush all dirty keys from L1 down to lower layers (write-back mode)
  async flushDirtyKeys(): Promise<string[]> {
    if (this.dirtyKeys.size === 0) return [];
    const flushed: string[] = [];

    const keysToFlush = new Map(this.dirtyKeys);
    this.dirtyKeys.clear();

    for (const [key, { ttlMs }] of keysToFlush) {
      const value = await this.layers[0].get(key);
      if (value !== undefined) {
        for (let i = 1; i < this.layers.length; i++) {
          await this.layers[i].set(key, value, ttlMs);
        }
        flushed.push(key);
      }
    }

    return flushed;
  }

  get stats(): LayeredCacheStats {
    const layerStats = this.layers.map((l, i) => ({
      name: l.name,
      hits: this.hitCounts[i],
      misses: this.missCounts[i],
    }));

    const totalHits    = this.hitCounts.reduce((s, v) => s + v, 0);
    const totalMisses  = this.missCounts.reduce((s, v) => s + v, 0);
    const totalRequests = totalHits + totalMisses;

    return {
      layers: layerStats,
      totalRequests,
      overallHitRate: totalRequests === 0 ? 0 : totalHits / totalRequests,
    };
  }

  stopWriteback(): void {
    if (this.writebackTimer) {
      clearInterval(this.writebackTimer);
      this.writebackTimer = null;
    }
  }

  dispose(): void {
    this.stopWriteback();
  }

  private startWritebackTimer(): void {
    this.writebackTimer = setInterval(
      () => this.flushDirtyKeys(),
      this.config.writeback.intervalMs
    );
  }
}

// ─── Adapter: Map → CacheLayer ────────────────────────────────────────────────
// Wraps an in-memory Map as a CacheLayer for use in LayeredCache

export function mapLayer<V>(name: string, maxSize?: number): CacheLayer<V> {
  const store = new Map<string, { value: V; expiresAt: number }>();

  return {
    name,
    get(key) {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) { store.delete(key); return undefined; }
      return entry.value;
    },
    set(key, value, ttlMs = 0) {
      if (maxSize && store.size >= maxSize && !store.has(key)) {
        // Simple FIFO eviction when map is full
        const firstKey = store.keys().next().value;
        if (firstKey !== undefined) store.delete(firstKey);
      }
      store.set(key, { value, expiresAt: ttlMs > 0 ? Date.now() + ttlMs : 0 });
    },
    delete(key) { return store.delete(key); },
    clear() { store.clear(); },
  };
}

// ─── Adapter: Async Store → CacheLayer ────────────────────────────────────────
// Wraps any async key-value store (e.g., Redis client) as a CacheLayer

export function asyncStoreLayer<V>(
  name: string,
  store: {
    get(key: string): Promise<V | undefined>;
    set(key: string, value: V, ttlMs?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
  }
): CacheLayer<V> {
  return {
    name,
    get: (key) => store.get(key),
    set: (key, value, ttlMs) => store.set(key, value, ttlMs),
    delete: (key) => store.delete(key).then(() => true),
    clear: () => store.clear(),
  };
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createLayeredCache<V = unknown>(
  layers: CacheLayer<V>[],
  config?: LayeredCacheConfig
): LayeredCache<V> {
  return new LayeredCache(layers, config);
}

/*
 * Usage Example:
 *
 * // L1: small in-memory LRU, L2: larger in-memory store, L3: Redis
 * const cache = createLayeredCache([
 *   mapLayer("L1-memory", 100),
 *   mapLayer("L2-memory", 10_000),
 *   asyncStoreLayer("L3-redis", redisAdapter),
 * ], {
 *   writePolicy: "write-through",
 *   readPolicy: "read-through",
 * });
 *
 * await cache.set("user:42", userData);
 * // Writes to L1, L2, L3 simultaneously
 *
 * const user = await cache.get("user:42");
 * // Checks L1 first → cache hit → returns immediately
 * // If L1 miss, checks L2 → hit → backfills L1, returns
 * // If L2 miss, checks L3 → hit → backfills L1+L2, returns
 */
