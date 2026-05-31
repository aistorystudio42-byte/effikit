<!-- @keywords: responsive design, mobile first, breakpoints, layout, grid, fluid typography -->

# Design — Responsive Design and Layout

## Mobile-First Thinking

Mobile-first means designing the simplest, most constrained version first, then progressively enhancing for larger screens. It forces prioritization — you can only show what truly matters.

```
Design in this order:
  320px  → smallest mobile (force ruthless prioritization)
  375px  → common iPhone
  430px  → large phone
  768px  → tablet portrait
  1024px → tablet landscape / small laptop
  1280px → desktop
  1440px → wide desktop
```

---

## Layout Systems

### Fluid Grid
```css
/* Fluid grid — columns adapt to screen width */
.container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
  gap: var(--space-6);
  padding: 0 var(--space-4);
}

/* 3-column grid with controlled collapse */
.product-grid {
  display: grid;
  grid-template-columns: 1fr;              /* mobile: 1 column */
  gap: 1.5rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr); /* tablet: 2 columns */
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr); /* desktop: 3 columns */
  }
}
```

### Sidebar Layout
```css
/* Sidebar that collapses on small screens */
.page-layout {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
    "main"
    "sidebar";

  @media (min-width: 1024px) {
    grid-template-columns: 1fr 280px;
    grid-template-areas: "main sidebar";
    gap: 2rem;
  }
}

.main { grid-area: main; }
.sidebar { grid-area: sidebar; }
```

---

## Fluid Typography

Font sizes that scale smoothly between viewport widths — no hard jumps.

```css
/* CSS clamp: min | preferred | max */
/* Preferred: fluid value that grows with viewport */

:root {
  /* Body text: 16px at 320px, 18px at 1280px */
  --text-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);

  /* H1: 2rem at 320px, 4rem at 1280px */
  --text-h1: clamp(2rem, 1.5rem + 2.5vw, 4rem);

  /* H2: 1.5rem at 320px, 2.5rem at 1280px */
  --text-h2: clamp(1.5rem, 1.2rem + 1.5vw, 2.5rem);
}

/* Apply */
body { font-size: var(--text-base); }
h1 { font-size: var(--text-h1); }
```

---

## Responsive Component Patterns

### Stack → Inline
```typescript
// Components that stack vertically on mobile, go inline on desktop
const ActionBar = () => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <h1 className="text-2xl font-bold">Products</h1>
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button variant="secondary">Export</Button>
      <Button variant="primary">Add Product</Button>
    </div>
  </div>
);
```

### Navigation Patterns
```typescript
// Desktop: horizontal nav bar
// Mobile: bottom navigation or hamburger menu
const Navigation = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav>
      {/* Desktop: always visible */}
      <div className="hidden md:flex gap-6">
        {navItems.map(item => <NavLink key={item.href} {...item} />)}
      </div>

      {/* Mobile: hamburger toggle */}
      <button
        className="md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-expanded={mobileOpen}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <XIcon /> : <MenuIcon />}
      </button>

      {/* Mobile: slide-out drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-background" role="dialog">
          {navItems.map(item => <NavLink key={item.href} {...item} onClick={() => setMobileOpen(false)} />)}
        </div>
      )}
    </nav>
  );
};
```

---

## Touch Target Sizes

```css
/* Minimum touch target: 44x44px (Apple HIG) / 48x48px (Material) */
.button, .link, .checkbox, .radio {
  min-height: 44px;
  min-width: 44px;
}

/* For small visual elements, use padding to increase hit area */
.icon-button {
  padding: 12px;  /* visual icon: 20px, total hit area: 44px */
}
```

---

## Image Responsive Patterns

```typescript
// Always specify width+height to prevent CLS (Cumulative Layout Shift)
// Use aspect-ratio to reserve space before image loads

// Hero image — loads eagerly (LCP)
<img
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  loading="eager"
  fetchpriority="high"
  style={{ width: '100%', height: 'auto', aspectRatio: '2/1' }}
/>

// Content images — lazy load
<img
  src="/feature.jpg"
  alt="Feature"
  width={600}
  height={400}
  loading="lazy"
  decoding="async"
  style={{ width: '100%', height: 'auto' }}
/>

// Art direction — different images for different viewports
<picture>
  <source
    media="(min-width: 1024px)"
    srcSet="/hero-desktop.webp 1x, /hero-desktop-2x.webp 2x"
  />
  <source
    media="(min-width: 640px)"
    srcSet="/hero-tablet.webp"
  />
  <img src="/hero-mobile.jpg" alt="Hero" width={375} height={500} />
</picture>
```

---

## Responsive Design Checklist

- [ ] Tested at 320px (smallest supported mobile)
- [ ] Touch targets ≥ 44px
- [ ] No horizontal scroll at any viewport width
- [ ] Text remains readable without zooming (≥ 16px base)
- [ ] Images have explicit width/height (no layout shift)
- [ ] Forms are usable on mobile (label placement, keyboard type)
- [ ] Navigation accessible on mobile (visible or accessible via toggle)
- [ ] Fluid typography used for headings (clamp)
- [ ] Container max-width set (content doesn't stretch to 1920px)
