/**
 * @keywords    error handling, api error, 4xx, 5xx, error boundary, classify, catch, normalize, error map
 * @domain      API Error Management
 * @use-when    Normalizing and classifying HTTP errors, mapping status codes to user messages, building error boundaries
 * @not-when    Simple try/catch with console.error — this system is for production-grade error handling pipelines
 */

// ─── Error Classifications ────────────────────────────────────────────────────

export type ErrorCategory =
  | "auth"           // 401, 403
  | "not_found"      // 404
  | "validation"     // 400, 422
  | "conflict"       // 409
  | "rate_limit"     // 429
  | "server"         // 500, 502, 503, 504
  | "network"        // No response (offline, DNS failure)
  | "timeout"        // Request exceeded time limit
  | "aborted"        // Request deliberately cancelled
  | "unknown";       // Anything else

export type ErrorSeverity = "critical" | "error" | "warning" | "info";

export interface NormalizedError {
  message:     string;           // User-facing message
  technical:   string;           // Developer-facing detail
  category:    ErrorCategory;
  severity:    ErrorSeverity;
  statusCode:  number | null;
  code:        string;           // Machine-readable error code
  retryable:   boolean;
  fields?:     Record<string, string[]>;  // Validation field errors
  requestId?:  string;           // Trace ID from server headers
  timestamp:   Date;
}

// ─── HTTP Status → Category mapping ──────────────────────────────────────────

const STATUS_CATEGORY_MAP: Record<number, ErrorCategory> = {
  400: "validation",
  401: "auth",
  403: "auth",
  404: "not_found",
  409: "conflict",
  410: "not_found",
  422: "validation",
  429: "rate_limit",
  500: "server",
  502: "server",
  503: "server",
  504: "server",
};

const STATUS_SEVERITY_MAP: Record<ErrorCategory, ErrorSeverity> = {
  auth:       "error",
  not_found:  "warning",
  validation: "warning",
  conflict:   "warning",
  rate_limit: "warning",
  server:     "critical",
  network:    "error",
  timeout:    "error",
  aborted:    "info",
  unknown:    "error",
};

const STATUS_RETRYABLE: Record<ErrorCategory, boolean> = {
  auth:       false,
  not_found:  false,
  validation: false,
  conflict:   false,
  rate_limit: true,   // retry after backoff
  server:     true,
  network:    true,
  timeout:    true,
  aborted:    false,
  unknown:    false,
};

// ─── Default user messages ────────────────────────────────────────────────────

const DEFAULT_MESSAGES: Record<ErrorCategory, string> = {
  auth:       "You don't have permission to do that. Please sign in and try again.",
  not_found:  "The requested resource could not be found.",
  validation: "Please check your input and try again.",
  conflict:   "This action conflicts with existing data. Please refresh and try again.",
  rate_limit: "Too many requests. Please wait a moment before trying again.",
  server:     "Something went wrong on our end. We're working on it.",
  network:    "Unable to connect. Please check your internet connection.",
  timeout:    "The request took too long. Please try again.",
  aborted:    "The request was cancelled.",
  unknown:    "An unexpected error occurred. Please try again.",
};

// ─── Error Normalizer ─────────────────────────────────────────────────────────

export function normalizeError(err: unknown): NormalizedError {
  const timestamp = new Date();

  // Already a NormalizedError
  if (isNormalized(err)) return err;

  // Our ApiError shape (from api.request.ts)
  if (isApiError(err)) {
    const status   = err.status ?? null;
    const category: ErrorCategory = err.isTimeout
      ? "timeout"
      : err.code === "ABORTED"
        ? "aborted"
        : err.isNetwork
          ? "network"
          : STATUS_CATEGORY_MAP[status ?? 0] ?? "unknown";

    const fields = extractValidationFields(err.response);

    return {
      message:    DEFAULT_MESSAGES[category],
      technical:  err.message,
      category,
      severity:   STATUS_SEVERITY_MAP[category],
      statusCode: status,
      code:       err.code,
      retryable:  STATUS_RETRYABLE[category],
      fields,
      requestId:  extractRequestId(err),
      timestamp,
    };
  }

  // Native Error
  if (err instanceof Error) {
    const isNetwork = err.message.toLowerCase().includes("failed to fetch") || err.message.toLowerCase().includes("network");
    const category: ErrorCategory = isNetwork ? "network" : "unknown";
    return {
      message:    DEFAULT_MESSAGES[category],
      technical:  err.message,
      category,
      severity:   STATUS_SEVERITY_MAP[category],
      statusCode: null,
      code:       "JS_ERROR",
      retryable:  STATUS_RETRYABLE[category],
      timestamp,
    };
  }

  // String or unknown
  let technicalMsg = "Unknown error";
  if (typeof err === "string") {
    technicalMsg = err;
  } else {
    try {
      technicalMsg = JSON.stringify(err);
    } catch {
      technicalMsg = String(err);
    }
  }

  return {
    message:    DEFAULT_MESSAGES["unknown"],
    technical:  technicalMsg,
    category:   "unknown",
    severity:   "error",
    statusCode: null,
    code:       "UNKNOWN",
    retryable:  false,
    timestamp,
  };
}

// ─── Error Registry — Custom per-code messages ────────────────────────────────

const errorRegistry = new Map<string, Partial<NormalizedError>>();

export function registerError(code: string, overrides: Partial<Omit<NormalizedError, "timestamp" | "code">>) {
  errorRegistry.set(code, overrides);
}

export function resolveError(err: unknown): NormalizedError {
  const normalized = normalizeError(err);
  const override   = errorRegistry.get(normalized.code) ?? errorRegistry.get(String(normalized.statusCode));
  return override ? { ...normalized, ...override } : normalized;
}

// ─── Error Boundary Class (React) ─────────────────────────────────────────────

import React, { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  fallback:  (error: NormalizedError, reset: () => void) => ReactNode;
  onError?:  (error: NormalizedError, info: ErrorInfo) => void;
  children:  ReactNode;
}

interface ErrorBoundaryState {
  error: NormalizedError | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(err: unknown): ErrorBoundaryState {
    return { error: normalizeError(err) };
  }

  componentDidCatch(err: unknown, info: ErrorInfo) {
    const normalized = normalizeError(err);
    this.props.onError?.(normalized, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return this.props.fallback(this.state.error, this.reset);
    }
    return this.props.children;
  }
}

// ─── Error Reporter — Send errors to monitoring services ──────────────────────

type ReporterFn = (error: NormalizedError, context?: Record<string, unknown>) => void;

const reporters: ReporterFn[] = [];

export function addErrorReporter(fn: ReporterFn): () => void {
  reporters.push(fn);
  return () => {
    const idx = reporters.indexOf(fn);
    if (idx !== -1) reporters.splice(idx, 1);
  };
}

export function reportError(err: unknown, context?: Record<string, unknown>) {
  const normalized = normalizeError(err);
  reporters.forEach((r) => r(normalized, context));
  return normalized;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isNormalized(err: unknown): err is NormalizedError {
  return typeof err === "object" && err !== null && "category" in err && "severity" in err && "retryable" in err;
}

function isApiError(err: unknown): err is { message: string; status: number | null; code: string; isNetwork: boolean; isTimeout: boolean; response?: unknown } {
  return typeof err === "object" && err !== null && "isNetwork" in err && "code" in err;
}

function extractValidationFields(response: unknown): Record<string, string[]> | undefined {
  if (!response || typeof response !== "object") return undefined;
  const r = response as Record<string, unknown>;

  const isValidFields = (obj: unknown): obj is Record<string, string[]> => {
    if (!obj || typeof obj !== "object") return false;
    return Object.values(obj).every(v => Array.isArray(v) && v.every(i => typeof i === "string"));
  };

  if (isValidFields(r.errors)) return r.errors;
  if (isValidFields(r.fields)) return r.fields;
  return undefined;
}

function extractRequestId(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null) {
    const e = err as Record<string, unknown>;
    return (e.requestId ?? e.traceId ?? e["x-request-id"]) as string | undefined;
  }
  return undefined;
}

/*
 * Usage Examples:
 *
 * // Normalize any error (API, network, JS)
 * try {
 *   await api.delete("/posts/123");
 * } catch (err) {
 *   const e = resolveError(err);
 *   showToast(e.message, e.severity);
 *   if (e.retryable) scheduleRetry();
 *   if (e.fields) showFieldErrors(e.fields);
 * }
 *
 * // Register custom messages for specific codes
 * registerError("HTTP_409", { message: "This email is already in use. Try signing in instead." });
 * registerError("HTTP_429", { message: "Slow down! You're making too many requests.", severity: "warning" });
 *
 * // React Error Boundary
 * <ErrorBoundary
 *   onError={(e) => analytics.track("JS_ERROR", e)}
 *   fallback={(e, reset) => <ErrorFallback error={e} onRetry={reset} />}
 * >
 *   <App />
 * </ErrorBoundary>
 */
