<!-- @keywords: gsap, performance, cleanup, React, memory leak, will-change, GPU, refresh, ScrollTrigger kill, optimization -->
<!-- @domain: GSAP — Performance & Best Practices -->

# GSAP — Performance & Best Practices

## React Integration: The Right Way

The most common GSAP + React mistake is forgetting cleanup. GSAP creates objects that must be killed when the component unmounts, or they accumulate and cause memory leaks and animation conflicts.

### Use useGSAP (recommended)

```tsx
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP);

function Component() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // useGSAP automatically kills all animations/ScrollTriggers created inside
  // when the component unmounts — no manual cleanup needed
  useGSAP(() => {
    gsap.from(".animated", { y: 40, opacity: 0 });
    
    ScrollTrigger.create({
      trigger: ".section",
      start: "top center",
      onEnter: () => console.log("entered"),
    });
    
    // Returned cleanup is optional — useGSAP handles it
    return () => {
      // custom cleanup if needed
    };
  }, { scope: containerRef, dependencies: [someState] });
  
  return <div ref={containerRef}>...</div>;
}
```

### Manual cleanup (if not using useGSAP)

```tsx
useEffect(() => {
  const ctx = gsap.context(() => {
    gsap.from(".item", { y: 30, opacity: 0 });
    ScrollTrigger.create({ ... });
  }, containerRef); // scope
  
  return () => ctx.revert(); // kills everything created inside ctx
}, []);
```

---

## ScrollTrigger Refresh Issues

ScrollTrigger calculates positions on creation. If content loads later (images, async data), positions become stale.

```typescript
// Refresh after content loads
Promise.all([...]).then(() => {
  ScrollTrigger.refresh();
});

// For images — use imagesLoaded (npm install imagesloaded)
import imagesLoaded from "imagesloaded";
imagesLoaded(document.body, () => ScrollTrigger.refresh());

// Next.js — refresh on route change
useEffect(() => {
  return () => {
    ScrollTrigger.killAll(); // kill on route change
  };
}, [pathname]);
```

---

## GPU Performance

### Promote animated elements to their own layer

```css
/* Force GPU compositing for elements that will animate */
.will-animate {
  will-change: transform, opacity;
}
```

Only use `will-change` on elements actively animating — too many creates memory pressure. Remove it after animation:

```typescript
gsap.to(".card", {
  x: 200,
  onComplete() {
    gsap.set(".card", { clearProps: "will-change" });
  },
});
```

### Animate GPU-friendly properties only

```typescript
// ✅ GPU-composited — doesn't trigger layout or paint
gsap.to(el, { x, y, rotation, scale, opacity });

// ❌ Triggers layout — CPU-bound, causes frame drops
gsap.to(el, { left, top, width, height, margin, padding });
```

**Exception: ScrollTrigger `scrub`** — GSAP's internal handling makes even some layout properties viable with scrub, but still prefer transforms.

---

## Avoiding Common Mistakes

### Don't target elements that don't exist yet

```typescript
// ❌ Elements may not be in DOM yet
useEffect(() => {
  gsap.from(".card", { opacity: 0 }); // might fail if React hasn't rendered
}, []);

// ✅ Use refs or scope
useGSAP(() => {
  gsap.from(".card", { opacity: 0 }); // scope to containerRef ensures DOM exists
}, { scope: containerRef });
```

### Don't create tweens in loops without refs

```typescript
// ❌ Memory leak — tween reference is lost, can't be cleaned up
for (let i = 0; i < 100; i++) {
  gsap.to(elements[i], { x: i * 10 }); 
}

// ✅ Single tween with stagger (also faster)
gsap.to(elements, { x: (i) => i * 10, stagger: 0.05 });

// Or if you need individual control, keep refs
const tweens = elements.map(el => gsap.to(el, { x: 100, paused: true }));
```

### The id-naming trap in React

```typescript
// ❌ IDs can conflict in React when components render multiple times
gsap.to("#my-element", { opacity: 0 });

// ✅ Always use refs in React components
gsap.to(myRef.current, { opacity: 0 });

// ✅ Or class selectors scoped to a container
gsap.context(() => {
  gsap.to(".card", { opacity: 0 }); // only .cards inside containerRef
}, containerRef);
```

---

## ScrollTrigger Debugging

```typescript
// Show markers to see trigger start/end positions
ScrollTrigger.create({
  trigger: ".section",
  start: "top center",
  end: "bottom center",
  markers: true,  // ← add this temporarily to debug
  onEnter: () => console.log("enter"),
  onLeave: () => console.log("leave"),
  onEnterBack: () => console.log("enter back"),
  onLeaveBack: () => console.log("leave back"),
});

// Log all ScrollTrigger instances
ScrollTrigger.getAll().forEach(trigger => console.log(trigger));

// Kill a specific ScrollTrigger
const st = ScrollTrigger.create({ ... });
st.kill();

// Kill ALL ScrollTriggers (use on route change)
ScrollTrigger.killAll();
```

---

## Timeline vs Separate Tweens

```typescript
// ❌ Multiple separate tweens — hard to control, sequence, or reverse
gsap.to(".title", { y: 0, opacity: 1 });
gsap.to(".subtitle", { y: 0, opacity: 1, delay: 0.3 });
gsap.to(".cta", { scale: 1, opacity: 1, delay: 0.5 });

// ✅ Timeline — controllable as a unit, reversible, seekable
const intro = gsap.timeline();
intro
  .to(".title", { y: 0, opacity: 1 })
  .to(".subtitle", { y: 0, opacity: 1 }, "-=0.1")
  .to(".cta", { scale: 1, opacity: 1 }, "-=0.1");

// Now you can: intro.reverse(), intro.pause(), intro.seek(0.5)
```

---

## Performance Checklist

- [ ] Using `x/y` instead of `left/top`
- [ ] `useGSAP` or `gsap.context` for automatic cleanup
- [ ] `ScrollTrigger.refresh()` called after async content loads
- [ ] `markers: true` removed before production
- [ ] `will-change` cleared after animation completes
- [ ] No animations created inside `requestAnimationFrame` or `useFrame` without refs
- [ ] `ScrollTrigger.killAll()` called on route change in SPAs
