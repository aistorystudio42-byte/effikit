<!-- @keywords: animation design, motion design, micro animation, transition, scroll animation, interaction animation -->
<!-- @domain: Animation & Motion Design Prompts -->

# Animation Design Prompts

## Motion Design System

```
Create a motion design system for: [product]

**Motion principles:**
[purposeful / playful / elegant / snappy — describe the vibe]

**Core animation values:**

**Duration scale:**
```
instant:   0ms     — state changes that should feel immediate
micro:     100ms   — icon transitions, hover state changes
fast:      150ms   — tooltips, small dropdowns
normal:    250ms   — modals, sidesheets, most transitions
slow:      350ms   — page transitions, large content reveals
dramatic:  500ms   — hero animations, emphasis effects
```

**Easing functions:**
```typescript
const easing = {
  // For entering elements (start slow, end fast — elements "land")
  enter:    'cubic-bezier(0.21, 0.47, 0.32, 0.98)',
  // For exiting elements (start fast — elements "leave quickly")
  exit:     'cubic-bezier(0.55, 0, 1, 0.45)',
  // For state changes within the UI
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  // Spring-like: for interactive feedback (hover, press)
  spring:   { type: 'spring', stiffness: 400, damping: 30 },
  // Gentle: for subtle background effects
  gentle:   'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
};
```

**Standard animations:**

```typescript
export const motionTokens = {
  // Fade in/out (most common)
  fade: {
    in:  { opacity: [0, 1], transition: { duration: 0.25 } },
    out: { opacity: [1, 0], transition: { duration: 0.15 } },
  },
  
  // Slide up (for modals, toasts, bottom sheets)
  slideUp: {
    in:  { y: [20, 0], opacity: [0, 1], transition: { duration: 0.25, ease: 'easeOut' } },
    out: { y: [0, 10], opacity: [1, 0], transition: { duration: 0.15, ease: 'easeIn' } },
  },
  
  // Scale (for menus, popovers, tooltips)
  scale: {
    in:  { scale: [0.95, 1], opacity: [0, 1], transition: { duration: 0.15 } },
    out: { scale: [1, 0.95], opacity: [1, 0], transition: { duration: 0.1 } },
  },
  
  // Expand (for accordions, collapsibles)
  expand: {
    in:  { height: ['0px', 'auto'], opacity: [0, 1] },
    out: { height: ['auto', '0px'], opacity: [1, 0] },
  },
};
```

Generate the complete motion system for: [your product].
```

---

## Component Animation Patterns

```
Design animations for these UI components.

**Components to animate:**

**Button press (micro-interaction):**
```typescript
// Framer Motion
<motion.button
  whileHover={{ scale: 1.02, y: -1 }}
  whileTap={{ scale: 0.97, y: 0 }}
  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
>
  Click me
</motion.button>

// Tailwind CSS only (no JS)
// class="transition-all duration-100 hover:scale-[1.02] hover:-translate-y-px 
//         active:scale-[0.97] active:translate-y-0"
```

**Modal open/close:**
```typescript
// Overlay + dialog separate animations
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};
const dialogVariants = {
  hidden:  { opacity: 0, scale: 0.95, y: 8 },
  visible: { opacity: 1, scale: 1,    y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, scale: 0.97, y: 4, transition: { duration: 0.15 } },
};
```

**Toast notification:**
```typescript
const toastVariants = {
  initial: { opacity: 0, y: 50, scale: 0.9 },
  animate: { opacity: 1, y: 0,  scale: 1,   transition: { type: 'spring', stiffness: 500, damping: 35 } },
  exit:    { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.15 } },
};
```

**Stagger list (items appear one by one):**
```typescript
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.4, ease: 'easeOut' } },
};
```

Design animations for: [your specific component].
```

---

## Scroll-Triggered Animation Design

```
Design scroll-triggered animations for: [landing page / section]

**Sections:**
1. Hero section
2. Features section
3. Social proof section
4. CTA section

**Animation strategy:**

**Hero (above fold — no scroll needed):**
- Text: stagger each word/line, fade up from y:20 to y:0, 0.5s ease-out
- Image/illustration: scale from 0.95 → 1 + fade in, 0.6s
- Delay: stagger hero content by 0.1s each element

**Features (triggered as user scrolls):**
- Trigger point: when element is 80% into viewport
- Animation: each feature card fades up individually as it enters view
- Stagger: 0.1s between cards in the same row
- Once: only animate in (not out)

**Social proof (testimonials / logos):**
- Logos: horizontal scroll or stagger fade
- Testimonials: stack + rotate effect

**CTA:**
- Strong entrance: scale from 0.9 + bright glow animation
- Subtle pulse: gentle breathing animation to draw attention

**GSAP ScrollTrigger implementation:**
```typescript
// Feature cards stagger on scroll
gsap.from('.feature-card', {
  y: 40,
  opacity: 0,
  duration: 0.6,
  ease: 'power2.out',
  stagger: 0.1,
  scrollTrigger: {
    trigger: '.features-section',
    start: 'top 75%',
    once: true,
  },
});
```

Design for: [your specific page sections and content].
```

---

## Loading & Skeleton Animation

```
Design loading states and skeleton animations for: [feature]

**Loading scenarios:**

**1. Skeleton screens (preferred over spinners for content loading):**
```tsx
// Skeleton component
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "animate-pulse rounded bg-muted",
      // shimmer effect
      "relative overflow-hidden",
      "after:absolute after:inset-0",
      "after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent",
      "after:translate-x-[-100%] after:animate-[shimmer_2s_infinite]",
      className
    )} />
  );
}

// Page skeleton
function PostCardSkeleton() {
  return (
    <div className="space-y-3 p-4 rounded-lg border">
      <Skeleton className="h-4 w-3/4" />      {/* title */}
      <Skeleton className="h-3 w-full" />      {/* body line 1 */}
      <Skeleton className="h-3 w-5/6" />      {/* body line 2 */}
      <div className="flex gap-2">
        <Skeleton className="h-6 w-6 rounded-full" />  {/* avatar */}
        <Skeleton className="h-3 w-24" />              {/* author */}
      </div>
    </div>
  );
}
```

**2. Progress indicators (for multi-step operations):**
```tsx
function ProgressBar({ value, max }: { value: number; max: number }) {
  const percentage = Math.round((value / max) * 100);
  return (
    <div role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <motion.div
        className="h-1 bg-primary rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.3 }}
      />
      <span>{percentage}%</span>
    </div>
  );
}
```

**3. Button loading state:**
```tsx
<Button disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      Saving...
    </>
  ) : 'Save changes'}
</Button>
```

Design all loading states for: [your specific feature's loading scenarios].
```

---

## Page Transition Design

```
Design page transitions for: [Next.js / SPA application]

**Transition philosophy:**
- Fast enough to not feel slow (< 350ms)
- Meaningful — direction suggests spatial relationship
- Not distracting — users should see the content, not the transition

**Transition types:**

**1. Simple fade (universal — works everywhere):**
```tsx
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
};
```

**2. Slide (for sections with spatial relationship — wizard, tabs):**
```tsx
// Direction based on navigation type
const direction = useNavigationDirection(); // 'forward' | 'back'

const slideVariants = {
  initial: { x: direction === 'forward' ? '100%' : '-100%', opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit:    { x: direction === 'forward' ? '-30%' : '30%', opacity: 0,
             transition: { duration: 0.2 } },
};
```

**3. Scale + fade (for modals-as-pages, detail views):**
```tsx
const detailVariants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, scale: 0.98, transition: { duration: 0.15 } },
};
```

**Next.js App Router implementation:**
```tsx
// app/template.tsx (not layout.tsx — template re-renders on navigation)
'use client';
import { motion, AnimatePresence } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
```

Design for: [your specific navigation patterns and page types].
```
