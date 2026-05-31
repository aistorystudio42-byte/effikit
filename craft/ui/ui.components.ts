/**
 * @keywords    card, modal, dialog, input, dropdown, button, badge, avatar, tooltip, popover, react component, ui
 * @domain      UI Components
 * @use-when    You need ready-made, accessible React components: cards, modals, inputs, dropdowns, badges
 * @not-when    You need complex data-fetching logic or business logic — this is pure presentation
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  createContext,
  useContext,
  forwardRef,
  useId,
  ReactNode,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  HTMLAttributes,
  KeyboardEvent,
} from "react";

// ─── Design Token Types ───────────────────────────────────────────────────────

type Size = "xs" | "sm" | "md" | "lg" | "xl";
type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Placement = "top" | "bottom" | "left" | "right";

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const buttonSizeMap: Record<Size, string> = {
  xs: "px-2 py-1 text-xs",
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
  xl: "px-6 py-3 text-lg",
};

const buttonVariantMap: Record<Variant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
  secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400",
  ghost: "bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-300",
  danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-medium rounded-md border border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        className={`${base} ${buttonSizeMap[size]} ${buttonVariantMap[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
        {!loading && leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);
Button.displayName = "Button";

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Size;
  shadow?: "none" | "sm" | "md" | "lg";
  bordered?: boolean;
  hoverable?: boolean;
}

const cardPaddingMap: Record<Size, string> = {
  xs: "p-2",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
  xl: "p-8",
};

const cardShadowMap = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
};

export const Card: React.FC<CardProps> = ({
  padding = "md",
  shadow = "sm",
  bordered = true,
  hoverable = false,
  className = "",
  children,
  ...props
}) => (
  <div
    className={`bg-white rounded-lg ${cardPaddingMap[padding]} ${cardShadowMap[shadow]} ${bordered ? "border border-gray-200" : ""} ${hoverable ? "transition-shadow hover:shadow-md cursor-pointer" : ""} ${className}`}
    {...props}
  >
    {children}
  </div>
);

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
  inputSize?: Size;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftElement,
      rightElement,
      inputSize = "md",
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    // FIX: useId() instead of Math.random() — SSR-safe, stable across renders,
    // prevents hydration mismatch and broken htmlFor/id associations.
    const generatedId = useId();
    const inputId = id ?? generatedId;

    const sizeClasses: Record<Size, string> = {
      xs: "text-xs px-2 py-1",
      sm: "text-sm px-3 py-1.5",
      md: "text-sm px-3 py-2",
      lg: "text-base px-4 py-2.5",
      xl: "text-lg px-4 py-3",
    };

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftElement && (
            <div className="absolute left-3 text-gray-400">{leftElement}</div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            aria-invalid={!!error}
            className={`w-full rounded-md border bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${error ? "border-red-500 focus:ring-red-400" : "border-gray-300 focus:ring-blue-500"} ${sizeClasses[inputSize]} ${leftElement ? "pl-9" : ""} ${rightElement ? "pr-9" : ""} disabled:bg-gray-50 disabled:text-gray-400 ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 text-gray-400">{rightElement}</div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="text-xs text-gray-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

// ─── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant | "neutral";
  size?: "sm" | "md";
  dot?: boolean;
}

const badgeVariantMap: Record<Variant | "neutral", string> = {
  primary: "bg-blue-100 text-blue-800",
  secondary: "bg-purple-100 text-purple-800",
  ghost: "bg-gray-100 text-gray-600",
  danger: "bg-red-100 text-red-800",
  success: "bg-green-100 text-green-800",
  neutral: "bg-gray-100 text-gray-700",
};

export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  size = "md",
  dot = false,
  className = "",
  children,
  ...props
}) => (
  <span
    className={`inline-flex items-center gap-1 font-medium rounded-full ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"} ${badgeVariantMap[variant]} ${className}`}
    {...props}
  >
    {dot && <span className={`w-1.5 h-1.5 rounded-full ${variant === "success" ? "bg-green-500" : variant === "danger" ? "bg-red-500" : "bg-current"}`} />}
    {children}
  </span>
);

// ─── Avatar ───────────────────────────────────────────────────────────────────

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  name?: string;
  size?: Size;
  shape?: "circle" | "square";
}

const avatarSizeMap: Record<Size, string> = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// FIX: DJB2 hash — far fewer collisions than simple charCode sum.
// "AB" and "BA" now produce different hashes.
function nameToColor(name: string): string {
  const colors = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"];
  const hash = name.split("").reduce((h, c) => ((h * 31 + c.charCodeAt(0)) >>> 0), 5381);
  return colors[hash % colors.length];
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name,
  size = "md",
  shape = "circle",
  className = "",
  ...props
}) => {
  const [imgError, setImgError] = useState(false);
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-md";

  return (
    <div
      className={`inline-flex items-center justify-center overflow-hidden flex-shrink-0 ${avatarSizeMap[size]} ${shapeClass} ${!src || imgError ? (name ? nameToColor(name) : "bg-gray-200") : ""} ${className}`}
      aria-label={alt ?? name}
      {...props}
    >
      {src && !imgError ? (
        <img src={src} alt={alt ?? name ?? ""} className="w-full h-full object-cover" onError={() => setImgError(true)} />
      ) : name ? (
        <span className="text-white font-medium select-none">{getInitials(name)}</span>
      ) : (
        <svg className="w-1/2 h-1/2 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8c0 2.208-1.79 4-3.998 4-2.208 0-3.998-1.792-3.998-4s1.79-4 3.998-4c2.208 0 3.998 1.792 3.998 4z" />
        </svg>
      )}
    </div>
  );
};

// ─── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipProps {
  content: ReactNode;
  placement?: Placement;
  children: ReactNode;
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  placement = "top",
  children,
  delay = 300,
}) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  // FIX: Cleanup on unmount prevents timer firing after component is gone.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const placementClasses: Record<Placement, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1",
    left: "right-full top-1/2 -translate-y-1/2 mr-1",
    right: "left-full top-1/2 -translate-y-1/2 ml-1",
  };

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {visible && (
        <div
          role="tooltip"
          className={`absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap pointer-events-none ${placementClasses[placement]}`}
        >
          {content}
        </div>
      )}
    </div>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  children: ReactNode;
  footer?: ReactNode;
}

// FIX: Null-safe context — throws a clear error if useModal() is called
// outside of a <Modal>, preventing silent misbehavior.
const ModalContext = createContext<{ close: () => void } | null>(null);

export function useModal(): { close: () => void } {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be called inside a <Modal> component.");
  return ctx;
}

const modalSizeMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-full mx-4",
};

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // FIX: useId() for ARIA relationships — unique per Modal instance,
  // SSR-safe, prevents duplicate-id WCAG violations when multiple Modals exist.
  const titleId = useId();
  const descId = useId();

  // Trap focus inside modal while open
  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();

    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        if (focusable.length === 0) { e.preventDefault(); return; }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <ModalContext.Provider value={{ close: onClose }}>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        aria-modal="true"
        role="dialog"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

        {/* Panel */}
        <div
          ref={dialogRef}
          className={`relative z-10 w-full ${modalSizeMap[size]} bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh]`}
        >
          {/* Header */}
          {(title || description) && (
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              {title && <h2 id={titleId} className="text-lg font-semibold text-gray-900">{title}</h2>}
              {description && <p id={descId} className="mt-1 text-sm text-gray-500">{description}</p>}
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

          {/* Footer */}
          {footer && <div className="px-6 pb-6 pt-4 border-t border-gray-100">{footer}</div>}
        </div>
      </div>
    </ModalContext.Provider>
  );
};

// ─── Dropdown ─────────────────────────────────────────────────────────────────

interface DropdownItem {
  label: string;
  value: string;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  onSelect: (value: string) => void;
  placement?: "bottom-left" | "bottom-right";
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  onSelect,
  placement = "bottom-left",
}) => {
  const [open, setOpen] = useState(false);
  // FIX: activeIndex now tracks index within the FULL items array (not filtered),
  // so keyboard selection always maps correctly to rendered items.
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const enabledIndices = items.reduce<number[]>((acc, item, i) => {
      if (!item.disabled) acc.push(i);
      return acc;
    }, []);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((cur) => {
        const curPos = enabledIndices.indexOf(cur);
        return enabledIndices[Math.min(curPos + 1, enabledIndices.length - 1)] ?? -1;
      });
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((cur) => {
        const curPos = enabledIndices.indexOf(cur);
        return enabledIndices[Math.max(curPos - 1, 0)] ?? -1;
      });
    }
    if (e.key === "Enter" && activeIndex >= 0) {
      const item = items[activeIndex];
      if (item && !item.disabled) { onSelect(item.value); setOpen(false); }
    }
    if (e.key === "Escape") { setOpen(false); setActiveIndex(-1); }
  };

  const placementClass = placement === "bottom-right" ? "right-0" : "left-0";

  return (
    <div ref={containerRef} className="relative inline-block" onKeyDown={handleKeyDown}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          className={`absolute z-50 mt-1 ${placementClass} min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg py-1 focus:outline-none`}
          role="menu"
          aria-orientation="vertical"
        >
          {items.map((item, idx) => (
            <button
              key={item.value}
              role="menuitem"
              disabled={item.disabled}
              aria-disabled={item.disabled}
              onClick={() => { onSelect(item.value); setOpen(false); setActiveIndex(-1); }}
              className={`w-full text-left flex items-center gap-2 px-3 py-2 text-sm transition-colors ${item.disabled ? "text-gray-300 cursor-not-allowed" : item.danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"} ${idx === activeIndex ? "bg-gray-50" : ""}`}
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/*
 * Usage Example:
 *
 * <Button variant="primary" size="md" loading={isSubmitting} onClick={handleSubmit}>
 *   Save Changes
 * </Button>
 *
 * <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Confirm Delete"
 *   footer={<Button variant="danger" onClick={handleDelete}>Delete</Button>}>
 *   <p>Are you sure you want to delete this item?</p>
 * </Modal>
 *
 * <Input label="Email" type="email" error={errors.email} hint="We'll never share your email" />
 *
 * <Dropdown
 *   trigger={<Button>Options</Button>}
 *   items={[{ label: "Edit", value: "edit" }, { label: "Delete", value: "delete", danger: true }]}
 *   onSelect={(val) => handleAction(val)}
 * />
 */
