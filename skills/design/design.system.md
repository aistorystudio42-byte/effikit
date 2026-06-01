<!-- @keywords: design system, tokens, components, typography, color, spacing, design language -->

# Design — Design System Architecture

## Core Philosophy

```typescript
// Consistent prop API across all components:

// 1. Variant — visual style
variant: 'primary' | 'secondary' | 'ghost' | 'destructive'

// 2. Size — consistent scale
size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'

// 3. State props — predictable names
isLoading, isDisabled, isSelected, isExpanded, isOpen

// 4. Composition — accept children and slot props
// Don't limit composition — use children/render props for flexibility

// 5. ref forwarding — required for all interactive elements
const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ ...props }, ref) => (
  <button ref={ref} {...props} />
));

// 6. Spread native props — don't block native attributes
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}
// User can pass data-testid, aria-*, id without extra prop definitions
```

---

## When to Activate

> This skill should be activated when you need to resolve issues related to system.

## Principles

### What Is a Design System?
A design system is the single source of truth for visual and interaction decisions. It's not a component library — it's a language. When every designer and developer uses the same tokens, spacing scale, and component primitives, the product looks and behaves consistently without constant coordination.

---

### Token Hierarchy
```
Primitive tokens → Semantic tokens → Component tokens

Primitive: the raw values
  --blue-500: #3b82f6
  --gray-900: #111827
  --space-4: 1rem

Semantic: purpose-named aliases
  --color-primary: var(--blue-500)
  --color-text: var(--gray-900)
  --space-content-padding: var(--space-4)

Component: overrides for specific components
  --button-padding: var(--space-2) var(--space-4)
  --card-border-radius: var(--radius-lg)
```

Why three layers?
- Theme changes (dark mode, brand) only need to update semantic tokens
- Primitive tokens never change — they're the palette
- Component tokens allow local adjustments without breaking global

---

### Color System Design
```typescript
// Perceptually uniform color scales — each step is visually equal distance
const colorScale = {
  // Neutral
  gray: {
    50:  '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  // Brand color scale (generate with HSL at same lightness steps)
  blue: { /* same structure */ },
  red: { /* same structure */ },
  green: { /* same structure */ },
} as const;

// Semantic mapping
const semanticColors = {
  // Surfaces
  background:           'var(--gray-50)',    // page background
  surface:              'var(--white)',       // card/modal background
  surfaceElevated:      'var(--gray-100)',   // slightly raised

  // Text
  textPrimary:          'var(--gray-900)',
  textSecondary:        'var(--gray-600)',
  textDisabled:         'var(--gray-400)',
  textInverse:          'var(--white)',

  // Interactive
  colorPrimary:         'var(--blue-600)',
  colorPrimaryHover:    'var(--blue-700)',
  colorPrimaryActive:   'var(--blue-800)',

  // Status
  colorSuccess:         'var(--green-600)',
  colorWarning:         'var(--amber-500)',
  colorError:           'var(--red-600)',
  colorInfo:            'var(--blue-500)',
} as const;
```

---

### Typography Scale
```typescript
// Type scale — consistent ratio (1.25 major third, or 1.333 perfect fourth)
const typeScale = {
  xs:   { size: '0.75rem',  lineHeight: '1rem',    letterSpacing: '0.05em' },
  sm:   { size: '0.875rem', lineHeight: '1.25rem',  letterSpacing: '0.01em' },
  base: { size: '1rem',     lineHeight: '1.5rem',   letterSpacing: '0' },
  lg:   { size: '1.125rem', lineHeight: '1.75rem',  letterSpacing: '-0.01em' },
  xl:   { size: '1.25rem',  lineHeight: '1.75rem',  letterSpacing: '-0.01em' },
  '2xl':{ size: '1.5rem',   lineHeight: '2rem',     letterSpacing: '-0.02em' },
  '3xl':{ size: '1.875rem', lineHeight: '2.25rem',  letterSpacing: '-0.02em' },
  '4xl':{ size: '2.25rem',  lineHeight: '2.5rem',   letterSpacing: '-0.03em' },
} as const;

// Semantic text styles
const textStyles = {
  display:  { ...typeScale['4xl'], weight: 800 },
  h1:       { ...typeScale['3xl'], weight: 700 },
  h2:       { ...typeScale['2xl'], weight: 700 },
  h3:       { ...typeScale['xl'],  weight: 600 },
  h4:       { ...typeScale['lg'],  weight: 600 },
  bodyLg:   { ...typeScale['lg'],  weight: 400 },
  body:     { ...typeScale['base'],weight: 400 },
  bodySm:   { ...typeScale['sm'],  weight: 400 },
  caption:  { ...typeScale['xs'],  weight: 400 },
  label:    { ...typeScale['sm'],  weight: 500, letterSpacing: '0.03em', textTransform: 'uppercase' },
} as const;
```

---

### Spacing System
```typescript
// 4px base grid — all spacing is a multiple of 4
const spacing = {
  0:   '0px',
  px:  '1px',
  0.5: '2px',
  1:   '4px',
  1.5: '6px',
  2:   '8px',
  2.5: '10px',
  3:   '12px',
  4:   '16px',
  5:   '20px',
  6:   '24px',
  8:   '32px',
  10:  '40px',
  12:  '48px',
  16:  '64px',
  20:  '80px',
  24:  '96px',
} as const;

// Semantic spacing usage guide
/*
  Component internal padding:   4–16px (1–4)
  Between related elements:     4–8px  (1–2)
  Between unrelated sections:   24–48px (6–12)
  Page margins (mobile):        16–24px (4–6)
  Page margins (desktop):       48–96px (12–24)
*/
```

---

### Design System Governance
```
Token naming convention: all lowercase, hyphenated
  Good: --color-primary, --space-content-gap
  Bad:  --ColorPrimary, --spaceContentGap

Adding new components:
  1. Check if a composition of existing components works first
  2. Identify if multiple teams need this component
  3. Design with token system — no hardcoded values
  4. Document usage, variants, and non-usage cases
  5. Add to Storybook with all variants documented

Breaking changes:
  - Deprecate old API, keep both working for one major version
  - Provide migration guide
  - Automated codemod if possible (jscodeshift)
```

---

## Decision Framework

- Evaluate the complexity of the task.
- Identify structural bottlenecks.
- Choose the simplest abstraction that solves the problem.

## Anti-Patterns

- Over-engineering the solution.
- Ignoring context and copying blindly.
- Mixing concerns unnecessarily.

## Example in Action

- [ ] All colors reference semantic tokens (never hardcoded hex in components)
- [ ] All spacing uses the spacing scale (no arbitrary pixel values)
- [ ] Typography uses defined text styles
- [ ] Components accept native HTML attributes via spread
- [ ] All interactive components forward refs
- [ ] Dark mode supported via CSS variable swapping
- [ ] All variants documented in Storybook
