<!-- @keywords: framer motion, page transition, scroll animation, drag, layout animation, shared layout, gesture, orchestration -->
<!-- @domain: Framer Motion — Advanced Workflows & Patterns -->

# Framer Motion — Advanced Workflows & Patterns

## Page Transitions (Next.js App Router)

```tsx
// components/page-transition.tsx
'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

const variants = {
  initial: { opacity: 0, y: 8 },
  enter:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="enter"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

`mode="wait"` — exit animation completes before new page enters (prevents overlap).

---

## Scroll-Triggered Animations

### useInView — animate when element enters viewport

```tsx
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

function FadeInSection({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { 
    once: true,        // animate once, don't re-trigger on scroll back
    margin: '-100px',  // trigger 100px before element enters view
  });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
```

### useScroll — parallax and scroll progress

```tsx
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

function ParallaxSection() {
  const ref = useRef<HTMLDivElement>(null);
  
  // Track scroll progress relative to this element
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'], // [when target enters viewport, when it leaves]
  });
  
  // Map scroll progress (0→1) to Y offset (100→-100)
  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  
  return (
    <div ref={ref} style={{ position: 'relative', height: '100vh' }}>
      <motion.div style={{ y, opacity }}>
        <img src="/hero.jpg" alt="parallax image" />
      </motion.div>
    </div>
  );
}
```

### Reading scroll progress for progress bar

```tsx
function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  
  return (
    <motion.div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: 3,
        background: '#6366f1',
        scaleX: scrollYProgress,
        transformOrigin: '0%',
      }}
    />
  );
}
```

---

## Layout Animations

Layout animations detect position/size changes and smoothly interpolate:

```tsx
<motion.div layout>
  {/* When items are added/removed, siblings slide to new positions */}
  {items.map(item => (
    <motion.div key={item.id} layout exit={{ opacity: 0 }}>
      {item.name}
    </motion.div>
  ))}
</motion.div>
```

### Shared Layout Animations (layoutId)

Objects with the same `layoutId` morph between positions across the DOM:

```tsx
// Selected tab indicator that slides under the active tab
function Tabs() {
  const [active, setActive] = useState('home');
  const tabs = ['home', 'about', 'work'];
  
  return (
    <nav style={{ display: 'flex', gap: 8 }}>
      {tabs.map(tab => (
        <button key={tab} onClick={() => setActive(tab)} style={{ position: 'relative' }}>
          {tab}
          {active === tab && (
            <motion.div
              layoutId="active-tab-indicator"  // ← magic: same ID = shared animation
              style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: 2, background: '#6366f1',
              }}
            />
          )}
        </button>
      ))}
    </nav>
  );
}
```

---

## Drag Interactions

```tsx
function DraggableCard() {
  const constraintsRef = useRef<HTMLDivElement>(null);
  
  return (
    <div ref={constraintsRef} style={{ position: 'relative', width: 400, height: 400 }}>
      <motion.div
        drag                                    // enable drag on both axes
        dragConstraints={constraintsRef}         // limit to parent bounds
        dragElastic={0.1}                        // slight bounce at boundaries
        dragMomentum={true}                      // continue after release
        whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
      >
        Drag me
      </motion.div>
    </div>
  );
}
```

### Swipe to dismiss (card swipe)

```tsx
function SwipeCard({ onDismiss }: { onDismiss: () => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-20, 20]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  
  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (Math.abs(info.offset.x) > 100) {
      onDismiss();
    }
  }
  
  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}  // snap back to center
      onDragEnd={handleDragEnd}
    >
      Card content
    </motion.div>
  );
}
```

---

## Animation Orchestration

### Controlling child animations from parent

```tsx
const listVariants = {
  visible: {
    transition: {
      staggerChildren: 0.05,   // 50ms between children
      delayChildren: 0.1,
      staggerDirection: 1,     // 1 = forward, -1 = reverse
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring' } },
};
```

### useAnimation — programmatic control

```tsx
import { useAnimation } from 'framer-motion';

function NotificationBadge() {
  const controls = useAnimation();
  
  async function shake() {
    await controls.start({ x: 10, transition: { duration: 0.05 } });
    await controls.start({ x: -10, transition: { duration: 0.05 } });
    await controls.start({ x: 5, transition: { duration: 0.05 } });
    await controls.start({ x: 0, transition: { duration: 0.05 } });
  }
  
  return (
    <motion.div animate={controls} onClick={shake}>
      🔔
    </motion.div>
  );
}
```

---

## Counter Animation

```tsx
import { useSpring, useTransform, motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

function AnimatedCounter({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString());
  
  useEffect(() => {
    spring.set(value);
  }, [spring, value]);
  
  return <motion.span>{display}</motion.span>;
}

// Usage
<AnimatedCounter value={1234567} />
```
