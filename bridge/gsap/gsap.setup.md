<!-- @keywords: gsap, greensock, timeline, tween, animation, scroll, ScrollTrigger, GSAP setup, gsap.to, gsap.from -->
<!-- @domain: GSAP — Setup & Core API -->

# GSAP — Setup & Core API

## What This Is

GSAP (GreenSock Animation Platform) is the professional-grade JavaScript animation library. Where Framer Motion is React-native and physics-first, GSAP is DOM-native and timeline-first — it's the tool for complex, precisely choreographed sequences that need to work on any framework.

Use GSAP when:
- You need multi-step sequences with precise timing (timelines)
- Scroll-driven animations (ScrollTrigger)
- Animating SVG paths, morphing shapes
- Non-React environments
- Performance-critical animations on many elements simultaneously

**No MCP server** — runs in your project.

---

## Installation

### Standard

```bash
npm install gsap
```

### With React (Next.js)

```bash
npm install gsap
```

For Next.js App Router, always use GSAP in `'use client'` components or with `useEffect`.

### GSAP Club Plugins (paid — ScrollSmoother, SplitText, etc.)

Place downloaded plugin files in `src/utils/gsap/` and register them:
```typescript
import { gsap } from "gsap";
import { ScrollSmoother } from "@/utils/gsap/ScrollSmoother";
gsap.registerPlugin(ScrollSmoother);
```

---

## Core Concepts

### Tweens — the atomic unit

```typescript
import { gsap } from "gsap";

// gsap.to — animate FROM current state TO target
gsap.to(".box", {
  x: 200,          // transform: translateX(200px)
  y: 50,
  rotation: 45,    // transform: rotate(45deg)
  opacity: 0.5,
  duration: 1,     // seconds
  ease: "power2.out",
});

// gsap.from — animate FROM target TO current state
gsap.from(".hero-title", {
  y: -50,
  opacity: 0,
  duration: 0.8,
  ease: "back.out(1.7)",
});

// gsap.fromTo — explicit start and end
gsap.fromTo(".card",
  { opacity: 0, scale: 0.8 },        // from
  { opacity: 1, scale: 1, duration: 0.5 } // to
);
```

### gsap.set — instant state (no animation)

```typescript
gsap.set(".modal", { display: "none", opacity: 0 });
// or reset
gsap.set(".element", { clearProps: "all" });
```

---

## Property Reference

### Transform Properties

| GSAP | CSS Equivalent |
|------|---------------|
| `x: 100` | `translateX(100px)` |
| `y: 50` | `translateY(50px)` |
| `rotation: 45` | `rotate(45deg)` |
| `rotationX: 180` | `rotateX(180deg)` |
| `rotationY: 180` | `rotateY(180deg)` |
| `scale: 1.5` | `scale(1.5)` |
| `scaleX: 2` | `scaleX(2)` |
| `scaleY: 0.5` | `scaleY(0.5)` |
| `skewX: 10` | `skewX(10deg)` |
| `xPercent: -50` | `translateX(-50%)` |

**Use `x/y` not `left/top`** — transforms are GPU-composited, positional properties trigger layout.

### Special Properties

```typescript
{
  duration: 1,
  delay: 0.5,
  ease: "power2.out",
  stagger: 0.1,              // delay between elements when target is multiple
  repeat: -1,                // -1 = infinite, 2 = repeat 2 more times
  yoyo: true,                // reverse on repeat
  onComplete: () => {},      // callback
  onUpdate: () => {},        // called every frame
  onStart: () => {},
  paused: true,              // create paused, control manually
}
```

---

## Easing Reference

```typescript
// Power eases (most common)
"power1.in"  "power1.out"  "power1.inOut"
"power2.in"  "power2.out"  "power2.inOut"   // like CSS ease
"power3.in"  "power3.out"  "power3.inOut"
"power4.in"  "power4.out"  "power4.inOut"   // very strong

// Bounce and elastic
"bounce.out"                       // bounces at the end
"elastic.out(1, 0.3)"             // elastic overshoot (amplitude, period)
"back.out(1.7)"                   // overshoots then settles (great for UI)
"back.in(2)"                      // anticipation effect

// Other
"none" or "linear"                 // constant speed
"circ.out"                         // circular — fast deceleration
"expo.out"                         // exponential — very fast start
"sine.inOut"                       // gentle, sinusoidal
```

---

## React / Next.js Integration

```tsx
"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react"; // npm install @gsap/react

gsap.registerPlugin(useGSAP);

function AnimatedCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // useGSAP handles cleanup automatically (replaces manual useEffect + cleanup)
  useGSAP(() => {
    gsap.from(cardRef.current, {
      y: 40,
      opacity: 0,
      duration: 0.6,
      ease: "power2.out",
    });
  }, { scope: containerRef }); // scope limits selector queries to this container
  
  return (
    <div ref={containerRef}>
      <div ref={cardRef} className="card">
        Content
      </div>
    </div>
  );
}
```

---

## Targeting Elements

```typescript
// CSS selector (all matching elements)
gsap.to(".card", { opacity: 0 });

// DOM reference (single element)
gsap.to(cardRef.current, { x: 100 });

// NodeList / array
gsap.to(document.querySelectorAll(".item"), { y: 20 });

// Multiple targets as array
gsap.to([element1, element2, ".class"], { opacity: 0 });
```

---

## Installing ScrollTrigger

```typescript
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register once — do this at module level or in your root component
gsap.registerPlugin(ScrollTrigger);
```

Next.js App Router:
```tsx
// In a 'use client' component with useGSAP
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(useGSAP, ScrollTrigger);
```
