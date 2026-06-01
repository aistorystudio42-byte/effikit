<!-- @keywords: css, tailwind, styling, design tokens, responsive, dark mode, className, variants -->

# Frontend — Styling System and Design Consistency

## Core Philosophy

A styling system solves three problems: **consistency** (same design language everywhere), **maintainability** (changes propagate from a single point), **performance** (critical CSS, no unnecessary bundle).

Design tokens are the foundation of this system. Color, size, and spacing values are never hardcoded as magic numbers — token names are used instead.

---

## When to Activate

> This skill should be activated when you need to resolve issues related to styling.

## Principles

### Working with Tailwind
### Variant Management — cva (Class Variance Authority)

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base classes — shared across all variants
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        outline: 'border border-input bg-background hover:bg-accent',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = ({ className, variant, size, ...props }: ButtonProps) => (
  <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
);
```

**Why cva?** Conditional class merging logic stays contained, type-safe variants, overridable.

### cn Utility
```tsx
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// twMerge: Intelligently merges conflicting Tailwind classes
// "px-2 px-4" → "px-4" (last one wins)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

### Design Token System
### Token Definition via CSS Variables
```css
/* globals.css */
:root {
  /* Colors — HSL format makes theme switching easy */
  --color-primary: 221 83% 53%;
  --color-primary-foreground: 0 0% 100%;
  --color-secondary: 210 40% 96%;
  --color-destructive: 0 84% 60%;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  
  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.dark {
  --color-primary: 217 91% 60%;
  --color-secondary: 217 32% 17%;
}
```

### Tailwind Config Integration
```js
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'hsl(var(--color-primary))',
          foreground: 'hsl(var(--color-primary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--color-destructive))',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
    },
  },
};
```

---

### Responsive Design
### Mobile-First Principle
```tsx
// Wrong: Desktop-first (requires overrides, more code)
<div className="grid-cols-3 sm:grid-cols-1" />

// Correct: Mobile-first (add from small to large)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />
```

### Breakpoint Decisions
```
sm (640px)   → Tablet portrait
md (768px)   → Tablet landscape
lg (1024px)  → Small laptop
xl (1280px)  → Desktop
2xl (1536px) → Wide desktop

Rule: Where does the content break? Put the breakpoint there.
Don't memorize numbers — test on real devices.
```

### Container Queries (Modern Approach)
```tsx
// Style based on parent width — not viewport
<div className="@container">
  <div className="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3">
    {/* 2 columns when parent reaches 768px */}
  </div>
</div>
```

---

### Dark Mode
### Strategy Selection
```tsx
// Strategy 1: class-based (recommended — user preference control)
// tailwind.config: darkMode: 'class'
<html className={isDark ? 'dark' : ''}>

// Strategy 2: media query based (follows system preference)
// tailwind.config: darkMode: 'media'
```

### Dark Mode Color Usage
```tsx
// Correct: Semantic token, correct color in each mode
<div className="bg-background text-foreground border-border">

// Wrong: Direct color value, dark mode requires overrides
<div className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
```

---

### Animation and Transitions
```tsx
// Micro-interaction: with Transition
<button className="transition-all duration-200 hover:scale-105 active:scale-95">

// Layout transition: with Framer Motion
<motion.div
  layout
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.2, ease: 'easeOut' }}
>
```

**Animation rule:** `prefers-reduced-motion` must always be supported.
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Decision Framework

- Evaluate the complexity of the task.
- Identify structural bottlenecks.
- Choose the simplest abstraction that solves the problem.

## Anti-Patterns

### Magic Numbers
```tsx
// Wrong
<div style={{ marginTop: '23px', color: '#1a2b3c' }} />

// Correct
<div className="mt-6 text-foreground" />
```

### Inline Style Abuse
Inline style is only for dynamic values that don't fit the token system:
```tsx
// Correct: Dynamic value not in token system
<div style={{ height: `${dynamicHeight}px` }} />

// Wrong: Token exists but inline style used
<div style={{ color: 'red' }} /> // → className="text-destructive"
```

### className Spaghetti
```tsx
// Wrong: 20 classes on one line
<div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer select-none text-sm font-medium text-gray-700">

// Correct: Build a component with cva or split logically
const cardBase = cn(
  'flex items-center justify-between',
  'px-4 py-3',
  'bg-background border border-border rounded-lg',
  'shadow-sm hover:shadow-md transition-shadow duration-200',
  'cursor-pointer select-none',
  'text-sm font-medium text-foreground'
);
```

## Example in Action

```typescript
// Apply the core principles identified above in a targeted manner.
// Keep it simple and maintainable.
```
