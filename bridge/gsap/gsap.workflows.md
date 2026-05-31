<!-- @keywords: gsap, timeline, ScrollTrigger, scroll animation, pinning, parallax, stagger, SVG, morphing, text animation -->
<!-- @domain: GSAP — Timelines & ScrollTrigger Workflows -->

# GSAP — Timelines & ScrollTrigger Workflows

## Timelines — Orchestrated Sequences

A Timeline is a container for multiple tweens with precise timing control:

```typescript
import { gsap } from "gsap";

const tl = gsap.timeline({
  defaults: { duration: 0.6, ease: "power2.out" },  // shared defaults for all tweens
  delay: 0.3,  // wait before starting
  onComplete: () => console.log("sequence done"),
});

// Add tweens — each starts AFTER the previous ends by default
tl
  .from(".hero-background", { opacity: 0 })
  .from(".hero-title", { y: 40, opacity: 0 }, "-=0.3")    // start 0.3s before previous ends
  .from(".hero-subtitle", { y: 20, opacity: 0 }, "-=0.2") // overlap again
  .from(".hero-cta", { scale: 0.9, opacity: 0 }, "+=0.1") // start 0.1s AFTER previous ends
  .from(".hero-image", { x: 50, opacity: 0 }, "<0.2");    // start 0.2s after same start as previous
```

### Position Parameter Cheat Sheet

```typescript
tl.to(el, props);           // after previous ends (default)
tl.to(el, props, "+=0.5");  // 0.5s AFTER previous ends
tl.to(el, props, "-=0.3");  // 0.3s BEFORE previous ends (overlap)
tl.to(el, props, "<");      // same START as previous
tl.to(el, props, "<0.2");   // 0.2s after previous START
tl.to(el, props, "myLabel"); // at a named label
tl.to(el, props, 2);        // at 2 seconds absolute
```

### Named Labels

```typescript
tl
  .addLabel("intro")
  .from(".title", { y: 40, opacity: 0 })
  .addLabel("features")
  .from(".feature-1", { x: -50, opacity: 0 }, "features")
  .from(".feature-2", { x: 50, opacity: 0 }, "features+=0.2");

// Seek to a label
tl.seek("features");

// Play from a label
tl.play("features");
```

---

## Stagger — Animating Multiple Elements

```typescript
// Uniform stagger
gsap.from(".card", {
  y: 30,
  opacity: 0,
  duration: 0.5,
  stagger: 0.1,  // 0.1s between each element
});

// Advanced stagger with options
gsap.from(".grid-item", {
  scale: 0,
  opacity: 0,
  stagger: {
    amount: 1.2,         // total time distributed across all items (not per-item)
    from: "center",      // start from center, ripple outward (or "start", "end", "edges")
    grid: "auto",        // detect grid layout automatically
    ease: "power2.inOut",
  },
});

// Random order stagger
gsap.from(".particle", {
  opacity: 0,
  scale: 0,
  stagger: {
    each: 0.05,
    from: "random",      // random order
  },
});
```

---

## ScrollTrigger — Scroll-Driven Animations

### Basic Scroll Animation

```typescript
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

gsap.from(".section-title", {
  y: 50,
  opacity: 0,
  duration: 0.8,
  scrollTrigger: {
    trigger: ".section-title",    // element that triggers the animation
    start: "top 80%",             // when top of trigger hits 80% down viewport
    end: "bottom 20%",            // when bottom of trigger hits 20% down viewport
    toggleActions: "play none none reverse",
    // toggleActions: "onEnter onLeave onEnterBack onLeaveBack"
    // values: "play", "pause", "resume", "reset", "restart", "complete", "reverse", "none"
  },
});
```

### start / end Syntax

```typescript
// Format: "triggerEdge viewportEdge"
start: "top center"      // trigger's top hits viewport center
start: "top 80%"         // trigger's top hits 80% from viewport top
start: "center center"   // trigger's center hits viewport center
start: "bottom top"      // trigger's bottom hits viewport top (leaving)
start: "top+=100 center" // 100px below trigger's top
start: "top top-=50"     // 50px above viewport top
```

### Pin an Element During Scroll

```typescript
// Element stays fixed while user scrolls through a section
gsap.to(".sticky-element", {
  scrollTrigger: {
    trigger: ".pin-section",
    start: "top top",
    end: "+=500",          // pin for 500px of scroll
    pin: true,             // pin the trigger element itself
    pinSpacing: true,      // add space to compensate for pinned element
    scrub: 1,              // smooth scrubbing (1 = 1 second lag)
  },
  x: 300,                  // animate during the pin period
});
```

### Scrub — Animation Tied to Scroll Position

```typescript
// scrub: true = instantly matches scroll position
// scrub: 1 = 1 second lag (smoother)
// scrub: 0.5 = 0.5 second lag

gsap.to(".parallax-image", {
  y: -200,
  scrollTrigger: {
    trigger: ".parallax-section",
    start: "top bottom",
    end: "bottom top",
    scrub: 1,
  },
});
```

### Horizontal Scroll Section

```typescript
const sections = gsap.utils.toArray(".horizontal-section") as HTMLElement[];

gsap.to(sections, {
  xPercent: -100 * (sections.length - 1),  // move left through all sections
  ease: "none",
  scrollTrigger: {
    trigger: ".horizontal-container",
    pin: true,
    scrub: 1,
    snap: 1 / (sections.length - 1),       // snap to each section
    end: () => "+=" + document.querySelector(".horizontal-container")!.scrollWidth,
  },
});
```

---

## SVG Path Animation

### Drawing SVG Lines on Scroll

```typescript
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin"; // Club plugin
gsap.registerPlugin(DrawSVGPlugin);

gsap.from(".svg-path", {
  drawSVG: "0%",    // start with path invisible (0% drawn)
  duration: 2,
  ease: "power1.inOut",
  scrollTrigger: {
    trigger: ".svg-section",
    start: "top 60%",
    scrub: 1,
  },
});
```

### Manual SVG path animation (no plugin)

```typescript
const path = document.querySelector(".stroke-path") as SVGPathElement;
const length = path.getTotalLength();

gsap.set(path, {
  strokeDasharray: length,
  strokeDashoffset: length,  // fully hidden
});

gsap.to(path, {
  strokeDashoffset: 0,       // fully drawn
  duration: 2,
  ease: "power2.inOut",
  scrollTrigger: { trigger: path, start: "top 70%", scrub: true },
});
```

---

## Text Animation

```tsx
// Character-by-character reveal (without SplitText plugin)
function SplitReveal({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  
  useGSAP(() => {
    const chars = ref.current!.querySelectorAll(".char");
    gsap.from(chars, {
      y: "100%",           // start below overflow:hidden clip
      opacity: 0,
      duration: 0.5,
      ease: "back.out(1.7)",
      stagger: 0.03,
      scrollTrigger: { trigger: ref.current, start: "top 80%" },
    });
  }, { scope: ref });
  
  return (
    <div ref={ref} style={{ overflow: "hidden" }}>
      {text.split("").map((char, i) => (
        <span key={i} className="char" style={{ display: "inline-block" }}>
          {char === " " ? " " : char}
        </span>
      ))}
    </div>
  );
}
```

---

## Controlling Timelines

```typescript
const tl = gsap.timeline({ paused: true });
tl.from(".el", { opacity: 0 });

// Playback controls
tl.play();
tl.pause();
tl.reverse();
tl.restart();
tl.seek(0.5);       // jump to 0.5 seconds
tl.progress(0.5);   // jump to 50% through timeline

// Callbacks
tl.eventCallback("onComplete", myFunction);
tl.eventCallback("onUpdate", updateProgress);
```
