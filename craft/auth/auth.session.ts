/**
 * @keywords    session, cookie, refresh token, expire, logout, next-auth, session storage, persist session
 * @domain      Auth Session
 * @use-when    Managing user sessions: storing, refreshing, validating, and clearing authentication state
 * @not-when    JWT signing/verification — use auth.token.ts; OAuth flows — use your auth provider's SDK
 */

import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionUser {
  id:       string;
  email:    string;
  name?:    string;
  avatar?:  string;
  roles:    string[];
  metadata?: Record<string, unknown>;
}

export interface Session {
  user:          SessionUser;
  accessToken:   string;
  refreshToken?: string;
  expiresAt:     number;   // unix timestamp ms
  createdAt:     number;
  issuedAt:      number;
}

export type SessionStatus = "active" | "expired" | "missing" | "refreshing";

const SessionSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().optional(),
    avatar: z.string().optional(),
    roles: z.array(z.string()),
    metadata: z.record(z.unknown()).optional(),
  }),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.number(),
  createdAt: z.number(),
  issuedAt: z.number(),
});

// ─── Storage Adapters ─────────────────────────────────────────────────────────

export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export const localStorageAdapter: StorageAdapter = {
  get:    (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set:    (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  remove: (k) => { try { localStorage.removeItem(k); } catch {} },
};

export const sessionStorageAdapter: StorageAdapter = {
  get:    (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set:    (k, v) => { try { sessionStorage.setItem(k, v); } catch {} },
  remove: (k) => { try { sessionStorage.removeItem(k); } catch {} },
};

// ─── SessionManager ───────────────────────────────────────────────────────────

export interface SessionManagerConfig {
  storage?:        StorageAdapter;
  storageKey?:     string;
  refreshBuffer?:  number;   // ms before expiry to trigger refresh (default: 5 min)
  onExpired?:      () => void;
  onRefreshed?:    (session: Session) => void;
  refreshFn?:      (session: Session) => Promise<Session>;
}

export class SessionManager {
  private storage:       StorageAdapter;
  private key:           string;
  private refreshBuffer: number;
  private refreshTimer:  ReturnType<typeof setTimeout> | null = null;
  private config:        SessionManagerConfig;

  constructor(config: SessionManagerConfig = {}) {
    this.config        = config;
    this.storage       = config.storage       ?? localStorageAdapter;
    this.key           = config.storageKey    ?? "effikit_session";
    this.refreshBuffer = config.refreshBuffer ?? 5 * 60 * 1000;
  }

  // Persist a new session
  save(session: Session): void {
    this.storage.set(this.key, JSON.stringify(session));
    this.scheduleRefresh(session);
  }

  // Read current session from storage
  get(): Session | null {
    const raw = this.storage.get(this.key);
    if (!raw) return null;
    try {
      // FIX: Validate parsed JSON to prevent Session Injection XSS attacks
      const parsed = JSON.parse(raw);
      const result = SessionSchema.safeParse(parsed);
      if (!result.success) {
        this.clear();
        return null;
      }
      return result.data as Session;
    } catch {
      this.clear();
      return null;
    }
  }

  // Remove session and cancel pending refresh
  clear(): void {
    this.storage.remove(this.key);
    if (this.refreshTimer) { clearTimeout(this.refreshTimer); this.refreshTimer = null; }
  }

  getStatus(): SessionStatus {
    const session = this.get();
    if (!session)               return "missing";
    if (this.isExpired(session)) return "expired";
    return "active";
  }

  isExpired(session: Session | null = this.get()): boolean {
    if (!session || !session.expiresAt) return true;
    return Date.now() >= session.expiresAt;
  }

  getUser(): SessionUser | null {
    return this.get()?.user ?? null;
  }

  getAccessToken(): string | null {
    const session = this.get();
    if (!session || this.isExpired(session)) return null;
    return session.accessToken;
  }

  hasRole(role: string): boolean {
    return this.get()?.user.roles.includes(role) ?? false;
  }

  hasAnyRole(roles: string[]): boolean {
    const userRoles = this.get()?.user.roles ?? [];
    return roles.some((r) => userRoles.includes(r));
  }

  // Update only specific fields without replacing the full session
  patch(updates: Partial<Pick<Session, "accessToken" | "refreshToken" | "expiresAt">>): void {
    const session = this.get();
    if (!session) return;
    this.save({ ...session, ...updates });
  }

  private scheduleRefresh(session: Session): void {
    if (!this.config.refreshFn || !session.refreshToken) return;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);

    const delay = session.expiresAt - Date.now() - this.refreshBuffer;
    if (delay <= 0) {
      this.performRefresh(session);
      return;
    }

    this.refreshTimer = setTimeout(() => this.performRefresh(session), delay);
  }

  private async performRefresh(session: Session): Promise<void> {
    if (!this.config.refreshFn) return;
    try {
      const refreshed = await this.config.refreshFn(session);
      this.save(refreshed);
      this.config.onRefreshed?.(refreshed);
    } catch {
      this.clear();
      this.config.onExpired?.();
    }
  }
  
  getKey() {
    return this.key;
  }
}

// ─── React Integration ────────────────────────────────────────────────────────

interface SessionContextValue {
  session:  Session | null;
  status:   SessionStatus;
  user:     SessionUser | null;
  login:    (session: Session) => void;
  logout:   () => void;
  refresh:  () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  session: null, status: "missing", user: null,
  login: () => {}, logout: () => {}, refresh: async () => {},
});

export const useSession = () => useContext(SessionContext);

interface SessionProviderProps {
  manager:  SessionManager;
  children: ReactNode;
  onLogout?: () => void;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ manager, children, onLogout }) => {
  const [session, setSession] = useState<Session | null>(() => manager.get());
  const [status,  setStatus]  = useState<SessionStatus>(() => manager.getStatus());

  const syncState = useCallback(() => {
    setSession(manager.get());
    setStatus(manager.getStatus());
  }, [manager]);

  const login = useCallback((s: Session) => {
    manager.save(s);
    syncState();
  }, [manager, syncState]);

  const logout = useCallback(() => {
    manager.clear();
    syncState();
    onLogout?.();
  }, [manager, syncState, onLogout]);

  const refresh = useCallback(async () => {
    setStatus("refreshing");
    syncState();
  }, [syncState]);

  // Sync across tabs via storage event
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      // FIX: Exact key match instead of .includes to prevent crosstalk
      if (e.key === manager.getKey()) syncState();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [syncState, manager]);

  return (
    <SessionContext.Provider value={{ session, status, user: session?.user ?? null, login, logout, refresh }}>
      {children}
    </SessionContext.Provider>
  );
};

/*
 * Usage Examples:
 *
 * const manager = new SessionManager({
 *   refreshBuffer: 5 * 60 * 1000,
 *   refreshFn: async (session) => {
 *     const res = await fetch("/api/auth/refresh", {
 *       method: "POST", body: JSON.stringify({ refreshToken: session.refreshToken }),
 *     });
 *     return res.json();
 *   },
 *   onExpired: () => router.push("/login"),
 * });
 *
 * <SessionProvider manager={manager} onLogout={() => router.push("/login")}>
 *   <App />
 * </SessionProvider>
 *
 * // In any component
 * const { user, status, logout } = useSession();
 * if (status === "missing") redirect("/login");
 */
