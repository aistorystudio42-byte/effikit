<!-- @keywords: framer motion, performance, accessibility, reduced motion, will-change, layout thrashing, GPU, optimization -->
<!-- @domain: Framer Motion — Performance & Best Practices -->

# Framer Motion — Performance & Best Practices

## Performance Fundamentals

### GPU-Accelerated Properties Only

Animate only `transform` and `opacity` — they run on the GPU compositor thread without triggering layout or paint:

```tsx
// ✅ GPU-accelerated — no layout or paint triggered
animate={{ x: 100, y: 20, scale: 1.1, rotate: 45, opacity: 0.8 }}

// ❌ Triggers layout recalculation — CPU-only, causes jank
animate={{ left: 100, top: 20, width: 200, height: 100, marginTop: 10 }}
```

**Exception:** `layout` prop uses `transform` internally, so animating layout changes is actually GPU-safe despite animating position/size.

---

## Accessibility — Reduced Motion

Always respect `prefers-reduced-motion`. Users with vestibular disorders can experience nausea from parallax and motion effects.

### Option 1 — MotionConfig (global, recommended)

```tsx
// In your root layout — respects the OS setting automatically
<MotionConfig reducedMotion="user">
  {children}
</MotionConfig>
```

This disables all animations for users who have "Reduce Motion" enabled in their OS.

### Option 2 — Conditional per-component

```tsx
import { useReducedMotion } from 'framer-motion';

function AnimatedCard() {
  const prefersReducedMotion = useReducedMotion();
  
  return (
    <motion.div
      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
    >
      content
    </motion.div>
  );
}
```

### Option 3 — CSS fallback

```css
@media (prefers-reduced-motion: reduce) {
  /* disable animations for users who prefer it */
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Common Performance Mistakes

### Re-rendering in useFrame / useScroll

```tsx
// ❌ This re-renders the component on every scroll event — expensive
const [scrollY, setScrollY] = useState(0);
useEffect(() => {
  const update = () => setScrollY(window.scrollY);
  window.addEventListener('scroll', update);
  return () => window.removeEventListener('scroll', update);
}, []);

// ✅ useMotionValue + useTransform — DOM updates without React re-render
const { scrollY } = useScroll();
const y = useTransform(scrollY, [0, 500], [0, -100]);
// Apply directly to style — zero re-renders
<motion.div style={{ y }} />
```

### Avoid animating expensive CSS properties

```tsx
// ❌ Triggers layout on every frame
animate={{ height: isOpen ? 'auto' : 0 }}

// ✅ Use scaleY + overflow hidden for expand/collapse
animate={{ scaleY: isOpen ? 1 : 0, originY: 0 }}
// or use layout animation:
<motion.div layout style={{ overflow: 'hidden' }}>
  {isOpen && <Content />}
</motion.div>
```

---

## AnimatePresence Patterns

### mode="wait" vs mode="sync" vs mode="popLayout"

```tsx
// mode="wait" — exit finishes before enter begins (good for page transitions)
<AnimatePresence mode="wait">

// mode="sync" — exit and enter animate simultaneously (default)
<AnimatePresence mode="sync">

// mode="popLayout" — exiting element is removed from flow immediately,
// other elements layout-animate to fill the gap
<AnimatePresence mode="popLayout">
```

### Always provide key on animated children

```tsx
// ❌ Framer Motion can't track this element — no exit animation
<AnimatePresence>
  {isVisible && <motion.div exit={{ opacity: 0 }}>No key!</motion.div>}
</AnimatePresence>

// ✅ key tells Framer Motion when the element identity changes
<AnimatePresence>
  {isVisible && <motion.div key="my-element" exit={{ opacity: 0 }}>Has key</motion.div>}
</AnimatePresence>
```

---

## Easing Reference

```tsx
// Named easings (CSS-compatible)
ease: 'linear'       // constant speed
ease: 'easeIn'       // starts slow
ease: 'easeOut'      // ends slow (most natural for appearing elements)
ease: 'easeInOut'    // starts and ends slow

// Custom cubic-bezier (from cubic-bezier.com)
ease: [0.16, 1, 0.3, 1]   // expo ease out — very fast start, smooth stop
ease: [0.87, 0, 0.13, 1]   // heavy ease in-out
ease: [0.21, 0.47, 0.32, 0.98]  // snappy — great for UI elements

// Apple's spring-like cubic bezier
ease: [0.25, 0.46, 0.45, 0.94]
```

**Which easing for what:**
| Situation | Easing |
|-----------|--------|
| Element entering (fade in, slide in) | `easeOut` or `[0.16, 1, 0.3, 1]` |
| Element leaving (fade out, slide out) | `easeIn` |
| Interactive (hover, tap) | `spring` (no duration needed) |
| Progress bars, counters | `spring` or `easeOut` |
| Page transitions | `[0.21, 0.47, 0.32, 0.98]` |

---

## Duration Guidelines

```tsx
// Micro-interactions (hover, tap, tooltip)
duration: 0.1 to 0.15

// Small UI elements (dropdown, tooltip, badge)
duration: 0.15 to 0.2

// Component-level (modal, drawer, card expand)
duration: 0.2 to 0.35

// Page-level transitions
duration: 0.3 to 0.5

// Hero animations, scroll reveals
duration: 0.5 to 0.8

// Never exceed 1 second for UI interactions
// (feels broken or like the app is slow)
```

---

## What NOT to Do

| Mistake | Effect | Fix |
|---------|--------|-----|
| Skip `reducedMotion` | Inaccessible — can cause nausea | Always add `<MotionConfig reducedMotion="user">` |
| Animate `width`/`height` directly | Layout thrash, janky | Use `scaleX`/`scaleY` or `layout` prop |
| No `key` on `AnimatePresence` children | Exit animations don't play | Always add unique `key` |
| Setting state inside `useScroll` callback | Re-renders every scroll tick | Use `useMotionValue` + `useTransform` |
| Nesting `AnimatePresence` unnecessarily | Complex behavior, hard to debug | One `AnimatePresence` at the route level for pages |
| `whileHover` without `whileTap` | Hover state gets stuck on touch | Always pair `whileHover` with `whileTap` |
| Animating colors as hex strings | Framer can't interpolate hex | Use `rgb()` or `hsl()` format |
