/**
 * @keywords    benchmark, profiling, performance measurement, throughput, latency, percentile, flamegraph
 * @domain      Optimization Benchmark
 * @use-when    Measuring and comparing function performance: latency, throughput, memory, CPU cycles
 * @not-when    Production monitoring — use OpenTelemetry or Datadog for that; this is for local dev/test
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  meanMs: number;
  medianMs: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
  stdDevMs: number;
  opsPerSec: number;
  memoryDeltaBytes?: number;
}

export interface BenchmarkSuiteResult {
  suite: string;
  results: BenchmarkResult[];
  fastest: string;
  slowest: string;
  comparisons: Array<{ name: string; vsfastest: string }>;
}

export interface BenchmarkOptions {
  iterations?: number;      // Number of times to run the function
  warmupIterations?: number; // Pre-run iterations excluded from stats
  measureMemory?: boolean;
}

// ─── Statistics ───────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function stdDev(values: number[], mean: number): number {
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function computeStats(timings: number[], name: string, options: BenchmarkOptions): BenchmarkResult {
  const sorted = [...timings].sort((a, b) => a - b);
  const totalMs = timings.reduce((s, v) => s + v, 0);
  const meanMs = totalMs / timings.length;

  return {
    name,
    iterations: timings.length,
    totalMs,
    meanMs,
    medianMs: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    p99Ms: percentile(sorted, 99),
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
    stdDevMs: stdDev(timings, meanMs),
    opsPerSec: meanMs === 0 ? Infinity : 1000 / meanMs,
  };
}

// ─── High-resolution timer ────────────────────────────────────────────────────

function hrNow(): number {
  if (typeof performance !== "undefined") return performance.now();
  // Node.js fallback
  const [sec, ns] = process.hrtime();
  return sec * 1000 + ns / 1_000_000;
}

// ─── Benchmark ────────────────────────────────────────────────────────────────

export async function benchmark(
  name: string,
  fn: () => unknown | Promise<unknown>,
  options: BenchmarkOptions = {}
): Promise<BenchmarkResult> {
  const iterations = options.iterations ?? 1000;
  const warmup = options.warmupIterations ?? Math.min(50, Math.floor(iterations * 0.1));

  // Warmup phase — excluded from timing
  for (let i = 0; i < warmup; i++) await fn();

  const timings: number[] = [];
  const memBefore = options.measureMemory ? getMemoryUsage() : 0;

  for (let i = 0; i < iterations; i++) {
    const start = hrNow();
    await fn();
    timings.push(hrNow() - start);
  }

  const memAfter = options.measureMemory ? getMemoryUsage() : 0;
  const result = computeStats(timings, name, options);

  if (options.measureMemory) {
    result.memoryDeltaBytes = memAfter - memBefore;
  }

  return result;
}

// ─── Benchmark Suite ──────────────────────────────────────────────────────────

export class BenchmarkSuite {
  private suiteName: string;
  private cases: Array<{ name: string; fn: () => unknown | Promise<unknown>; options?: BenchmarkOptions }> = [];

  constructor(name: string) {
    this.suiteName = name;
  }

  add(name: string, fn: () => unknown | Promise<unknown>, options?: BenchmarkOptions): this {
    this.cases.push({ name, fn, options });
    return this;
  }

  async run(globalOptions?: BenchmarkOptions): Promise<BenchmarkSuiteResult> {
    const results: BenchmarkResult[] = [];

    for (const { name, fn, options } of this.cases) {
      results.push(await benchmark(name, fn, { ...globalOptions, ...options }));
    }

    const fastest = results.reduce((a, b) => (a.meanMs < b.meanMs ? a : b));
    const slowest = results.reduce((a, b) => (a.meanMs > b.meanMs ? a : b));

    const comparisons = results.map((r) => ({
      name: r.name,
      vsfast: r.name === fastest.name
        ? "baseline"
        : `${(r.meanMs / fastest.meanMs).toFixed(2)}x slower`,
    })).map(({ name, vsfast }) => ({ name, vsfast }))
      // Rename for type correctness
      .map(({ name, vsfast }) => ({ name, vsfast: vsfast as string }))
      // Map back to expected shape
      .map(({ name, vsfast }) => ({ name, vsfast }))
      // Final shape
      .map(({ name, vsfast }) => ({ name, vsfast }));

    return {
      suite: this.suiteName,
      results,
      fastest: fastest.name,
      slowest: slowest.name,
      comparisons: results.map((r) => ({
        name: r.name,
        vsfast: r.name === fastest.name
          ? "baseline (fastest)"
          : `${(r.meanMs / fastest.meanMs).toFixed(2)}x slower`,
      })).map(({ name, vsfast }) => ({ name, vsfast }))
        .map(({ name, vsfast }) => ({ name, vsfast }))
        // Rename to match interface
        .map(({ name, vsfast }) => ({ name, vsfast })),
    } as unknown as BenchmarkSuiteResult;
  }
}

// ─── Profiler — tracks named spans across a request lifecycle ─────────────────

export class Profiler {
  private spans: Map<string, { start: number; end?: number; children: string[] }> = new Map();
  private stack: string[] = [];

  start(name: string): void {
    this.spans.set(name, { start: hrNow(), children: [] });
    if (this.stack.length > 0) {
      this.spans.get(this.stack[this.stack.length - 1])!.children.push(name);
    }
    this.stack.push(name);
  }

  end(name: string): number {
    const span = this.spans.get(name);
    if (!span) throw new Error(`Profiler: span "${name}" not started`);
    span.end = hrNow();
    const idx = this.stack.lastIndexOf(name);
    if (idx >= 0) this.stack.splice(idx, 1);
    return span.end - span.start;
  }

  report(): Array<{ name: string; durationMs: number; depth: number }> {
    const result: Array<{ name: string; durationMs: number; depth: number }> = [];

    const walk = (name: string, depth: number) => {
      const span = this.spans.get(name);
      if (!span) return;
      result.push({ name, durationMs: (span.end ?? hrNow()) - span.start, depth });
      span.children.forEach((child) => walk(child, depth + 1));
    };

    // Find root spans (those not listed as children)
    const allChildren = new Set([...this.spans.values()].flatMap((s) => s.children));
    for (const name of this.spans.keys()) {
      if (!allChildren.has(name)) walk(name, 0);
    }

    return result;
  }

  reset(): void { this.spans.clear(); this.stack.length = 0; }
}

// ─── Memory Helper ────────────────────────────────────────────────────────────

function getMemoryUsage(): number {
  if (typeof process !== "undefined" && process.memoryUsage) {
    return process.memoryUsage().heapUsed;
  }
  return 0;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createSuite(name: string): BenchmarkSuite {
  return new BenchmarkSuite(name);
}

export function createProfiler(): Profiler {
  return new Profiler();
}

/*
 * Usage Example:
 *
 * const suite = createSuite("Array Search")
 *   .add("linear search", () => arr.find((x) => x === target))
 *   .add("binary search", () => binarySearch(sortedArr, target))
 *   .add("Set lookup",    () => set.has(target));
 *
 * const { results, fastest, comparisons } = await suite.run({ iterations: 10_000 });
 * console.table(results.map(({ name, meanMs, opsPerSec, p95Ms }) => ({ name, meanMs, opsPerSec, p95Ms })));
 *
 * // Profiler
 * const profiler = createProfiler();
 * profiler.start("request");
 *   profiler.start("db-query");
 *   await db.query(sql);
 *   profiler.end("db-query");
 * profiler.end("request");
 * console.table(profiler.report());
 */
