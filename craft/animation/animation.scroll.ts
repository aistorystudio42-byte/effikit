/**
 * @keywords    scroll animation, parallax, reveal on scroll, sticky, progress, intersection, scroll-driven
 * @domain      Scroll Animations
 * @use-when    Animating elements based on scroll position: reveals, parallax, progress indicators, sticky headers
 * @not-when    Simple page transitions — use animation.transition.ts; hover effects — use animation.micro.ts
 */

import {
  useState, useEffect, useRef, useCallback, RefObject, CSSProperties,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScrollProgress {
  progress: number;    // 0–1, how far the element has scrolled through the viewport
  entering: boolean;   // element is entering the viewport from below
  leaving:  boolean;   // element is leaving the viewport from above
  visible:  boolean;   // element is currently in the viewport
  direction: "up" | "down" | "none";
}

export type RevealPreset = "fade-up" | "fade-down" | "fade-left" | "fade-right" | "zoom" | "flip";

// ─── useScrollProgress — Track global page scroll ────────────────────────────

export function useScrollProgress(elementRef?: RefObject<HTMLElement>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      if (elementRef?.current) {
        const el      = elementRef.current;
        const scrolled = el.scrollTop;
        const total   = el.scrollHeight - el.clientHeight;
        setProgress(total > 0 ? Math.min(scrolled / total, 1) : 0);
      } else {
        const scrolled = window.scrollY;
        const total   = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(total > 0 ? Math.min(scrolled / total, 1) : 0);
      }
    };

    const el = elementRef?.current ?? window;
    el.addEventListener("scroll", update, { passive: true });
    update();
    return () => el.removeEventListener("scroll", update);
  }, [elementRef]);

  return progress;
}

// ─── useElementScrollProgress — Track scroll through a specific element ───────

export function useElementScrollProgress<T extends HTMLElement>(): [
  RefObject<T>,
  ScrollProgress
] {
  const ref = useRef<T>(null);
  const [state, setState] = useState<ScrollProgress>({
    progress: 0, entering: false, leaving: false, visible: false, direction: "none",
  });
  const lastY = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const rect    = el.getBoundingClientRect();
      const vh      = window.innerHeight;
      const currentY = window.scrollY;
      const dir: "up" | "down" | "none" = currentY > lastY.current ? "down" : currentY < lastY.current ? "up" : "none";
      lastY.current = currentY;

      // progress: 0 when bottom of element hits viewport bottom, 1 when top hits viewport top
      const elementHeight = rect.height;
      const scrolled = vh - rect.top;
      const total    = vh + elementHeight;
      const progress = Math.min(Math.max(scrolled / total, 0), 1);

      setState({
        progress,
        entering: rect.bottom > 0 && rect.top > 0 && rect.top < vh,
        leaving:  rect.bottom > 0 && rect.bottom < vh,
        visible:  rect.top < vh && rect.bottom > 0,
        direction: dir,
      });
    };

    const observer = new IntersectionObserver(() => update(), { threshold: 0 });
    observer.observe(el);
    window.addEventListener("scroll", update, { passive: true });
    update();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
    };
  }, []);

  return [ref, state];
}

// ─── useParallax — Element moves at a different rate than scroll ──────────────

export function useParallax<T extends HTMLElement>(
  speed: number = 0.5,  // 0 = locked, 1 = normal scroll, >1 = faster
  axis: "y" | "x" = "y"
): { ref: RefObject<T>; style: CSSProperties } {
  const ref    = useRef<T>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const update = () => {
      const el = ref.current;
      if (!el) return;
      const rect        = el.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2 - window.innerHeight / 2;
      setOffset(elementCenter * (speed - 1));
    };

    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, [speed]);

  return {
    ref,
    style: {
      transform:  axis === "y" ? `translateY(${offset}px)` : `translateX(${offset}px)`,
      willChange: "transform",
    },
  };
}

// ─── useScrollReveal — Animate element into view on scroll ───────────────────

const revealPresetStyles: Record<RevealPreset, { from: CSSProperties; to: CSSProperties }> = {
  "fade-up":    { from: { opacity: 0, transform: "translateY(40px)" }, to: { opacity: 1, transform: "translateY(0)" } },
  "fade-down":  { from: { opacity: 0, transform: "translateY(-40px)" }, to: { opacity: 1, transform: "translateY(0)" } },
  "fade-left":  { from: { opacity: 0, transform: "translateX(40px)" }, to: { opacity: 1, transform: "translateX(0)" } },
  "fade-right": { from: { opacity: 0, transform: "translateX(-40px)" }, to: { opacity: 1, transform: "translateX(0)" } },
  "zoom":       { from: { opacity: 0, transform: "scale(0.85)" }, to: { opacity: 1, transform: "scale(1)" } },
  "flip":       { from: { opacity: 0, transform: "rotateY(-30deg)" }, to: { opacity: 1, transform: "rotateY(0deg)" } },
};

export function useScrollReveal<T extends HTMLElement>(
  options: {
    preset?:    RevealPreset;
    threshold?: number;   // 0–1, how much of element must be visible (default: 0.15)
    duration?:  number;   // ms
    delay?:     number;   // ms
    once?:      boolean;  // stop observing after first reveal
  } = {}
): { ref: RefObject<T>; style: CSSProperties; isVisible: boolean } {
  const { preset = "fade-up", threshold = 0.15, duration = 600, delay = 0, once = true } = options;
  const ref       = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  const presetSt  = revealPresetStyles[preset];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  const style: CSSProperties = {
    ...(visible ? presetSt.to : presetSt.from),
    transition: visible
      ? `opacity ${duration}ms ease ${delay}ms, transform ${duration}ms cubic-bezier(0.2,0,0,1) ${delay}ms`
      : "none",
    willChange: "opacity, transform",
  };

  return { ref, style, isVisible: visible };
}

// ─── useScrollSpy — Highlight active section in nav ──────────────────────────

export function useScrollSpy(
  sectionIds: string[],
  options: { offset?: number; threshold?: number } = {}
): string | null {
  const { offset = 80, threshold = 0.5 } = options;
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const observers = sectionIds.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;

      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(id); },
        { rootMargin: `-${offset}px 0px -${Math.floor((1 - threshold) * 100)}% 0px`, threshold }
      );
      observer.observe(el);
      return observer;
    });

    return () => observers.forEach((o) => o?.disconnect());
  }, [sectionIds, offset, threshold]);

  return active;
}

// ─── useStickyHeader — Header hides on scroll down, shows on scroll up ────────

export function useStickyHeader(threshold: number = 80): {
  ref:     RefObject<HTMLElement>;
  visible: boolean;
  atTop:   boolean;
  style:   CSSProperties;
} {
  const ref          = useRef<HTMLElement>(null);
  const [visible,  setVisible]  = useState(true);
  const [atTop,    setAtTop]    = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handler = () => {
      const y    = window.scrollY;
      const diff = y - lastScrollY.current;

      setAtTop(y <= threshold);
      if (y <= threshold)         { setVisible(true); }
      else if (diff > 0 && diff > 5)  { setVisible(false); }  // scrolling down
      else if (diff < 0 && diff < -5) { setVisible(true); }   // scrolling up

      lastScrollY.current = y;
    };

    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [threshold]);

  const style: CSSProperties = {
    position:   "sticky",
    top:        0,
    transform:  visible ? "translateY(0)" : `translateY(-110%)`,
    transition: "transform 300ms cubic-bezier(0.2,0,0,1)",
    zIndex:     30,
  };

  return { ref: ref as RefObject<HTMLElement>, visible, atTop, style };
}

/*
 * Usage Examples:
 *
 * // Global scroll progress bar
 * const progress = useScrollProgress();
 * <div style={{ width: `${progress * 100}%`, height: 3, background: "blue", position: "fixed", top: 0 }} />
 *
 * // Reveal cards as user scrolls down
 * const { ref, style } = useScrollReveal<HTMLDivElement>({ preset: "fade-up", delay: 100 });
 * <div ref={ref} style={style}><FeatureCard /></div>
 *
 * // Parallax hero image
 * const { ref, style } = useParallax<HTMLDivElement>(0.4);
 * <div ref={ref} style={{ ...style, position: "absolute", inset: 0 }}><HeroImage /></div>
 *
 * // Sticky header that hides on scroll down
 * const { style } = useStickyHeader();
 * <header style={style}><Nav /></header>
 */
