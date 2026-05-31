/**
 * @keywords    aria, keyboard nav, screen reader, focus trap, tab order, accessibility, a11y, wcag, focus management
 * @domain      Accessibility
 * @use-when    Building accessible modals, menus, comboboxes, or any interactive UI that must work for keyboard/screen reader users
 * @not-when    Static content pages — focus management and ARIA are only necessary for interactive widgets
 */

import { useRef, useEffect, useCallback, useState, RefObject, KeyboardEvent, useId } from "react";

// ─── Focus Trap ───────────────────────────────────────────────────────────────
// Keeps keyboard focus inside a container (required for modals, drawers, dialogs)

const FOCUSABLE_SELECTORS = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])', 'details > summary',
].join(', ');

export function useFocusTrap(containerRef: RefObject<HTMLElement>, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    const focusable = () => Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS))
      .filter((n) => !n.closest('[aria-hidden="true"]'));

    // Focus the first element when trap activates
    const first = focusable()[0];
    const previouslyFocused = document.activeElement as HTMLElement | null;
    first?.focus();

    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) { e.preventDefault(); return; }
      const firstEl = items[0];
      const lastEl  = items[items.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      } else {
        if (document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
      }
    };

    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      // Restore focus to the element that triggered the trap (e.g., the button that opened a modal)
      previouslyFocused?.focus?.();
    };
  }, [containerRef, enabled]);
}

// ─── useRovingTabIndex — Arrow-key navigation within a group ──────────────────
// Used for toolbars, tab lists, radio groups, menus — follows WAI-ARIA roving tabindex pattern

interface UseRovingTabIndexOptions {
  orientation?: "horizontal" | "vertical" | "both";
  loop?:        boolean;
  onSelect?:    (index: number) => void;
}

export function useRovingTabIndex(
  containerRef: RefObject<HTMLElement>,
  count: number,
  options: UseRovingTabIndexOptions = {}
) {
  const { orientation = "horizontal", loop = true, onSelect } = options;
  const [activeIndex, setActiveIndex] = useState(0);

  const getItemProps = useCallback((index: number) => ({
    tabIndex: index === activeIndex ? 0 : -1,
    "aria-selected": index === activeIndex,
    onKeyDown: (e: KeyboardEvent) => {
      let next = activeIndex;
      const isH = orientation === "horizontal" || orientation === "both";
      const isV = orientation === "vertical"   || orientation === "both";

      if ((isH && e.key === "ArrowRight") || (isV && e.key === "ArrowDown")) {
        e.preventDefault();
        next = loop ? (activeIndex + 1) % count : Math.min(activeIndex + 1, count - 1);
      } else if ((isH && e.key === "ArrowLeft") || (isV && e.key === "ArrowUp")) {
        e.preventDefault();
        next = loop ? (activeIndex - 1 + count) % count : Math.max(activeIndex - 1, 0);
      } else if (e.key === "Home") {
        e.preventDefault(); next = 0;
      } else if (e.key === "End") {
        e.preventDefault(); next = count - 1;
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault(); onSelect?.(activeIndex);
      }

      if (next !== activeIndex) {
        setActiveIndex(next);
        // Focus the newly active item
        const items = containerRef.current?.querySelectorAll<HTMLElement>('[tabindex]');
        items?.[next]?.focus();
      }
    },
    onClick: () => { setActiveIndex(index); onSelect?.(index); },
  }), [activeIndex, count, loop, orientation, onSelect, containerRef]);

  return { activeIndex, setActiveIndex, getItemProps };
}

// ─── useLiveRegion — Dynamic announcements for screen readers ─────────────────

type LivePoliteness = "polite" | "assertive" | "off";

export function useLiveRegion(politeness: LivePoliteness = "polite") {
  const [message, setMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  const announce = useCallback((text: string, clearAfter: number = 3000) => {
    // Clear first so re-announcing the same text is always detected as a change
    setMessage("");
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setMessage(text);
      if (clearAfter > 0) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setMessage(""), clearAfter);
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // The JSX to render in your component tree (visually hidden)
  const LiveRegion = useCallback(() => (
    <div
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
      style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}
    >
      {message}
    </div>
  ), [message, politeness]);

  return { announce, LiveRegion };
}

// ─── useKeyboardShortcut ──────────────────────────────────────────────────────

type ModifierKey = "ctrl" | "meta" | "shift" | "alt";

interface ShortcutDefinition {
  key:       string;
  modifiers?: ModifierKey[];
  handler:   (e: globalThis.KeyboardEvent) => void;
  disabled?: boolean;
  // Prevent default browser action when shortcut matches
  preventDefault?: boolean;
}

export function useKeyboardShortcut(shortcuts: ShortcutDefinition[]) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      for (const s of shortcutsRef.current) {
        if (s.disabled) continue;
        if (e.key.toLowerCase() !== s.key.toLowerCase()) continue;

        const mods = s.modifiers ?? [];
        const ctrlOk  = mods.includes("ctrl")  ? e.ctrlKey  : !e.ctrlKey;
        const metaOk  = mods.includes("meta")  ? e.metaKey  : !e.metaKey;
        const shiftOk = mods.includes("shift") ? e.shiftKey : !e.shiftKey;
        const altOk   = mods.includes("alt")   ? e.altKey   : !e.altKey;

        if (ctrlOk && metaOk && shiftOk && altOk) {
          if (s.preventDefault) e.preventDefault();
          s.handler(e);
          return;
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
}

// ─── useAriaId — Stable unique IDs for ARIA relationships ────────────────────

export function useAriaId(prefix: string = "aria"): string {
  const id = useId();
  return `${prefix}-${id.replace(/:/g, "")}`;
}

// ─── getAriaProps — Helper to build common ARIA attribute sets ─────────────────

export type WidgetRole =
  | "button" | "checkbox" | "combobox" | "dialog" | "listbox"
  | "menu" | "menuitem" | "option" | "radio" | "slider"
  | "switch" | "tab" | "tabpanel" | "textbox" | "tooltip";

interface AriaPropsOptions {
  role:      WidgetRole;
  label?:    string;
  labelledBy?: string;
  describedBy?: string;
  expanded?:  boolean;
  selected?:  boolean;
  checked?:   boolean | "mixed";
  disabled?:  boolean;
  required?:  boolean;
  invalid?:   boolean;
  live?:      LivePoliteness;
  controls?:  string;
  owns?:      string;
  haspopup?: boolean | "menu" | "listbox" | "dialog";
}

export function getAriaProps(options: AriaPropsOptions): Record<string, string | boolean | undefined> {
  const attrs: Record<string, string | boolean | undefined> = { role: options.role };

  if (options.label)       attrs["aria-label"]       = options.label;
  if (options.labelledBy)  attrs["aria-labelledby"]  = options.labelledBy;
  if (options.describedBy) attrs["aria-describedby"] = options.describedBy;
  if (options.expanded !== undefined) attrs["aria-expanded"] = options.expanded;
  if (options.selected !== undefined) attrs["aria-selected"] = options.selected;
  if (options.checked  !== undefined) attrs["aria-checked"]  = options.checked as boolean;
  if (options.disabled)    attrs["aria-disabled"]   = true;
  if (options.required)    attrs["aria-required"]   = true;
  if (options.invalid)     attrs["aria-invalid"]    = true;
  if (options.live)        attrs["aria-live"]       = options.live;
  if (options.controls)    attrs["aria-controls"]   = options.controls;
  if (options.owns)        attrs["aria-owns"]       = options.owns;
  if (options.haspopup !== undefined) attrs["aria-haspopup"] = options.haspopup as boolean;

  return attrs;
}

// ─── Skip Navigation Link ─────────────────────────────────────────────────────
// "Skip to main content" link — required for WCAG 2.4.1

export function SkipNavLink({ targetId = "main-content" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:outline-none focus:shadow-lg text-sm font-medium"
    >
      Skip to main content
    </a>
  );
}

// ─── VisuallyHidden — Screen-reader-only text ─────────────────────────────────

export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        position: "absolute", width: 1, height: 1,
        overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/*
 * Usage Examples:
 *
 * // Focus trap in a modal
 * const modalRef = useRef<HTMLDivElement>(null);
 * useFocusTrap(modalRef, isOpen);
 * <div ref={modalRef} role="dialog" aria-modal="true">...</div>
 *
 * // Keyboard-navigable tab list
 * const { getItemProps } = useRovingTabIndex(listRef, tabs.length, {
 *   orientation: "horizontal",
 *   onSelect: (i) => setActiveTab(i),
 * });
 * tabs.map((tab, i) => <button key={tab.id} {...getItemProps(i)}>{tab.label}</button>)
 *
 * // Announce search results to screen readers
 * const { announce, LiveRegion } = useLiveRegion();
 * useEffect(() => announce(`${results.length} results found`), [results]);
 * <><LiveRegion /><ResultsList /></>
 *
 * // Global keyboard shortcuts
 * useKeyboardShortcut([
 *   { key: "k", modifiers: ["ctrl"], handler: () => openSearch(), preventDefault: true },
 *   { key: "Escape", handler: () => closeModal() },
 * ]);
 */
