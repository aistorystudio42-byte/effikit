/**
 * @keywords    hover, micro interaction, button animation, focus animation, ripple, spring, bounce, magnetic
 * @domain      Micro Interactions
 * @use-when    Adding tactile feel to buttons, inputs, cards — hover lifts, click feedback, focus rings, ripples
 * @not-when    Page-level or route transitions — use animation.transition.ts for those
 */

import React, {
  useState, useRef, useCallback, useEffect,
  CSSProperties, MouseEvent, ReactNode, RefObject,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpringConfig {
  stiffness: number;
  damping:   number;
  mass?:     number;
}

export interface RippleItem {
  id:    number;
  x:    number;
  y:    number;
  size: number;
}

// ─── Spring Physics ───────────────────────────────────────────────────────────
// Simple spring simulation for natural-feeling animations

export function springValue(
  from: number, to: number, config: SpringConfig, t: number
): number {
  const { stiffness, damping, mass = 1 } = config;
  const omega = Math.sqrt(stiffness / mass);
  const zeta  = damping / (2 * Math.sqrt(stiffness * mass));

  if (zeta < 1) {
    // Underdamped — has oscillation (bouncy)
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);
    const decay  = Math.exp(-zeta * omega * t);
    return to + decay * ((from - to) * Math.cos(omegaD * t) + ((zeta * omega * (from - to)) / omegaD) * Math.sin(omegaD * t));
  } else {
    // Critically / over-damped — no oscillation (smooth)
    const r = -omega;
    const A = from - to;
    const B = A * r;
    return to + (A + B * t) * Math.exp(r * t);
  }
}

// ─── useSpring — Animate a value with spring physics ─────────────────────────

export function useSpring(
  target: number,
  config: SpringConfig = { stiffness: 300, damping: 30 }
) {
  const [value, setValue] = useState(target);
  const fromRef   = useRef(target);
  const startRef  = useRef(0);
  const rafRef    = useRef<number | null>(null);
  const targetRef = useRef(target);
  const valueRef  = useRef(target); // FIX: Track current value to avoid stale closure

  useEffect(() => {
    // FIX: SSR guard — performance/rAF not available during SSR
    if (typeof window === "undefined") return;
    if (target === targetRef.current && Math.abs(valueRef.current - target) < 0.001) return;
    fromRef.current   = valueRef.current;
    targetRef.current = target;
    startRef.current  = performance.now();

    const animate = (now: number) => {
      const t       = (now - startRef.current) / 1000;
      const current = springValue(fromRef.current, target, config, t);

      if (Math.abs(current - target) < 0.001) {
        setValue(target);
        valueRef.current = target;
        return;
      }
      setValue(current);
      valueRef.current = current;
      rafRef.current = requestAnimationFrame(animate);
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, config.stiffness, config.damping]);

  return value;
}

// ─── useHoverLift — Elevate card/button on hover ─────────────────────────────

interface HoverLiftOptions {
  yOffset?:      number;
  shadowScale?:  number;
  duration?:     string;
}

export function useHoverLift(options: HoverLiftOptions = {}) {
  const { yOffset = -4, shadowScale = 1.5, duration = "200ms" } = options;
  const [hovered, setHovered] = useState(false);

  const style: CSSProperties = {
    transform:   hovered ? `translateY(${yOffset}px)` : "translateY(0)",
    boxShadow:   hovered
      ? `0 ${8 * shadowScale}px ${16 * shadowScale}px rgba(0,0,0,0.12)`
      : "0 2px 4px rgba(0,0,0,0.06)",
    transition:  `transform ${duration} ease, box-shadow ${duration} ease`,
    cursor:      "pointer",
  };

  return {
    style,
    props: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
    },
  };
}

// ─── useRipple — Material-style click ripple ──────────────────────────────────

export function useRipple(color: string = "rgba(255,255,255,0.35)") {
  const [ripples, setRipples] = useState<RippleItem[]>([]);
  const counterRef = useRef(0);
  const mountedRef = useRef(true); // FIX: Prevent state update on unmounted component

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const addRipple = useCallback((e: MouseEvent<HTMLElement>) => {
    const el   = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x    = e.clientX - rect.left - size / 2;
    const y    = e.clientY - rect.top  - size / 2;
    const id   = counterRef.current++;

    setRipples((r) => [...r, { id, x, y, size }]);
    setTimeout(() => {
      if (mountedRef.current) setRipples((r) => r.filter((rip) => rip.id !== id));
    }, 600);
  }, []);

  const RippleContainer = useCallback(() => (
    <>
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden
          style={{
            position:     "absolute",
            left:         r.x,
            top:          r.y,
            width:        r.size,
            height:       r.size,
            borderRadius: "50%",
            background:   color,
            animation:    "effikit-ripple 600ms ease-out forwards",
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  ), [ripples, color]);

  return { addRipple, RippleContainer };
}

// ─── useMagneticHover — Cursor-attracted magnetic pull effect ─────────────────

export function useMagneticHover<T extends HTMLElement>(
  strength: number = 0.4
): { ref: RefObject<T>; style: CSSProperties } {
  const ref     = useRef<T>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: globalThis.MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      setOffset({ x: (e.clientX - cx) * strength, y: (e.clientY - cy) * strength });
    };

    const onLeave = () => setOffset({ x: 0, y: 0 });

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [strength]);

  return {
    ref,
    style: {
      transform:  `translate(${offset.x}px, ${offset.y}px)`,
      transition: offset.x === 0 && offset.y === 0
        ? "transform 500ms cubic-bezier(0.34,1.56,0.64,1)"
        : "transform 100ms linear",
    },
  };
}

// ─── useCountUp — Animated number counter ─────────────────────────────────────

export function useCountUp(
  end: number,
  options: { duration?: number; start?: number; format?: (n: number) => string } = {}
) {
  const { duration = 1000, start = 0, format } = options;
  const [current, setCurrent] = useState(start);
  const startTimeRef = useRef<number | null>(null);
  const rafRef       = useRef<number | null>(null);

  useEffect(() => {
    setCurrent(start); // FIX: Ensure we start from the new 'start' value
    if (end === start) return;
    startTimeRef.current = null;

    const animate = (time: number) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const elapsed  = time - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(start + (end - start) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [end, start, duration]);

  return format ? format(current) : current;
}

// ─── PressableButton — Button with spring press feedback ─────────────────────

interface PressableProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children:   ReactNode;
  pressScale?: number;
  className?:  string;
}

export const PressableButton: React.FC<PressableProps> = ({
  children, pressScale = 0.96, className = "", style, ...props
}) => {
  const [pressed, setPressed] = useState(false);
  const scale = useSpring(pressed ? pressScale : 1, { stiffness: 600, damping: 25 });
  const { addRipple, RippleContainer } = useRipple();

  return (
    <button
      {...props}
      className={`relative overflow-hidden ${className}`}
      style={{ ...style, transform: `scale(${scale})`, transformOrigin: "center" }}
      onMouseDown={(e) => { setPressed(true); addRipple(e); props.onMouseDown?.(e); }}
      onMouseUp={()  => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={(e) => setPressed(true)}
      onTouchEnd={()   => setPressed(false)}
    >
      <RippleContainer />
      {children}
    </button>
  );
};

// ─── Global CSS for ripple animation ─────────────────────────────────────────
// Inject once at app root: injectRippleStyles()

export function injectRippleStyles() {
  if (typeof document === "undefined") return; // FIX: SSR guard
  if (document.getElementById("effikit-ripple-style")) return;
  const style = document.createElement("style");
  style.id = "effikit-ripple-style";
  style.textContent = `
    @keyframes effikit-ripple {
      from { opacity: 1;  transform: scale(0); }
      to   { opacity: 0;  transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

/*
 * Usage Examples:
 *
 * // Card hover lift
 * const { style, props } = useHoverLift({ yOffset: -6 });
 * <div style={style} {...props}><Card /></div>
 *
 * // Pressable button with ripple
 * <PressableButton className="px-4 py-2 bg-blue-600 text-white rounded-md" onClick={submit}>
 *   Submit
 * </PressableButton>
 *
 * // Animated stat counter
 * const count = useCountUp(1423, { duration: 1200, format: (n) => n.toLocaleString() });
 * <span>{count}</span>
 *
 * // Magnetic social icon
 * const { ref, style } = useMagneticHover<HTMLAnchorElement>(0.5);
 * <a ref={ref} style={style} href="#">Twitter</a>
 */
