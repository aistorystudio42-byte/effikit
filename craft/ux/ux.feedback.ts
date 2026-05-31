/**
 * @keywords    loading, skeleton, spinner, error state, success, toast, feedback, empty state, progress
 * @domain      UX Feedback
 * @use-when    Communicating async state to users: loading indicators, skeletons, toasts, empty states
 * @not-when    Static UI — this handles dynamic feedback states only
 */

import React, {
  createContext, useContext, useCallback, useReducer,
  useRef, useEffect, ReactNode, CSSProperties,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = "info" | "success" | "warning" | "error";

export interface Toast {
  id:        string;
  message:   string;
  variant:   ToastVariant;
  duration?: number;
  action?:   { label: string; onClick: () => void };
}

type ToastAction =
  | { type: "ADD";    toast: Toast }
  | { type: "REMOVE"; id: string };

// ─── Skeleton ─────────────────────────────────────────────────────────────────

interface SkeletonProps {
  width?:   string | number;
  height?:  string | number;
  rounded?: "none" | "sm" | "md" | "lg" | "full";
  lines?:   number;
  className?: string;
}

const roundedMap = { none: "rounded-none", sm: "rounded-sm", md: "rounded-md", lg: "rounded-lg", full: "rounded-full" };

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%", height = "1rem", rounded = "md", lines = 1, className = "",
}) => {
  const style: CSSProperties = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
  };

  if (lines > 1) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`animate-pulse bg-gray-200 ${roundedMap[rounded]}`}
            style={{ ...style, width: i === lines - 1 ? "75%" : style.width }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`animate-pulse bg-gray-200 ${roundedMap[rounded]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

// ─── SkeletonCard — pre-built card-shaped skeleton ───────────────────────────

export const SkeletonCard: React.FC<{ hasAvatar?: boolean; lines?: number }> = ({
  hasAvatar = true, lines = 3,
}) => (
  <div className="p-4 rounded-lg border border-gray-200 bg-white space-y-3">
    {hasAvatar && (
      <div className="flex items-center gap-3">
        <Skeleton width={40} height={40} rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height="0.875rem" />
          <Skeleton width="40%" height="0.75rem" />
        </div>
      </div>
    )}
    <Skeleton lines={lines} height="0.875rem" />
  </div>
);

// ─── Spinner ──────────────────────────────────────────────────────────────────

type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";

interface SpinnerProps {
  size?:  SpinnerSize;
  color?: string;
  label?: string;
}

const spinnerSizeMap: Record<SpinnerSize, string> = {
  xs: "w-3 h-3", sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8", xl: "w-12 h-12",
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = "md", color = "text-blue-600", label = "Loading...",
}) => (
  <span role="status" aria-label={label} className={`inline-flex items-center justify-center ${color}`}>
    <svg className={`animate-spin ${spinnerSizeMap[size]}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    <span className="sr-only">{label}</span>
  </span>
);

// ─── ProgressBar ──────────────────────────────────────────────────────────────

interface ProgressBarProps {
  value:    number;   // 0–100
  max?:     number;
  label?:   string;
  color?:   "blue" | "green" | "red" | "yellow" | "purple";
  size?:    "sm" | "md" | "lg";
  animated?: boolean;
  showValue?: boolean;
}

const progressColorMap = {
  blue:   "bg-blue-600",
  green:  "bg-green-500",
  red:    "bg-red-500",
  yellow: "bg-yellow-400",
  purple: "bg-purple-500",
};

const progressSizeMap = { sm: "h-1", md: "h-2", lg: "h-3" };

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value, max = 100, label, color = "blue", size = "md", animated = false, showValue = false,
}) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between mb-1 text-xs text-gray-600">
          {label && <span>{label}</span>}
          {showValue && <span>{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${progressSizeMap[size]}`}
        role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
        <div
          className={`h-full ${progressColorMap[color]} rounded-full transition-all duration-500 ${animated ? "animate-pulse" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?:        ReactNode;
  title:        string;
  description?: string;
  action?:      ReactNode;
  className?:   string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon, title, description, action, className = "",
}) => (
  <div className={`flex flex-col items-center justify-center text-center py-16 px-4 ${className}`}>
    {icon && (
      <div className="mb-4 p-4 bg-gray-50 rounded-full text-gray-300">
        {icon}
      </div>
    )}
    <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
    {description && <p className="text-sm text-gray-500 max-w-xs mb-4">{description}</p>}
    {action}
  </div>
);

// ─── ErrorBoundaryFallback ────────────────────────────────────────────────────

interface ErrorFallbackProps {
  error:   Error;
  reset:   () => void;
  compact?: boolean;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, reset, compact = false }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="flex-1">{error.message}</span>
        <button onClick={reset} className="underline hover:no-underline font-medium">Retry</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200 text-center">
      <div className="p-3 bg-red-100 rounded-full mb-4">
        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">Something went wrong</h3>
      <p className="text-sm text-gray-600 mb-4 max-w-sm">{error.message}</p>
      <button onClick={reset} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors">
        Try again
      </button>
    </div>
  );
};

// ─── Toast System ─────────────────────────────────────────────────────────────

function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case "ADD":    return [...state, action.toast];
    case "REMOVE": return state.filter((t) => t.id !== action.id);
    default:       return state;
  }
}

const toastVariantMap: Record<ToastVariant, { bg: string; icon: string }> = {
  info:    { bg: "bg-blue-600",  icon: "ℹ" },
  success: { bg: "bg-green-600", icon: "✓" },
  warning: { bg: "bg-yellow-500", icon: "⚠" },
  error:   { bg: "bg-red-600",   icon: "✕" },
};

interface ToastContextValue {
  toast:        (message: string, variant?: ToastVariant, options?: Partial<Toast>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {}, dismissToast: () => {} });
export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: ReactNode; maxToasts?: number }> = ({
  children, maxToasts = 5,
}) => {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const dismissToast = useCallback((id: string) => {
    dispatch({ type: "REMOVE", id });
  }, []);

  const toast = useCallback((
    message: string,
    variant: ToastVariant = "info",
    options: Partial<Toast> = {}
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = options.duration ?? 4000;
    dispatch({ type: "ADD", toast: { id, message, variant, duration, ...options } });
    if (duration > 0) setTimeout(() => dismissToast(id), duration);
  }, [dismissToast]);

  const visible = toasts.slice(-maxToasts);

  return (
    <ToastContext.Provider value={{ toast, dismissToast }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {visible.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  const { bg, icon } = toastVariantMap[toast.variant];
  const [visible, setVisible] = React.useState(false);

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex items-center gap-3 min-w-[280px] max-w-sm px-4 py-3 ${bg} text-white rounded-lg shadow-lg transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
    >
      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-xs font-bold">
        {icon}
      </span>
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      {toast.action && (
        <button onClick={() => { toast.action!.onClick(); onDismiss(); }}
          className="text-sm font-semibold underline hover:no-underline whitespace-nowrap">
          {toast.action.label}
        </button>
      )}
      <button onClick={onDismiss} aria-label="Dismiss notification" className="ml-1 opacity-75 hover:opacity-100 transition-opacity">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

/*
 * Usage Examples:
 *
 * // Wrap app in ToastProvider
 * <ToastProvider><App /></ToastProvider>
 *
 * // Show toasts anywhere
 * const { toast } = useToast();
 * toast("Saved successfully!", "success");
 * toast("Failed to connect", "error", { duration: 0, action: { label: "Retry", onClick: retry } });
 *
 * // Show skeleton while loading
 * {isLoading ? <SkeletonCard lines={3} /> : <Card data={data} />}
 *
 * // Progress bar
 * <ProgressBar value={uploadProgress} label="Uploading..." showValue color="blue" />
 *
 * // Empty state
 * <EmptyState
 *   icon={<InboxIcon className="w-12 h-12" />}
 *   title="No messages yet"
 *   description="When you receive messages, they'll appear here."
 *   action={<Button onClick={compose}>Compose</Button>}
 * />
 */
