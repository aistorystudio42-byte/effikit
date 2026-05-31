<!-- @keywords: design system, UI design, component library, design tokens, style guide, figma to code -->
<!-- @domain: UI/UX Design System Prompts -->

# Design System Prompts

## Design System Foundation

```
Create a design system foundation for: [product / brand]

**Brand context:**
- Product type: [SaaS / consumer / enterprise / developer tool]
- Personality: [professional / playful / minimal / bold / trustworthy]
- Primary color: [hex or description]
- Target users: [developers / business users / general consumers]

**Design token system:**

**Color palette:**
```typescript
const colors = {
  // Brand
  brand: {
    50: '#F5F3FF',   // lightest tint
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',  // primary brand color
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',  // darkest shade
    950: '#2E1065',
  },
  
  // Semantic (map brand → intent)
  semantic: {
    'bg-page': colors.brand[50],
    'bg-surface': '#FFFFFF',
    'bg-elevated': '#F9FAFB',
    'text-primary': '#111827',
    'text-secondary': '#6B7280',
    'text-disabled': '#D1D5DB',
    'border-default': '#E5E7EB',
    'border-focus': colors.brand[500],
  },
  
  // Feedback
  feedback: {
    success: { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
    error:   { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
    warning: { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
    info:    { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  },
};
```

**Spacing scale (4px base):**
```
0: 0
1: 4px (0.25rem)
2: 8px (0.5rem)
3: 12px (0.75rem)
4: 16px (1rem) ← standard gap
5: 20px (1.25rem)
6: 24px (1.5rem)
8: 32px (2rem) ← section spacing
10: 40px (2.5rem)
12: 48px (3rem)
16: 64px (4rem) ← large sections
20: 80px (5rem)
24: 96px (6rem) ← page sections
```

**Typography scale:**
```
text-xs:   12px / 16px line-height
text-sm:   14px / 20px
text-base: 16px / 24px ← body text
text-lg:   18px / 28px
text-xl:   20px / 28px
text-2xl:  24px / 32px
text-3xl:  30px / 36px ← section headings
text-4xl:  36px / 40px
text-5xl:  48px / 48px ← hero text
```

Generate the complete design token system for: [your brand].
```

---

## Component Design Specification

```
Design a component specification for: [component name]

**Component:** [name]
**Purpose:** [what it does in the UI — one sentence]

**Visual design:**

**Anatomy (parts of the component):**
- [Part 1]: [what it is, e.g., "leading icon: optional 20px icon"]
- [Part 2]: [what it is]
- [Part 3]: [what it is]

**Variants:**
| Variant | Visual difference | When to use |
|---------|-----------------|-------------|
| Primary | Filled background, white text | Main CTA |
| Secondary | Outlined, colored text | Secondary action |
| Ghost | Transparent, colored text | Tertiary action |

**Sizes:**
| Size | Height | Padding | Font size | Icon size |
|------|--------|---------|-----------|-----------|
| sm | 32px | 8px 12px | 14px | 16px |
| md | 40px | 10px 16px | 16px | 18px |
| lg | 48px | 12px 24px | 18px | 20px |

**States:**
| State | Visual change |
|-------|--------------|
| Default | — |
| Hover | Background lightens 10% |
| Focus | 2px ring offset 2px |
| Active | Background darkens 10% |
| Disabled | 40% opacity, no cursor |
| Loading | Spinner replaces leading icon |

**Behavior:**
- Keyboard: Enter/Space triggers action
- Screen reader: reads as "button" with label
- Mobile tap target: min 44×44px

Produce: full CSS/Tailwind specification for implementation.
```

---

## Responsive Layout Design

```
Design a responsive layout system for: [page / section]

**Page/section:**
[describe what content needs to be laid out]

**Breakpoints:**
```
Mobile:  < 640px  (sm)
Tablet:  640-1024px (md)
Desktop: > 1024px (lg)
Wide:    > 1280px (xl)
```

**Layout grid:**
```css
/* Mobile: 4-column grid */
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

/* Tablet: 8-column grid */
@media (min-width: 640px) {
  .grid { grid-template-columns: repeat(8, 1fr); gap: 24px; }
}

/* Desktop: 12-column grid */
@media (min-width: 1024px) {
  .grid { grid-template-columns: repeat(12, 1fr); gap: 32px; }
}
```

**Content width:**
```css
.container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 16px;    /* mobile */
}
@media (min-width: 640px)  { .container { padding: 0 24px; } }
@media (min-width: 1024px) { .container { padding: 0 32px; } }
@media (min-width: 1280px) { .container { padding: 0 48px; } }
```

**Content arrangement at each breakpoint:**
Mobile:  [describe — e.g., "single column, image stacks above text"]
Tablet:  [describe — e.g., "2 columns, image beside text"]
Desktop: [describe — e.g., "3 columns with sidebar"]

Produce: Tailwind responsive classes for this layout.
```

---

## Color System Design

```
Design a complete color system for: [product]

**Brand color:** [hex — e.g., #6366F1 indigo]

**Generate:**

**1. Full brand scale (50-950):**
Use HSL color space for consistent lightness progression:
- 50-200: tints (backgrounds, subtle)
- 300-400: light accents
- 500: base (primary)
- 600-700: hover/pressed states
- 800-900: dark text on light bg
- 950: deepest

**2. Neutral scale:**
Gray that harmonizes with the brand (slightly warm or cool to match):
- 50-200: page backgrounds, cards
- 300-400: borders, separators
- 500-600: muted text, icons
- 700-900: body and heading text

**3. Semantic color mapping:**

Background:
- page: neutral-50 / dark: neutral-950
- surface: white / dark: neutral-900
- elevated: neutral-100 / dark: neutral-800

Text:
- primary: neutral-900 / dark: neutral-50
- secondary: neutral-500 / dark: neutral-400
- disabled: neutral-300 / dark: neutral-600

Interactive:
- default: brand-500
- hover: brand-600
- pressed: brand-700
- focus ring: brand-500 with opacity

**4. Accessibility check:**
For each text-on-background combination, verify contrast ratio:
- Normal text (< 18px): ≥ 4.5:1
- Large text (≥ 18px or bold ≥ 14px): ≥ 3:1
- UI components and graphics: ≥ 3:1

Generate all token values and WCAG pass/fail for: [your brand color].
```

---

## Typography System

```
Design a typography system for: [product]

**Design goals:**
[professional / friendly / editorial / technical]

**Font selection:**
- Heading: [Inter / Geist / Sora / custom — or describe vibe]
- Body: [Inter / System-UI / Georgia for editorial]
- Mono: [JetBrains Mono / Fira Code — for code elements]

**Type scale (modular — ratio 1.25 "Major Third"):**
```
Display: 60px / 1.1 line-height / -0.03em tracking / 700 weight
H1:      48px / 1.2 / -0.02em / 700
H2:      36px / 1.25 / -0.01em / 700
H3:      30px / 1.3 / -0.01em / 600
H4:      24px / 1.35 / 0em / 600
H5:      20px / 1.4 / 0em / 600
H6:      16px / 1.5 / 0em / 600
Body:    16px / 1.6 / 0em / 400
Small:   14px / 1.5 / 0em / 400
XSmall:  12px / 1.4 / 0.01em / 400
Caption: 11px / 1.4 / 0.02em / 500
```

**Usage rules:**
- H1: page title only (one per page)
- H2: major sections
- H3: subsections within H2
- Body: all running text
- Small: metadata, captions, labels
- Caption: legal, footnotes, timestamps

**CSS custom properties:**
```css
:root {
  --font-heading: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  
  --text-display: clamp(48px, 5vw, 72px); /* fluid sizing */
  --text-h1: clamp(36px, 4vw, 48px);
}
```

Generate the typography system for: [your product and design goals].
```
