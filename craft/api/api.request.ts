/**
 * @keywords    axios, fetch, http, request, header, timeout, interceptor, middleware, api client, retry, base url
 * @domain      API Request
 * @use-when    Building a typed HTTP client layer with interceptors, timeout, auth headers, and retry logic
 * @not-when    Simple one-off fetches — the native fetch() is fine for those
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";

export interface RequestConfig {
  baseURL?:     string;
  timeout?:     number;
  headers?:     Record<string, string>;
  params?:      Record<string, string | number | boolean | undefined>;
  withCredentials?: boolean;
}

export interface ApiResponse<T> {
  data:    T;
  status:  number;
  headers: Record<string, string>;
  url:     string;
}

export interface ApiError {
  message:    string;
  status:     number | null;
  code:       string;
  url:        string;
  isNetwork:  boolean;
  isTimeout:  boolean;
  response?:  unknown;
}

type Interceptor<T> = (value: T) => T | Promise<T>;

interface InterceptorPair<Req, Res> {
  request:  Interceptor<Req>[];
  response: Interceptor<Res>[];
}

// ─── ApiClient ────────────────────────────────────────────────────────────────

export class ApiClient {
  private config: Required<RequestConfig>;
  private interceptors: InterceptorPair<RequestInit, ApiResponse<unknown>> = {
    request:  [],
    response: [],
  };

  constructor(config: RequestConfig = {}) {
    this.config = {
      baseURL: config.baseURL ?? "",
      timeout: config.timeout ?? 10000,
      headers: config.headers ?? {},
      params:  config.params  ?? {},
      withCredentials: config.withCredentials ?? false,
    };
  }

  // Add request/response interceptors (middleware chain)
  addRequestInterceptor(fn: Interceptor<RequestInit>)            { this.interceptors.request.push(fn); return this; }
  addResponseInterceptor(fn: Interceptor<ApiResponse<unknown>>)  { this.interceptors.response.push(fn); return this; }

  // Convenience: attach a bearer token to every outgoing request
  setBearerToken(token: string) {
    return this.addRequestInterceptor((init) => ({
      ...init,
      headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` },
    }));
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const base = this.config.baseURL.replace(/\/$/, "");
    const url  = new URL(path.startsWith("http") ? path : `${base}/${path.replace(/^\//, "")}`);

    const allParams = { ...this.config.params, ...(params ?? {}) };
    Object.entries(allParams).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });

    return url.toString();
  }

  private buildHeaders(overrides: Record<string, string> = {}): Record<string, string> {
    return { "Content-Type": "application/json", ...this.config.headers, ...overrides };
  }

  async request<T>(
    method: HttpMethod,
    path: string,
    options: {
      body?:    unknown;
      headers?: Record<string, string>;
      params?:  Record<string, string | number | boolean | undefined>;
      timeout?: number;
      signal?:  AbortSignal;
    } = {}
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path, options.params);
    const timeout = options.timeout ?? this.config.timeout;

    // Timeout controller (merged with any external signal)
    const timeoutController = new AbortController();
    const timeoutId = timeout > 0 ? setTimeout(() => timeoutController.abort(), timeout) : null;
    const signal = options.signal
      ? anySignal([options.signal, timeoutController.signal])
      : timeoutController.signal;

    let init: RequestInit = {
      method,
      headers: this.buildHeaders(options.headers),
      signal,
      credentials: this.config.withCredentials ? "include" : "same-origin",
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    };

    // Run request interceptors
    for (const interceptor of this.interceptors.request) {
      init = await interceptor(init);
    }

    try {
      const raw = await fetch(url, init);

      if (timeoutId) clearTimeout(timeoutId);

      let responseData: T;
      const contentType = raw.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        responseData = await raw.json();
      } else {
        responseData = await raw.text() as unknown as T;
      }

      if (!raw.ok) {
        const err: ApiError = {
          message:   `HTTP ${raw.status}: ${raw.statusText}`,
          status:    raw.status,
          code:      `HTTP_${raw.status}`,
          url,
          isNetwork: false,
          isTimeout: false,
          response:  responseData,
        };
        throw err;
      }

      const responseHeaders: Record<string, string> = {};
      raw.headers.forEach((v, k) => { responseHeaders[k] = v; });

      let response: ApiResponse<unknown> = { data: responseData, status: raw.status, headers: responseHeaders, url };

      // Run response interceptors
      for (const interceptor of this.interceptors.response) {
        response = await interceptor(response);
      }

      return response as ApiResponse<T>;
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);

      // Re-throw ApiError objects as-is
      if (isApiError(err)) throw err;

      const isAbort   = (err as Error).name === "AbortError";
      const isTimeout = isAbort && timeoutController.signal.aborted;

      const apiErr: ApiError = {
        message:   isTimeout ? `Request timed out after ${timeout}ms` : (err as Error).message,
        status:    null,
        code:      isTimeout ? "TIMEOUT" : isAbort ? "ABORTED" : "NETWORK_ERROR",
        url,
        isNetwork: !isAbort,
        isTimeout,
      };
      throw apiErr;
    }
  }

  // Convenience methods
  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>, opts?: Parameters<ApiClient["request"]>[2]) {
    return this.request<T>("GET", path, { ...opts, params });
  }
  post<T>(path: string, body?: unknown, opts?: Parameters<ApiClient["request"]>[2]) {
    return this.request<T>("POST", path, { ...opts, body });
  }
  put<T>(path: string, body?: unknown, opts?: Parameters<ApiClient["request"]>[2]) {
    return this.request<T>("PUT", path, { ...opts, body });
  }
  patch<T>(path: string, body?: unknown, opts?: Parameters<ApiClient["request"]>[2]) {
    return this.request<T>("PATCH", path, { ...opts, body });
  }
  delete<T>(path: string, opts?: Parameters<ApiClient["request"]>[2]) {
    return this.request<T>("DELETE", path, opts);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isApiError(err: unknown): err is ApiError {
  return typeof err === "object" && err !== null && "isNetwork" in err && "code" in err;
}

// Combines multiple AbortSignals — aborts when any of them fires
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) { controller.abort(); break; }
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

// ─── createApiClient — Factory with sensible defaults ────────────────────────

export function createApiClient(config: RequestConfig = {}): ApiClient {
  return new ApiClient(config);
}

// ─── Default instance ─────────────────────────────────────────────────────────
export const api = createApiClient();

/*
 * Usage Examples:
 *
 * // Create a typed client for your API
 * const client = createApiClient({ baseURL: "https://api.example.com", timeout: 8000 });
 *
 * // Add auth header automatically
 * client.setBearerToken(localStorage.getItem("token") ?? "");
 *
 * // Add logging interceptor
 * client.addRequestInterceptor((init) => { console.log("→", init); return init; });
 *
 * // Make typed requests
 * const { data } = await client.get<User[]>("/users", { role: "admin" });
 * const { data: user } = await client.post<User>("/users", { name: "Alice", email: "a@b.com" });
 *
 * // Handle errors
 * try {
 *   await client.delete("/users/123");
 * } catch (err) {
 *   if ((err as ApiError).status === 404) console.warn("User not found");
 *   if ((err as ApiError).isTimeout) console.error("Request timed out");
 * }
 */
