/**
 * @keywords    useMount hook, useUnmount, useResizeObserver hook, useIntersectionObserver hook, useEventListener, useDebounce hook, useThrottle hook, useScrollPosition, effect cleanup, react lifecycle
 * @domain      Lifecycle Hooks
 * @use-when    Responding to DOM events, viewport changes, element visibility, or managing effect cleanup
 * @not-when    Data fetching — use hooks.async.ts; simple state — use plain useState
 */

import {
  useEffect, useRef, useState, useCallback, RefObject, DependencyList,
} from "react";

// ─── useMount / useUnmount ────────────────────────────────────────────────────

export function useMount(fn: () => void): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fn(); }, []);
}

export function useUnmount(fn: () => void): void {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => fnRef.current(), []);
}

export function useIsMounted(): () => boolean {
  const ref = useRef(false);
  useEffect(() => {
    ref.current = true;
    return () => { ref.current = false; };
  }, []);
  return useCallback(() => ref.current, []);
}

// ─── usePrevious — Access the previous render's value ────────────────────────

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => { ref.current = value; });
  return ref.current;
}

// ─── useDebounce / useThrottle ────────────────────────────────────────────────

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function useDebouncedCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef    = useRef(fn);
  fnRef.current  = fn;

  return useCallback((...args: Parameters<T>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fnRef.current(...args), delay);
  }, [delay]) as T;
}

export function useThrottledCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  interval: number
): T {
  const lastRef  = useRef(0);
  const fnRef    = useRef(fn);
  fnRef.current  = fn;

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastRef.current >= interval) {
      lastRef.current = now;
      fnRef.current(...args);
    }
  }, [interval]) as T;
}

// ─── useEventListener ─────────────────────────────────────────────────────────

export function useEventListener<K extends keyof WindowEventMap>(
  event: K,
  handler: (e: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions
): void;
export function useEventListener<K extends keyof HTMLElementEventMap, T extends HTMLElement>(
  event: K,
  handler: (e: HTMLElementEventMap[K]) => void,
  target: RefObject<T>,
  options?: AddEventListenerOptions
): void;
export function useEventListener(
  event: string,
  handler: (e: Event) => void,
  targetOrOptions?: RefObject<HTMLElement> | AddEventListenerOptions,
  options?: AddEventListenerOptions
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const isRef = targetOrOptions && "current" in (targetOrOptions as object);
    const el: EventTarget | undefined = isRef
      ? (targetOrOptions as RefObject<HTMLElement>).current!
      : (typeof window !== "undefined" ? window : undefined);
    const opts = isRef ? options : (targetOrOptions as AddEventListenerOptions);

    if (!el || typeof el.addEventListener !== "function") return;
    const listener = (e: Event) => handlerRef.current(e as Event);
    el.addEventListener(event, listener, opts);
    return () => el.removeEventListener(event, listener, opts);
  }, [event, targetOrOptions, options]);
}

// ─── useWindowSize ────────────────────────────────────────────────────────────

interface WindowSize { width: number; height: number; }

export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>(() => {
    // FIX: Initialize with actual values (SSR-safe) to avoid 0x0 flash
    if (typeof window === "undefined") return { width: 0, height: 0 };
    return { width: window.innerWidth, height: window.innerHeight };
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return size;
}

// ─── useElementSize — ResizeObserver-based element size tracking ──────────────

export function useElementSize<T extends HTMLElement>(): [RefObject<T>, { width: number; height: number }] {
  const ref  = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}

// ─── useIntersection — Observe when element enters/leaves viewport ────────────

interface IntersectionOptions extends IntersectionObserverInit {
  once?: boolean;  // stop observing after first intersection
}

export function useIntersection<T extends HTMLElement>(
  options: IntersectionOptions = {}
): [RefObject<T>, IntersectionObserverEntry | null, boolean] {
  const { once = false, ...observerOptions } = options;
  const ref   = useRef<T>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([e]) => {
      setEntry(e);
      if (once && e.isIntersecting) observer.disconnect();
    }, observerOptions);

    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [once, observerOptions.root, observerOptions.rootMargin, observerOptions.threshold]);

  return [ref, entry, entry?.isIntersecting ?? false];
}

// ─── useScrollPosition ────────────────────────────────────────────────────────

interface ScrollPosition { x: number; y: number; direction: "up" | "down" | "none"; atTop: boolean; atBottom: boolean; }

export function useScrollPosition(elementRef?: RefObject<HTMLElement>): ScrollPosition {
  const [pos, setPos] = useState<ScrollPosition>({ x: 0, y: 0, direction: "none", atTop: true, atBottom: false });
  const lastY = useRef(0);

  useEffect(() => {
    // FIX: SSR guard
    if (typeof window === "undefined") return;
    const el = elementRef?.current ?? window;

    const getY = () => elementRef?.current
      ? elementRef.current.scrollTop
      : window.scrollY;
    const getX = () => elementRef?.current
      ? elementRef.current.scrollLeft
      : window.scrollX;
    const getHeight = () => elementRef?.current
      ? elementRef.current.scrollHeight - elementRef.current.clientHeight
      : document.documentElement.scrollHeight - window.innerHeight;

    const handler = () => {
      const y = getY();
      const x = getX();
      const maxY = getHeight();
      setPos({
        x, y,
        direction: y > lastY.current ? "down" : y < lastY.current ? "up" : "none",
        atTop:    y <= 0,
        atBottom: y >= maxY - 1,
      });
      lastY.current = y;
    };

    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [elementRef]);

  return pos;
}

// ─── useInterval / useTimeout ─────────────────────────────────────────────────

export function useInterval(callback: () => void, delay: number | null) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => callbackRef.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

export function useTimeout(callback: () => void, delay: number | null) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (delay === null) return;
    const id = setTimeout(() => callbackRef.current(), delay);
    return () => clearTimeout(id);
  }, [delay]);
}

// ─── useUpdateEffect — Run effect only on updates, not on mount ───────────────

export function useUpdateEffect(effect: () => void | (() => void), deps: DependencyList): void {
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ─── useLatest — Always get the latest value without stale closure ────────────

export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/*
 * Usage Examples:
 *
 * // Debounce search input
 * const [query, setQuery] = useState("");
 * const debouncedQuery = useDebounce(query, 300);
 * useEffect(() => { if (debouncedQuery) search(debouncedQuery); }, [debouncedQuery]);
 *
 * // Lazy-load content when it enters viewport
 * const [ref, , isVisible] = useIntersection<HTMLDivElement>({ threshold: 0.1, once: true });
 * <div ref={ref}>{isVisible ? <HeavyComponent /> : <Skeleton />}</div>
 *
 * // Responsive component
 * const [sizeRef, { width }] = useElementSize<HTMLDivElement>();
 * <div ref={sizeRef}>{width > 600 ? <DesktopView /> : <MobileView />}</div>
 *
 * // Hide header on scroll down, show on scroll up
 * const { direction } = useScrollPosition();
 * <header style={{ transform: direction === "down" ? "translateY(-100%)" : "translateY(0)" }}>
 */
