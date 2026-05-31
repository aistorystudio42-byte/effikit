/**
 * @keywords    drag, drop, gesture, swipe, click, touch, pointer, interaction, dnd, long press, pan
 * @domain      UX Interactions
 * @use-when    Building drag-and-drop lists, swipe gestures, long-press actions, or touch-friendly interactions
 * @not-when    Simple click handlers — this is for complex multi-pointer / gesture scenarios
 */

import { useRef, useCallback, useEffect, useState, RefObject } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Point { x: number; y: number; }
export interface Rect  { x: number; y: number; width: number; height: number; }

export interface GestureState {
  isDragging:   boolean;
  isSwiping:    boolean;
  startPoint:   Point | null;
  currentPoint: Point | null;
  delta:        Point;
  velocity:     Point;
  direction:    "left" | "right" | "up" | "down" | null;
  distance:     number;
  duration:     number;
}

export interface DragItem<T = unknown> {
  id: string;
  index: number;
  data: T;
}

// ─── usePointer — Unified mouse/touch position tracker ───────────────────────

export function usePointer(elementRef: RefObject<HTMLElement>) {
  const [pos, setPos] = useState<Point>({ x: 0, y: 0 });
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const getPoint = (e: MouseEvent | TouchEvent): Point => {
      if ("touches" in e) {
        // FIX: Guard against empty touches array (touchend has no touches)
        const touch = e.touches[0] ?? e.changedTouches?.[0];
        return touch ? { x: touch.clientX, y: touch.clientY } : { x: 0, y: 0 };
      }
      return { x: e.clientX, y: e.clientY };
    };

    const onMove = (e: MouseEvent | TouchEvent) => setPos(getPoint(e));
    const onEnter = () => setIsOver(true);
    const onLeave = () => setIsOver(false);

    el.addEventListener("mousemove", onMove);
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);

    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [elementRef]);

  return { pos, isOver };
}

// ─── useGesture — Swipe, pan, velocity detection ─────────────────────────────

interface UseGestureOptions {
  onSwipeLeft?:  (state: GestureState) => void;
  onSwipeRight?: (state: GestureState) => void;
  onSwipeUp?:    (state: GestureState) => void;
  onSwipeDown?:  (state: GestureState) => void;
  onDragStart?:  (state: GestureState) => void;
  onDrag?:       (state: GestureState) => void;
  onDragEnd?:    (state: GestureState) => void;
  threshold?:    number;  // minimum px distance to register as a swipe
  velocityThreshold?: number;
}

export function useGesture(
  elementRef: RefObject<HTMLElement>,
  options: UseGestureOptions = {}
): GestureState {
  const { threshold = 50, velocityThreshold = 0.3 } = options;
  
  // FIX: Stabilize callback options with a ref to avoid infinite re-binds in useEffect
  const optsRef = useRef(options);
  optsRef.current = options;

  const stateRef = useRef<GestureState>({
    isDragging: false, isSwiping: false,
    startPoint: null, currentPoint: null,
    delta: { x: 0, y: 0 }, velocity: { x: 0, y: 0 },
    direction: null, distance: 0, duration: 0,
  });

  const startTimeRef = useRef<number>(0);
  const lastPointRef = useRef<Point | null>(null);
  const lastTimeRef  = useRef<number>(0);
  const [state, setState] = useState<GestureState>(stateRef.current);

  const update = useCallback(() => setState({ ...stateRef.current }), []);

  const getPoint = (e: MouseEvent | TouchEvent): Point => {
    if ("touches" in e) {
      // FIX: Guard against empty touches array on touchend
      const touch = e.touches[0] ?? e.changedTouches?.[0];
      return touch ? { x: touch.clientX, y: touch.clientY } : { x: 0, y: 0 };
    }
    return { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const onStart = (e: MouseEvent | TouchEvent) => {
      const pt = getPoint(e);
      startTimeRef.current = Date.now();
      lastPointRef.current = pt;
      lastTimeRef.current  = startTimeRef.current;

      stateRef.current = {
        ...stateRef.current,
        isDragging: true, isSwiping: false,
        startPoint: pt, currentPoint: pt,
        delta: { x: 0, y: 0 }, velocity: { x: 0, y: 0 },
        direction: null, distance: 0, duration: 0,
      };
      update();
      optsRef.current.onDragStart?.(stateRef.current);
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!stateRef.current.isDragging || !stateRef.current.startPoint) return;
      const pt  = getPoint(e);
      const now = Date.now();
      const dt  = Math.max(now - lastTimeRef.current, 1);
      const last = lastPointRef.current ?? pt;

      const vx = (pt.x - last.x) / dt;
      const vy = (pt.y - last.y) / dt;

      const dx = pt.x - stateRef.current.startPoint.x;
      const dy = pt.y - stateRef.current.startPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dir = Math.abs(dx) > Math.abs(dy)
        ? dx > 0 ? "right" : "left"
        : dy > 0 ? "down"  : "up";

      stateRef.current = {
        ...stateRef.current,
        currentPoint: pt,
        delta: { x: dx, y: dy },
        velocity: { x: vx, y: vy },
        direction: dir,
        distance: dist,
        duration: now - startTimeRef.current,
      };
      lastPointRef.current = pt;
      lastTimeRef.current  = now;
      update();
      optsRef.current.onDrag?.(stateRef.current);
    };

    const onEnd = () => {
      if (!stateRef.current.isDragging) return;
      const { distance, velocity, direction } = stateRef.current;
      const isSwipe = distance >= threshold || Math.abs(velocity.x) >= velocityThreshold || Math.abs(velocity.y) >= velocityThreshold;

      stateRef.current = { ...stateRef.current, isDragging: false, isSwiping: isSwipe };
      update();
      optsRef.current.onDragEnd?.(stateRef.current);

      if (isSwipe) {
        if (direction === "left")  optsRef.current.onSwipeLeft?.(stateRef.current);
        if (direction === "right") optsRef.current.onSwipeRight?.(stateRef.current);
        if (direction === "up")    optsRef.current.onSwipeUp?.(stateRef.current);
        if (direction === "down")  optsRef.current.onSwipeDown?.(stateRef.current);
      }
    };

    el.addEventListener("mousedown",  onStart);
    el.addEventListener("touchstart", onStart, { passive: true });
    // FIX: SSR guard — window may not exist in server-side rendering environments
    if (typeof window === "undefined") return;
    window.addEventListener("mousemove",  onMove);
    window.addEventListener("touchmove",  onMove, { passive: true });
    window.addEventListener("mouseup",   onEnd);
    window.addEventListener("touchend",  onEnd);

    return () => {
      el.removeEventListener("mousedown",  onStart);
      el.removeEventListener("touchstart", onStart);
      window.removeEventListener("mousemove",  onMove);
      window.removeEventListener("touchmove",  onMove);
      window.removeEventListener("mouseup",   onEnd);
      window.removeEventListener("touchend",  onEnd);
    };
  }, [elementRef, threshold, velocityThreshold, update]);

  return state;
}

// ─── useLongPress ─────────────────────────────────────────────────────────────

interface UseLongPressOptions {
  onLongPress: () => void;
  onPress?:    () => void;
  delay?:      number;
  moveThreshold?: number;
}

export function useLongPress(options: UseLongPressOptions) {
  const { onLongPress, onPress, delay = 500, moveThreshold = 10 } = options;
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef    = useRef<Point | null>(null);
  const firedRef    = useRef(false);

  const start = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    firedRef.current = false;
    const pt = "touches" in e
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY };
    startRef.current = pt;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const end = useCallback(() => {
    cancel();
    if (!firedRef.current) onPress?.();
  }, [cancel, onPress]);

  const move = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!startRef.current) return;
    const pt = "touches" in e
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY };
    const dx = pt.x - startRef.current.x;
    const dy = pt.y - startRef.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > moveThreshold) cancel();
  }, [cancel, moveThreshold]);

  return {
    onMouseDown:   start,
    onMouseUp:     end,
    onMouseMove:   move,
    onMouseLeave:  cancel,
    onTouchStart:  start,
    onTouchEnd:    end,
    onTouchMove:   move,
    onTouchCancel: cancel,
  };
}

// ─── useSortable — Keyboard-accessible drag-and-drop list reordering ──────────

export interface SortableOptions<T> {
  items: T[];
  getKey: (item: T) => string;
  onReorder: (newItems: T[]) => void;
}

export function useSortable<T>({ items, getKey, onReorder }: SortableOptions<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((index: number) => {
    setOverIndex(index);
  }, []);

  const handleDrop = useCallback(() => {
    if (dragIndex === null || overIndex === null || dragIndex === overIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(overIndex, 0, moved);
    onReorder(next);
    setDragIndex(null);
    setOverIndex(null);
  }, [dragIndex, overIndex, items, onReorder]);

  // Returns props to spread onto each draggable item
  const getDragProps = useCallback((index: number) => ({
    draggable: true,
    "aria-grabbed": dragIndex === index,
    onDragStart: () => handleDragStart(index),
    onDragOver:  (e: React.DragEvent) => { e.preventDefault(); handleDragOver(index); },
    onDrop:      (e: React.DragEvent) => { e.preventDefault(); handleDrop(); },
    onDragEnd:   () => { setDragIndex(null); setOverIndex(null); },
    style: {
      opacity:   dragIndex === index ? 0.4 : 1,
      transform: overIndex === index && dragIndex !== null ? "scale(1.02)" : "scale(1)",
      transition: "transform 150ms ease, opacity 150ms ease",
      cursor: "grab",
    } as React.CSSProperties,
  }), [dragIndex, overIndex, handleDragStart, handleDragOver, handleDrop]);

  return { dragIndex, overIndex, getDragProps };
}

// ─── useClickOutside ──────────────────────────────────────────────────────────

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  handler: () => void
) {
  // FIX: Stabilize handler ref to prevent unbind/rebind loop on inline functions
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    // FIX: SSR guard — document may not exist in server-side rendering
    if (typeof document === "undefined") return;
    const listener = (e: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handlerRef.current();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener, { passive: true });
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref]);
}

/*
 * Usage Examples:
 *
 * // Swipe to dismiss
 * const ref = useRef<HTMLDivElement>(null);
 * const gesture = useGesture(ref, {
 *   onSwipeLeft: () => dismiss(),
 *   threshold: 80,
 * });
 * <div ref={ref} style={{ transform: `translateX(${gesture.delta.x}px)` }}>Card</div>
 *
 * // Long press context menu
 * const handlers = useLongPress({
 *   onLongPress: () => openContextMenu(),
 *   onPress: () => navigate(item.url),
 *   delay: 600,
 * });
 * <div {...handlers}>Item</div>
 *
 * // Sortable list
 * const { getDragProps } = useSortable({ items, getKey: i => i.id, onReorder: setItems });
 * items.map((item, i) => <div key={item.id} {...getDragProps(i)}>{item.label}</div>)
 */
