/**
 * @keywords    page transition, route animation, enter, exit, fade, slide, mount animation, framer, css transition
 * @domain      Animation Transitions
 * @use-when    Animating page changes, component mount/unmount, modal open/close, or route transitions
 * @not-when    Continuous animations like loaders or progress bars — use animation.micro.ts for those
 */

import React, {
  useState, useEffect, useRef, useCallback,
  ReactNode, CSSProperties,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransitionState = "entering" | "entered" | "exiting" | "exited";
export type TransitionPreset =
  | "fade"
  | "slide-up"  | "slide-down"  | "slide-left"  | "slide-right"
  | "scale-up"  | "scale-down"
  | "blur-in"
  | "flip-x"    | "flip-y";

export interface TransitionStyles {
  base:     CSSProperties;
  entering: CSSProperties;
  entered:  CSSProperties;
  exiting:  CSSProperties;
  exited:   CSSProperties;
}

// ─── Preset Transition Styles ─────────────────────────────────────────────────

export const transitionPresets: Record<TransitionPreset, TransitionStyles> = {
  fade: {
    base:     { transition: "opacity 200ms ease" },
    entering: { opacity: 0 },
    entered:  { opacity: 1 },
    exiting:  { opacity: 0 },
    exited:   { opacity: 0, pointerEvents: "none" },
  },
  "slide-up": {
    base:     { transition: "opacity 250ms ease, transform 250ms cubic-bezier(0.34,1.56,0.64,1)" },
    entering: { opacity: 0, transform: "translateY(12px)" },
    entered:  { opacity: 1, transform: "translateY(0)" },
    exiting:  { opacity: 0, transform: "translateY(-8px)" },
    exited:   { opacity: 0, transform: "translateY(12px)", pointerEvents: "none" },
  },
  "slide-down": {
    base:     { transition: "opacity 250ms ease, transform 250ms cubic-bezier(0.34,1.56,0.64,1)" },
    entering: { opacity: 0, transform: "translateY(-12px)" },
    entered:  { opacity: 1, transform: "translateY(0)" },
    exiting:  { opacity: 0, transform: "translateY(8px)" },
    exited:   { opacity: 0, transform: "translateY(-12px)", pointerEvents: "none" },
  },
  "slide-left": {
    base:     { transition: "opacity 250ms ease, transform 250ms ease" },
    entering: { opacity: 0, transform: "translateX(20px)" },
    entered:  { opacity: 1, transform: "translateX(0)" },
    exiting:  { opacity: 0, transform: "translateX(-20px)" },
    exited:   { opacity: 0, pointerEvents: "none" },
  },
  "slide-right": {
    base:     { transition: "opacity 250ms ease, transform 250ms ease" },
    entering: { opacity: 0, transform: "translateX(-20px)" },
    entered:  { opacity: 1, transform: "translateX(0)" },
    exiting:  { opacity: 0, transform: "translateX(20px)" },
    exited:   { opacity: 0, pointerEvents: "none" },
  },
  "scale-up": {
    base:     { transition: "opacity 200ms ease, transform 200ms cubic-bezier(0.34,1.56,0.64,1)", transformOrigin: "center" },
    entering: { opacity: 0, transform: "scale(0.9)" },
    entered:  { opacity: 1, transform: "scale(1)" },
    exiting:  { opacity: 0, transform: "scale(0.95)" },
    exited:   { opacity: 0, transform: "scale(0.9)", pointerEvents: "none" },
  },
  "scale-down": {
    base:     { transition: "opacity 200ms ease, transform 200ms ease", transformOrigin: "top" },
    entering: { opacity: 0, transform: "scale(1.05)" },
    entered:  { opacity: 1, transform: "scale(1)" },
    exiting:  { opacity: 0, transform: "scale(0.95)" },
    exited:   { opacity: 0, pointerEvents: "none" },
  },
  "blur-in": {
    base:     { transition: "opacity 300ms ease, filter 300ms ease, transform 300ms ease" },
    entering: { opacity: 0, filter: "blur(4px)", transform: "scale(0.98)" },
    entered:  { opacity: 1, filter: "blur(0px)", transform: "scale(1)" },
    exiting:  { opacity: 0, filter: "blur(4px)" },
    exited:   { opacity: 0, pointerEvents: "none" },
  },
  "flip-x": {
    base:     { transition: "opacity 300ms ease, transform 300ms ease", transformStyle: "preserve-3d" },
    entering: { opacity: 0, transform: "rotateX(-20deg)" },
    entered:  { opacity: 1, transform: "rotateX(0deg)" },
    exiting:  { opacity: 0, transform: "rotateX(20deg)" },
    exited:   { opacity: 0, pointerEvents: "none" },
  },
  "flip-y": {
    base:     { transition: "opacity 300ms ease, transform 300ms ease", transformStyle: "preserve-3d" },
    entering: { opacity: 0, transform: "rotateY(-20deg)" },
    entered:  { opacity: 1, transform: "rotateY(0deg)" },
    exiting:  { opacity: 0, transform: "rotateY(20deg)" },
    exited:   { opacity: 0, pointerEvents: "none" },
  },
};

// ─── useTransition hook ───────────────────────────────────────────────────────

interface UseTransitionOptions {
  duration?: number;
  delay?:    number;
  onEntered?: () => void;
  onExited?:  () => void;
}

export function useTransition(
  visible: boolean,
  options: UseTransitionOptions = {}
): { state: TransitionState; mounted: boolean } {
  const { duration = 200, delay = 0, onEntered, onExited } = options;
  const [state,   setState]   = useState<TransitionState>(visible ? "entered" : "exited");
  const [mounted, setMounted] = useState(visible);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (visible) {
      setMounted(true);
      timerRef.current = setTimeout(() => {
        setState("entering");
        timerRef.current = setTimeout(() => {
          setState("entered");
          onEntered?.();
        }, duration);
      }, delay);
    } else {
      setState("exiting");
      timerRef.current = setTimeout(() => {
        setState("exited");
        setMounted(false);
        onExited?.();
      }, duration + delay);
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [visible, duration, delay, onEntered, onExited]);

  return { state, mounted };
}

// ─── Transition component ─────────────────────────────────────────────────────

interface TransitionProps {
  visible:   boolean;
  preset?:   TransitionPreset;
  styles?:   TransitionStyles;
  duration?: number;
  delay?:    number;
  className?: string;
  style?:    CSSProperties;
  children:  ReactNode;
  as?:       keyof JSX.IntrinsicElements;
  onEntered?: () => void;
  onExited?:  () => void;
  keepMounted?: boolean;
}

export const Transition: React.FC<TransitionProps> = ({
  visible,
  preset = "fade",
  styles,
  duration = 200,
  delay = 0,
  className = "",
  style = {},
  children,
  as: Tag = "div",
  onEntered,
  onExited,
  keepMounted = false,
}) => {
  const { state, mounted } = useTransition(visible, { duration, delay, onEntered, onExited });
  const transStyles = styles ?? transitionPresets[preset];

  if (!mounted && !keepMounted) return null;

  const computedStyle: CSSProperties = {
    ...transStyles.base,
    ...transStyles[state],
    ...style,
  };

  return React.createElement(Tag, { className, style: computedStyle }, children);
};

// ─── AnimatePresence — List of items with enter/exit animations ───────────────

interface AnimatePresenceProps<T> {
  items:      T[];
  getKey:     (item: T) => string;
  children:   (item: T, state: TransitionState) => ReactNode;
  preset?:    TransitionPreset;
  duration?:  number;
  stagger?:   number;   // delay between each item's animation (ms)
  className?: string;
}

export function AnimatePresence<T>({
  items,
  getKey,
  children,
  preset = "slide-up",
  duration = 200,
  stagger = 30,
  className = "",
}: AnimatePresenceProps<T>) {
  const [rendered, setRendered] = useState<Array<T & { _key: string; _removing: boolean }>>([]);

  useEffect(() => {
    const newKeys  = new Set(items.map((i) => getKey(i)));
    const prevKeys = new Set(rendered.map((r) => r._key));

    // Mark removed items
    const updated = rendered.map((r) => ({
      ...r,
      _removing: !newKeys.has(r._key),
    }));

    // Add new items
    items.forEach((item) => {
      if (!prevKeys.has(getKey(item))) {
        updated.push({ ...item, _key: getKey(item), _removing: false });
      }
    });

    setRendered(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  return (
    <div className={className}>
      {rendered.map((item, i) => (
        <Transition
          key={item._key}
          visible={!item._removing}
          preset={preset}
          duration={duration}
          delay={i * stagger}
          onExited={() => setRendered((prev) => prev.filter((r) => r._key !== item._key))}
        >
          {children(item, !item._removing ? "entered" : "exiting")}
        </Transition>
      ))}
    </div>
  );
}

// ─── Page transition wrapper ──────────────────────────────────────────────────
// Wraps route content for router-level page transitions

interface PageTransitionProps {
  routeKey: string;   // Usually the current URL path
  preset?:  TransitionPreset;
  duration?: number;
  children: ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  routeKey, preset = "fade", duration = 200, children,
}) => {
  const [key, setKey] = useState(routeKey);
  const [visible, setVisible] = useState(true);
  const pendingKeyRef = useRef<string | null>(null);
  const [displayChildren, setDisplayChildren] = useState(children); // FIX: Retain old children during exit animation

  useEffect(() => {
    if (routeKey === key) {
      setDisplayChildren(children);
      return;
    }
    pendingKeyRef.current = routeKey;
    setVisible(false);
  }, [routeKey, key, children]);

  const handleExited = useCallback(() => {
    if (pendingKeyRef.current) {
      setKey(pendingKeyRef.current);
      pendingKeyRef.current = null;
      setVisible(true);
    }
  }, []);

  return (
    <Transition visible={visible} preset={preset} duration={duration} onExited={handleExited} keepMounted>
      {displayChildren}
    </Transition>
  );
};

/*
 * Usage Examples:
 *
 * // Simple fade in/out
 * <Transition visible={isOpen} preset="slide-up" duration={250}>
 *   <Dropdown />
 * </Transition>
 *
 * // Animated list
 * <AnimatePresence
 *   items={notifications}
 *   getKey={(n) => n.id}
 *   preset="slide-right"
 *   stagger={50}
 * >
 *   {(item) => <NotificationCard notification={item} />}
 * </AnimatePresence>
 *
 * // Page transition on route change
 * <PageTransition routeKey={router.pathname} preset="fade">
 *   <Component {...pageProps} />
 * </PageTransition>
 */
