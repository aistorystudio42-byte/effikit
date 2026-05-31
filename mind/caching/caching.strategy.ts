/**
 * @keywords    LRU, LFU, TTL, cache eviction, in-memory cache, FIFO, ARC, cache policy
 * @domain      Caching Strategy
 * @use-when    Implementing in-memory caches with eviction policies: LRU, LFU, TTL, or hybrid
 * @not-when    You need distributed caching across nodes — use Redis for that
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CacheEntry<V> {
  key: string;
  value: V;
  createdAt: number;
  lastAccessedAt: number;
  ttlMs: number;    // 0 = no TTL
  hits: number;
  size: number;     // Logical size units (default 1)
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  expiredEvictions: number;
}

// ─── LRU Cache ────────────────────────────────────────────────────────────────
// Doubly-linked list + HashMap for O(1) get and put

interface LRUNode<V> {
  key: string;
  value: V;
  ttlMs: number;
  createdAt: number;
  hits: number;
  prev: LRUNode<V> | null;
  next: LRUNode<V> | null;
}

export class LRUCache<K = string, V = unknown> {
  private capacity: number;
  private map: Map<string, LRUNode<V>> = new Map();
  private head: LRUNode<V>;  // MRU sentinel
  private tail: LRUNode<V>;  // LRU sentinel
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private expired = 0;
  private serializeKey: (key: K) => string;

  constructor(capacity: number, serializeKey?: (key: K) => string) {
    this.capacity = capacity;
    this.serializeKey = serializeKey ?? ((k) => String(k));
    this.head = { key: "__head__", value: undefined as unknown as V, ttlMs: 0, createdAt: 0, hits: 0, prev: null, next: null };
    this.tail = { key: "__tail__", value: undefined as unknown as V, ttlMs: 0, createdAt: 0, hits: 0, prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key: K): V | undefined {
    const k = this.serializeKey(key);
    const node = this.map.get(k);
    if (!node) { this.misses++; return undefined; }

    // Check TTL
    if (node.ttlMs > 0 && Date.now() - node.createdAt > node.ttlMs) {
      this.remove(node);
      this.map.delete(k);
      this.misses++;
      this.expired++;
      return undefined;
    }

    // Move to head (most recently used)
    this.moveToHead(node);
    node.hits++;
    this.hits++;
    return node.value;
  }

  set(key: K, value: V, ttlMs = 0): void {
    const k = this.serializeKey(key);
    const existing = this.map.get(k);

    if (existing) {
      existing.value = value;
      existing.ttlMs = ttlMs;
      existing.createdAt = Date.now();
      this.moveToHead(existing);
      return;
    }

    if (this.map.size >= this.capacity) {
      const lru = this.tail.prev!;
      this.remove(lru);
      this.map.delete(lru.key);
      this.evictions++;
    }

    const node: LRUNode<V> = { key: k, value, ttlMs, createdAt: Date.now(), hits: 0, prev: null, next: null };
    this.map.set(k, node);
    this.addToHead(node);
  }

  delete(key: K): boolean {
    const k = this.serializeKey(key);
    const node = this.map.get(k);
    if (!node) return false;
    this.remove(node);
    this.map.delete(k);
    return true;
  }

  has(key: K): boolean { return this.map.has(this.serializeKey(key)); }
  clear(): void { this.map.clear(); this.head.next = this.tail; this.tail.prev = this.head; }
  get size(): number { return this.map.size; }
  get stats(): CacheStats {
    const total = this.hits + this.misses;
    return { size: this.map.size, maxSize: this.capacity, hits: this.hits, misses: this.misses, hitRate: total === 0 ? 0 : this.hits / total, evictions: this.evictions, expiredEvictions: this.expired };
  }

  // Evict all expired entries (call periodically)
  purgeExpired(): number {
    const toDelete: K[] = [];
    for (const [k, node] of this.map) {
      if (node.ttlMs > 0 && Date.now() - node.createdAt > node.ttlMs) {
        toDelete.push(k as unknown as K);
      }
    }
    for (const k of toDelete) this.delete(k);
    return toDelete.length;
  }

  private addToHead(node: LRUNode<V>): void {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next!.prev = node;
    this.head.next = node;
  }

  private remove(node: LRUNode<V>): void {
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
  }

  private moveToHead(node: LRUNode<V>): void {
    this.remove(node);
    this.addToHead(node);
  }
}

// ─── LFU Cache ────────────────────────────────────────────────────────────────
// Evicts least-frequently-used entries; O(1) average via frequency buckets

export class LFUCache<K = string, V = unknown> {
  private capacity: number;
  private values: Map<string, V> = new Map();
  private freq: Map<string, number> = new Map();
  private freqBuckets: Map<number, Set<string>> = new Map(); // freq → keys in insertion order
  private minFreq = 0;
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private serializeKey: (key: K) => string;

  constructor(capacity: number, serializeKey?: (key: K) => string) {
    this.capacity = capacity;
    this.serializeKey = serializeKey ?? ((k) => String(k));
  }

  get(key: K): V | undefined {
    const k = this.serializeKey(key);
    if (!this.values.has(k)) { this.misses++; return undefined; }
    this.incrementFreq(k);
    this.hits++;
    return this.values.get(k);
  }

  set(key: K, value: V): void {
    const k = this.serializeKey(key);
    if (this.capacity <= 0) return;

    if (this.values.has(k)) {
      this.values.set(k, value);
      this.incrementFreq(k);
      return;
    }

    if (this.values.size >= this.capacity) {
      const minBucket = this.freqBuckets.get(this.minFreq)!;
      const evictKey = minBucket.values().next().value;
      if (evictKey !== undefined) {
        minBucket.delete(evictKey);
        this.values.delete(evictKey);
        this.freq.delete(evictKey);
        this.evictions++;
      }
    }

    this.values.set(k, value);
    this.freq.set(k, 1);
    if (!this.freqBuckets.has(1)) this.freqBuckets.set(1, new Set());
    this.freqBuckets.get(1)!.add(k);
    this.minFreq = 1;
  }

  delete(key: K): boolean {
    const k = this.serializeKey(key);
    if (!this.values.has(k)) return false;
    const f = this.freq.get(k)!;
    this.freqBuckets.get(f)?.delete(k);
    this.values.delete(k);
    this.freq.delete(k);
    return true;
  }

  get size(): number { return this.values.size; }

  private incrementFreq(key: string): void {
    const f = this.freq.get(key)!;
    this.freqBuckets.get(f)?.delete(key);
    if (this.freqBuckets.get(f)?.size === 0 && f === this.minFreq) this.minFreq++;
    const newF = f + 1;
    this.freq.set(key, newF);
    if (!this.freqBuckets.has(newF)) this.freqBuckets.set(newF, new Set());
    this.freqBuckets.get(newF)!.add(key);
  }
}

// ─── TTL Cache ────────────────────────────────────────────────────────────────
// Simple time-to-live cache — auto-expires entries after ttlMs

export class TTLCache<K = string, V = unknown> {
  private store: Map<string, { value: V; expiresAt: number }> = new Map();
  private defaultTTL: number;
  private serializeKey: (key: K) => string;

  constructor(defaultTTLMs: number, serializeKey?: (key: K) => string) {
    this.defaultTTL = defaultTTLMs;
    this.serializeKey = serializeKey ?? ((k) => String(k));
  }

  get(key: K): V | undefined {
    const k = this.serializeKey(key);
    const entry = this.store.get(k);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) { this.store.delete(k); return undefined; }
    return entry.value;
  }

  set(key: K, value: V, ttlMs?: number): void {
    this.store.set(this.serializeKey(key), { value, expiresAt: Date.now() + (ttlMs ?? this.defaultTTL) });
  }

  delete(key: K): boolean { return this.store.delete(this.serializeKey(key)); }
  has(key: K): boolean {
    const entry = this.store.get(this.serializeKey(key));
    return !!entry && Date.now() <= entry.expiresAt;
  }
  purgeExpired(): number {
    const now = Date.now();
    const toDelete: string[] = [];
    for (const [k, e] of this.store) { if (now > e.expiresAt) toDelete.push(k); }
    for (const k of toDelete) this.store.delete(k);
    return toDelete.length;
  }
  get size(): number { return this.store.size; }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export const createLRU = <K = string, V = unknown>(capacity: number) => new LRUCache<K, V>(capacity);
export const createLFU = <K = string, V = unknown>(capacity: number) => new LFUCache<K, V>(capacity);
export const createTTL = <K = string, V = unknown>(ttlMs: number)    => new TTLCache<K, V>(ttlMs);

/*
 * Usage Example:
 *
 * const lru = createLRU<string, User>(500);
 * lru.set("user:42", user, 60_000); // Expires in 60s
 * lru.get("user:42");               // Cache hit, moves to MRU position
 *
 * const lfu = createLFU<string, Config>(100);
 * lfu.set("config:app", config);    // Evicts least-frequently-used when full
 *
 * const ttl = createTTL<string, string>(5 * 60_000); // 5 min default TTL
 * ttl.set("session:abc", "token");
 * ttl.get("session:abc");           // undefined after 5 min
 */
