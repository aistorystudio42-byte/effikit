<!-- @keywords: framer motion, animation, motion, animate, spring, transition, React, framer -->
<!-- @domain: Framer Motion — Setup & Core API -->

# Framer Motion — Setup & Core API

## What This Is

Framer Motion is the animation library for React. It replaces CSS transitions and keyframes with a declarative API that handles physics-based springs, gesture detection, layout animations, and orchestration — things CSS simply cannot do.

**No MCP server** — runs in your project. Claude reads your animation code and helps you build the right variants, transitions, and orchestrations.

---

## Installation

```bash
npm install framer-motion
```

For Next.js App Router, wrap the layout:
```tsx
// app/layout.tsx
import { MotionConfig } from 'framer-motion';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <MotionConfig reducedMotion="user">
          {children}
        </MotionConfig>
      </body>
    </html>
  );
}
```

`reducedMotion="user"` respects the user's OS preference — essential for accessibility.

---

## The motion Component

Replace any HTML element with its `motion` equivalent:

```tsx
import { motion } from 'framer-motion';

// Instead of <div>, use <motion.div>
// Instead of <button>, use <motion.button>
// Instead of <span>, use <motion.span>
// Instead of <svg>, use <motion.svg>
// etc.
```

---

## Core Props

### animate + initial

```tsx
<motion.div
  initial={{ opacity: 0, y: -20 }}  // start state
  animate={{ opacity: 1, y: 0 }}    // target state
/>
```

### transition — controlling the animation

```tsx
<motion.div
  animate={{ x: 100 }}
  transition={{
    duration: 0.5,          // seconds
    ease: 'easeInOut',      // CSS easing or custom cubic-bezier
    delay: 0.2,             // seconds before starting
    repeat: Infinity,       // repeat count or Infinity
    repeatType: 'reverse',  // 'loop' | 'mirror' | 'reverse'
  }}
/>
```

### Spring physics

```tsx
<motion.div
  animate={{ x: 100 }}
  transition={{
    type: 'spring',
    stiffness: 300,   // higher = snappier (default 100)
    damping: 20,      // higher = less bounce (default 10)
    mass: 1,          // higher = more inertia
  }}
/>
```

**Spring presets to remember:**
```tsx
// Snappy
{ type: 'spring', stiffness: 400, damping: 30 }

// Gentle
{ type: 'spring', stiffness: 120, damping: 20 }

// Bouncy
{ type: 'spring', stiffness: 300, damping: 10 }

// Critical damping (no bounce)
{ type: 'spring', stiffness: 200, damping: 25 }
```

---

## Variants — Reusable Animation States

Variants let you define named animation states and orchestrate child animations:

```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,  // each child starts 0.1s after previous
      delayChildren: 0.2,    // wait 0.2s before animating children
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function AnimatedList({ items }: { items: string[] }) {
  return (
    <motion.ul
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {items.map((item) => (
        <motion.li key={item} variants={itemVariants}>
          {item}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

---

## AnimatePresence — Animate on Mount/Unmount

The critical piece for exit animations — React normally removes elements instantly:

```tsx
import { AnimatePresence, motion } from 'framer-motion';

function Modal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}    // ← plays when removed from DOM
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <button onClick={onClose}>Close</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**AnimatePresence rules:**
- The animated children must have a unique `key` prop
- The conditional must be a direct child of AnimatePresence
- Only works if the element is actually removed from the tree (not just hidden)

---

## Gesture Animations

```tsx
<motion.button
  whileHover={{ scale: 1.05 }}               // on mouse enter
  whileTap={{ scale: 0.95 }}                 // on mouse down
  whileFocus={{ boxShadow: '0 0 0 2px #6366f1' }}  // on keyboard focus
  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
>
  Click me
</motion.button>
```

---

## useMotionValue — Imperative Control

For values driven by user input or external state:

```tsx
import { useMotionValue, useTransform } from 'framer-motion';

function Card() {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);  // map x to rotation
  const opacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5]);
  
  return (
    <motion.div
      drag="x"
      style={{ x, rotate, opacity }}
    />
  );
}
```

---

## Common Animation Prompts for Claude

```
Create a stagger animation for a list of cards — 
each card should fade in and slide up with a 0.08s delay between them.
Use Framer Motion variants.
```

```
Animate a modal: background overlay fades in, dialog scales from 
0.9 to 1 with a spring. Handle both open and close animations.
Use AnimatePresence.
```

```
Create a navigation drawer that slides in from the left.
It should have a backdrop that fades in. Closing should play 
the reverse animation. Use Framer Motion.
```
