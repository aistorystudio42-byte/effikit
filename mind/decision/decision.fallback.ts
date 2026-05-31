/**
 * @keywords    fallback, circuit breaker, retry, alternative path, degraded mode, resilience, backup strategy
 * @domain      Decision Fallback
 * @use-when    Building resilient systems that need graceful degradation when primary paths fail
 * @not-when    Simple try-catch is sufficient — use this for multi-level fallback chains with retry and circuit breaking
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type FallbackFn<T> = () => T | Promise<T>;

export interface FallbackOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  retryBackoff?: "fixed" | "exponential" | "jitter";
  timeout?: number;         // Per-attempt timeout in ms
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

export interface FallbackResult<T> {
  value: T;
  strategyUsed: number; // Index of the fallback that succeeded (0 = primary)
  attempts: number;
  durationMs: number;
}

// ─── Timeout Wrapper ──────────────────────────────────────────────────────────

function withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
    fn().then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

// ─── Retry Delay ──────────────────────────────────────────────────────────────

function computeDelay(attempt: number, base: number, strategy: FallbackOptions["retryBackoff"]): number {
  switch (strategy) {
    case "exponential": return Math.min(base * Math.pow(2, attempt), 30_000);
    case "jitter":      return Math.min(base * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5), 30_000);
    default:            return base;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── FallbackChain ────────────────────────────────────────────────────────────

export class FallbackChain<T> {
  private strategies: FallbackFn<T>[];
  private options: Required<FallbackOptions>;

  constructor(strategies: FallbackFn<T>[], options: FallbackOptions = {}) {
    if (strategies.length === 0) throw new Error("FallbackChain requires at least one strategy");
    this.strategies = strategies;
    this.options = {
      maxRetries: options.maxRetries ?? 2,
      retryDelayMs: options.retryDelayMs ?? 300,
      retryBackoff: options.retryBackoff ?? "exponential",
      timeout: options.timeout ?? 0, // 0 = no timeout
      shouldRetry: options.shouldRetry ?? (() => true),
    };
  }

  async execute(): Promise<FallbackResult<T>> {
    const start = Date.now();
    let totalAttempts = 0;

    for (let si = 0; si < this.strategies.length; si++) {
      const strategy = this.strategies[si];
      let lastError: unknown;

      for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
        totalAttempts++;

        try {
          const run = () => Promise.resolve(strategy());
          const result = this.options.timeout > 0
            ? await withTimeout(run, this.options.timeout)
            : await run();

          return {
            value: result,
            strategyUsed: si,
            attempts: totalAttempts,
            durationMs: Date.now() - start,
          };
        } catch (err) {
          lastError = err;

          const willRetry =
            attempt < this.options.maxRetries &&
            this.options.shouldRetry(err, attempt + 1);

          if (willRetry) {
            const delay = computeDelay(attempt, this.options.retryDelayMs, this.options.retryBackoff);
            await sleep(delay);
          }
        }
      }

      // All retries for this strategy exhausted, try next
    }

    throw new Error(`All ${this.strategies.length} strategies failed after ${totalAttempts} total attempts`);
  }
}

// ─── Circuit Breaker ──────────────────────────────────────────────────────────

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  failureThreshold: number;  // Failures before opening
  successThreshold: number;  // Successes in half-open to close again
  resetTimeoutMs: number;    // How long to stay open before testing
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

export class CircuitBreaker<T> {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private successCount = 0;
  private nextAttemptAt = 0;
  private config: Required<CircuitBreakerOptions>;

  constructor(config: CircuitBreakerOptions) {
    this.config = {
      onStateChange: () => {},
      ...config,
    };
  }

  get currentState(): CircuitState { return this.state; }

  async call(fn: FallbackFn<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() < this.nextAttemptAt) {
        throw new Error("Circuit is OPEN — request blocked");
      }
      // Transition to half-open for a probe request
      this.transition("half-open");
    }

    try {
      const result = await Promise.resolve(fn());
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === "half-open") {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.transition("closed");
      }
    }
  }

  private onFailure(): void {
    this.successCount = 0;
    this.failureCount++;
    if (this.state === "half-open" || this.failureCount >= this.config.failureThreshold) {
      this.transition("open");
      this.nextAttemptAt = Date.now() + this.config.resetTimeoutMs;
    }
  }

  private transition(to: CircuitState): void {
    if (this.state === to) return;
    const from = this.state;
    this.state = to;
    if (to === "closed") { this.failureCount = 0; this.successCount = 0; }
    if (to === "half-open") { this.successCount = 0; }
    this.config.onStateChange(from, to);
  }

  reset(): void { this.transition("closed"); }
}

// ─── Factory Helpers ──────────────────────────────────────────────────────────

export function fallback<T>(
  strategies: FallbackFn<T>[],
  options?: FallbackOptions
): Promise<FallbackResult<T>> {
  return new FallbackChain(strategies, options).execute();
}

export function createCircuitBreaker<T>(
  config: CircuitBreakerOptions
): CircuitBreaker<T> {
  return new CircuitBreaker(config);
}

/*
 * Usage Example:
 *
 * // Multi-level fallback: primary DB → read replica → cache → static default
 * const { value, strategyUsed } = await fallback([
 *   () => primaryDb.getUser(id),
 *   () => replicaDb.getUser(id),
 *   () => cache.get(`user:${id}`),
 *   () => ({ id, name: "Unknown", role: "guest" }),
 * ], {
 *   maxRetries: 1,
 *   retryDelayMs: 200,
 *   retryBackoff: "exponential",
 *   timeout: 3000,
 * });
 *
 * // Circuit breaker around a flaky external API
 * const breaker = createCircuitBreaker<WeatherData>({
 *   failureThreshold: 5,
 *   successThreshold: 2,
 *   resetTimeoutMs: 30_000,
 *   onStateChange: (from, to) => logger.warn(`Circuit: ${from} → ${to}`),
 * });
 *
 * const data = await breaker.call(() => weatherApi.fetch(city));
 */
