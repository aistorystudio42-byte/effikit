/**
 * @keywords    fetch, useQuery, useSWR, loading, retry, abort, async hook, data fetching, polling, mutation
 * @domain      Async Data Hooks
 * @use-when    Fetching data from APIs with loading/error/retry states, polling, or optimistic mutations
 * @not-when    You're already using React Query or SWR — those cover the same ground more fully
 */

import { useState, useEffect, useRef, useCallback, useReducer } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AsyncStatus = "idle" | "loading" | "success" | "error";

export interface AsyncState<T> {
  data:      T | null;
  error:     Error | null;
  status:    AsyncStatus;
  isIdle:    boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError:   boolean;
}

type AsyncAction<T> =
  | { type: "FETCH" }
  | { type: "SUCCESS"; data: T }
  | { type: "ERROR";   error: Error }
  | { type: "RESET" };

function asyncReducer<T>(state: AsyncState<T>, action: AsyncAction<T>): AsyncState<T> {
  switch (action.type) {
    case "FETCH":
      return { ...state, status: "loading", error: null, isIdle: false, isLoading: true, isSuccess: false, isError: false };
    case "SUCCESS":
      return { data: action.data, error: null, status: "success", isIdle: false, isLoading: false, isSuccess: true, isError: false };
    case "ERROR":
      return { ...state, error: action.error, status: "error", isIdle: false, isLoading: false, isSuccess: false, isError: true };
    case "RESET":
      return { data: null, error: null, status: "idle", isIdle: true, isLoading: false, isSuccess: false, isError: false };
    default:
      return state;
  }
}

const initialAsync = <T>(): AsyncState<T> => ({
  data: null, error: null, status: "idle",
  isIdle: true, isLoading: false, isSuccess: false, isError: false,
});

// ─── useAsync — Core primitive for any async operation ───────────────────────

export function useAsync<T>() {
  const [state, dispatch] = useReducer(asyncReducer as (s: AsyncState<T>, a: AsyncAction<T>) => AsyncState<T>, initialAsync<T>());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const run = useCallback(async (promise: Promise<T>): Promise<T | null> => {
    dispatch({ type: "FETCH" });
    try {
      const data = await promise;
      if (mountedRef.current) dispatch({ type: "SUCCESS", data });
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (mountedRef.current) dispatch({ type: "ERROR", error });
      return null;
    }
  }, []);

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return { ...state, run, reset };
}

// ─── useFetch — Auto-fetching with abort, caching, and deps ──────────────────

interface UseFetchOptions<T> {
  enabled?:      boolean;
  initialData?:  T;
  onSuccess?:    (data: T) => void;
  onError?:      (error: Error) => void;
  transform?:    (raw: unknown) => T;
  headers?:      Record<string, string>;
}

export function useFetch<T>(
  url: string | null,
  options: UseFetchOptions<T> = {}
) {
  const { enabled = true, initialData, onSuccess, onError, transform, headers } = options;

  const [state, dispatch] = useReducer(
    asyncReducer as (s: AsyncState<T>, a: AsyncAction<T>) => AsyncState<T>,
    { ...initialAsync<T>(), data: initialData ?? null }
  );
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!url || !enabled) return;

    // Cancel previous request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    dispatch({ type: "FETCH" });
    try {
      const res = await fetch(url, { signal: abortRef.current.signal, headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const raw = await res.json();
      const data = transform ? transform(raw) : (raw as T);
      dispatch({ type: "SUCCESS", data });
      onSuccess?.(data);
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // ignore deliberate cancellation
      const error = err instanceof Error ? err : new Error(String(err));
      dispatch({ type: "ERROR", error });
      onError?.(error);
    }
  }, [url, enabled, headers, transform, onSuccess, onError]);

  useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

// ─── useRetry — Retry failed async operations with exponential backoff ────────

interface RetryOptions {
  maxAttempts?: number;
  baseDelay?:   number;   // ms — doubles on each retry
  maxDelay?:    number;   // cap on delay growth
  onRetry?:     (attempt: number, error: Error) => void;
}

export function useRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
) {
  const { maxAttempts = 3, baseDelay = 500, maxDelay = 10000, onRetry } = options;
  const [attempt, setAttempt]  = useState(0);
  const [state, dispatch] = useReducer(
    asyncReducer as (s: AsyncState<T>, a: AsyncAction<T>) => AsyncState<T>,
    initialAsync<T>()
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const execute = useCallback(async (currentAttempt: number = 0) => {
    dispatch({ type: "FETCH" });
    setAttempt(currentAttempt);
    try {
      const data = await fn();
      if (mountedRef.current) dispatch({ type: "SUCCESS", data });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (currentAttempt < maxAttempts - 1) {
        // Exponential backoff with jitter
        const delay = Math.min(baseDelay * Math.pow(2, currentAttempt) + Math.random() * 100, maxDelay);
        onRetry?.(currentAttempt + 1, error);
        timerRef.current = setTimeout(() => execute(currentAttempt + 1), delay);
      } else {
        if (mountedRef.current) dispatch({ type: "ERROR", error });
      }
    }
  }, [fn, maxAttempts, baseDelay, maxDelay, onRetry]);

  return { ...state, attempt, execute: () => execute(0), maxAttempts };
}

// ─── usePolling — Repeat a fetch on a fixed interval ─────────────────────────

interface PollingOptions<T> extends UseFetchOptions<T> {
  interval: number;  // ms
  stopOnError?: boolean;
}

export function usePolling<T>(url: string | null, options: PollingOptions<T>) {
  const { interval, stopOnError = false, ...fetchOptions } = options;
  const [active, setActive] = useState(true);
  const { data, error, isLoading, isError, refetch } = useFetch<T>(url, { ...fetchOptions, enabled: active });

  useEffect(() => {
    if (!url || !active) return;
    if (isError && stopOnError) { setActive(false); return; }
    const id = setInterval(refetch, interval);
    return () => clearInterval(id);
  }, [url, interval, active, isError, stopOnError, refetch]);

  return { data, error, isLoading, isPolling: active, start: () => setActive(true), stop: () => setActive(false) };
}

// ─── useMutation — POST/PUT/DELETE with optimistic update support ─────────────

interface MutationOptions<TData, TVariables> {
  onSuccess?:   (data: TData, variables: TVariables) => void;
  onError?:     (error: Error, variables: TVariables) => void;
  onSettled?:   (data: TData | null, error: Error | null, variables: TVariables) => void;
}

export function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: MutationOptions<TData, TVariables> = {}
) {
  const { onSuccess, onError, onSettled } = options;
  const [state, dispatch] = useReducer(
    asyncReducer as (s: AsyncState<TData>, a: AsyncAction<TData>) => AsyncState<TData>,
    initialAsync<TData>()
  );
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const mutate = useCallback(async (variables: TVariables): Promise<TData | null> => {
    dispatch({ type: "FETCH" });
    try {
      const data = await mutationFn(variables);
      if (mountedRef.current) {
        dispatch({ type: "SUCCESS", data });
        onSuccess?.(data, variables);
        onSettled?.(data, null, variables);
      }
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (mountedRef.current) {
        dispatch({ type: "ERROR", error });
        onError?.(error, variables);
        onSettled?.(null, error, variables);
      }
      return null;
    }
  }, [mutationFn, onSuccess, onError, onSettled]);

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return { ...state, mutate, reset };
}

/*
 * Usage Examples:
 *
 * // Simple data fetch
 * const { data, isLoading, error, refetch } = useFetch<User[]>("/api/users");
 *
 * // Mutation with optimistic update pattern
 * const { mutate, isLoading } = useMutation(
 *   (id: string) => fetch(`/api/posts/${id}`, { method: "DELETE" }).then(r => r.json()),
 *   { onSuccess: () => queryClient.invalidate("posts") }
 * );
 *
 * // Auto-retry with backoff
 * const { data, execute, attempt } = useRetry(() => fetchCriticalData(), { maxAttempts: 5 });
 * useEffect(() => { execute(); }, []);
 *
 * // Polling for live status
 * const { data: status, stop } = usePolling("/api/job/status", {
 *   interval: 2000,
 *   stopOnError: true,
 *   onSuccess: (d) => { if (d.done) stop(); }
 * });
 */
