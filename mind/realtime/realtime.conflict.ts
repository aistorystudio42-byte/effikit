/**
 * @keywords    conflict resolution, CRDT, operational transform, merge, concurrent edit, last-write-wins
 * @domain      Realtime Conflict
 * @use-when    Resolving concurrent edits in collaborative systems: shared documents, forms, state
 * @not-when    Only one user edits at a time — conflict resolution adds complexity without benefit
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConflictStrategy = "last-write-wins" | "first-write-wins" | "merge" | "manual";

export interface VersionedValue<T> {
  value: T;
  version: number;    // Monotonic counter
  clientId: string;
  timestamp: number;
  vectorClock: VectorClock;
}

export interface ConflictResult<T> {
  resolved: T;
  strategy: ConflictStrategy;
  hadConflict: boolean;
  conflictingVersions: Array<VersionedValue<T>>;
}

// ─── Vector Clock ──────────────────────────────────────────────────────────────
// Tracks causal ordering across distributed clients; detects concurrent (conflicting) writes

export type VectorClock = Record<string, number>; // clientId → logical clock

export const VectorClockOps = {
  create: (clientId: string): VectorClock => ({ [clientId]: 1 }),

  increment: (clock: VectorClock, clientId: string): VectorClock => ({
    ...clock,
    [clientId]: (clock[clientId] ?? 0) + 1,
  }),

  merge: (a: VectorClock, b: VectorClock): VectorClock => {
    const result: VectorClock = { ...a };
    for (const [client, tick] of Object.entries(b)) {
      result[client] = Math.max(result[client] ?? 0, tick);
    }
    return result;
  },

  // Returns the causal relationship between two clocks
  compare: (
    a: VectorClock,
    b: VectorClock
  ): "before" | "after" | "concurrent" | "equal" => {
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let aGreater = false, bGreater = false;

    for (const k of allKeys) {
      const av = a[k] ?? 0, bv = b[k] ?? 0;
      if (av > bv) aGreater = true;
      if (bv > av) bGreater = true;
    }

    if (!aGreater && !bGreater) return "equal";
    if (aGreater && !bGreater) return "after";
    if (!aGreater && bGreater) return "before";
    return "concurrent"; // Both have entries the other lacks — conflict!
  },

  happensBefore: (a: VectorClock, b: VectorClock): boolean => {
    const rel = VectorClockOps.compare(a, b);
    return rel === "before";
  },
};

// ─── Conflict Resolver ────────────────────────────────────────────────────────

export class ConflictResolver<T> {
  private strategy: ConflictStrategy;
  private merger?: (versions: Array<VersionedValue<T>>) => T;

  constructor(
    strategy: ConflictStrategy = "last-write-wins",
    merger?: (versions: Array<VersionedValue<T>>) => T
  ) {
    this.strategy = strategy;
    this.merger = merger;
  }

  resolve(versions: Array<VersionedValue<T>>): ConflictResult<T> {
    if (versions.length === 0) throw new Error("No versions to resolve");
    if (versions.length === 1) {
      return { resolved: versions[0].value, strategy: this.strategy, hadConflict: false, conflictingVersions: [] };
    }

    // Detect actual conflicts using vector clocks
    const conflicts = findConcurrentVersions(versions);
    const hadConflict = conflicts.length > 1;

    let resolved: T;

    switch (this.strategy) {
      case "last-write-wins":
        resolved = [...versions].sort((a, b) => b.timestamp - a.timestamp)[0].value;
        break;

      case "first-write-wins":
        resolved = [...versions].sort((a, b) => a.timestamp - b.timestamp)[0].value;
        break;

      case "merge":
        if (!this.merger) throw new Error("Merge strategy requires a merger function");
        resolved = this.merger(conflicts.length > 1 ? conflicts : versions);
        break;

      case "manual":
        // Return all conflicting versions for the caller to decide
        throw new ConflictError("Manual resolution required", conflicts);
    }

    return { resolved, strategy: this.strategy, hadConflict, conflictingVersions: conflicts };
  }
}

export class ConflictError<T> extends Error {
  constructor(message: string, public readonly conflicts: Array<VersionedValue<T>>) {
    super(message);
    this.name = "ConflictError";
  }
}

function findConcurrentVersions<T>(versions: Array<VersionedValue<T>>): Array<VersionedValue<T>> {
  const leaves: Array<VersionedValue<T>> = [];
  for (let i = 0; i < versions.length; i++) {
    let isDominated = false;
    for (let j = 0; j < versions.length; j++) {
      if (i === j) continue;
      const rel = VectorClockOps.compare(versions[i].vectorClock, versions[j].vectorClock);
      if (rel === "before") { isDominated = true; break; }
      if (rel === "equal" && i < j) { isDominated = true; break; }
    }
    if (!isDominated) leaves.push(versions[i]);
  }
  return leaves;
}

// ─── CRDT: Last-Write-Wins Register ───────────────────────────────────────────
// Simple CRDT for scalar values — safe to merge across replicas without coordination

export class LWWRegister<T> {
  private state: VersionedValue<T>;

  constructor(clientId: string, initialValue: T) {
    this.state = {
      value: initialValue,
      version: 0,
      clientId,
      timestamp: Date.now(),
      vectorClock: VectorClockOps.create(clientId),
    };
  }

  get(): T { return this.state.value; }
  get versionedState(): VersionedValue<T> { return { ...this.state }; }

  set(value: T, clientId: string): void {
    this.state = {
      value,
      version: this.state.version + 1,
      clientId,
      timestamp: Date.now(),
      vectorClock: VectorClockOps.increment(this.state.vectorClock, clientId),
    };
  }

  // Merge remote state — last timestamp wins
  merge(remote: VersionedValue<T>): void {
    const rel = VectorClockOps.compare(remote.vectorClock, this.state.vectorClock);
    if (rel === "after" || (rel === "concurrent" && remote.timestamp > this.state.timestamp)) {
      this.state = { ...remote, vectorClock: VectorClockOps.merge(this.state.vectorClock, remote.vectorClock) };
    } else {
      // Keep local but merge clocks
      this.state.vectorClock = VectorClockOps.merge(this.state.vectorClock, remote.vectorClock);
    }
  }
}

// ─── CRDT: Grow-Only Set ──────────────────────────────────────────────────────
// Elements can only be added, never removed — trivially merge by union

export class GSet<T> {
  private items: Set<string> = new Set();
  private serialized: Map<string, T> = new Map();
  private serialize: (item: T) => string;

  constructor(serialize: (item: T) => string = JSON.stringify) {
    this.serialize = serialize;
  }

  add(item: T): void {
    const key = this.serialize(item);
    if (!this.items.has(key)) {
      this.items.add(key);
      this.serialized.set(key, item);
    }
  }

  has(item: T): boolean { return this.items.has(this.serialize(item)); }

  values(): T[] { return [...this.serialized.values()]; }

  merge(remote: GSet<T>): void {
    for (const [key, item] of remote.serialized) {
      this.items.add(key);
      this.serialized.set(key, item);
    }
  }

  get size(): number { return this.items.size; }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createResolver<T>(
  strategy: ConflictStrategy,
  merger?: (versions: Array<VersionedValue<T>>) => T
): ConflictResolver<T> {
  return new ConflictResolver(strategy, merger);
}

/*
 * Usage Example:
 *
 * // Last-write-wins for simple values
 * const resolver = createResolver<string>("last-write-wins");
 * const { resolved } = resolver.resolve([
 *   { value: "hello", version: 1, clientId: "A", timestamp: 1000, vectorClock: { A: 1 } },
 *   { value: "world", version: 1, clientId: "B", timestamp: 1200, vectorClock: { B: 1 } },
 * ]);
 * // resolved = "world" (later timestamp wins)
 *
 * // CRDT register for distributed state
 * const reg = new LWWRegister("client-A", 0);
 * reg.set(42, "client-A");
 * reg.merge(remoteState); // Safe to call from any replica
 *
 * // CRDT G-Set (tags, likes, reactions)
 * const likes = new GSet<string>();
 * likes.add("user-1");
 * likes.add("user-2");
 * likes.merge(remoteLikes); // Union — no conflicts possible
 */
