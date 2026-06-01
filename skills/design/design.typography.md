<!-- @keywords: typography, font, readability, line height, letter spacing, font pairing, web fonts -->

# Design — Typography

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to typography.

## Principles

### Typography Is Communication
Typography is not decoration. Poorly set type makes content harder to read, even if it looks fine at a glance. These principles make text effortlessly readable.

---

### Measure (Line Length)
The optimal line length for body text is 60–80 characters (including spaces). Too short = choppy. Too long = eye loses its place.

```css
/* Constrain readable content to optimal measure */
.prose {
  max-width: 65ch; /* 65 characters wide */
}

/* Different measures for different contexts */
.narrow-column  { max-width: 45ch; }  /* sidebar, captions */
.content-column { max-width: 65ch; }  /* articles, forms */
.wide-content   { max-width: 80ch; }  /* tables, code blocks */
```

---

### Line Height (Leading)
```css
/* Line height rules:
   Body text:    1.5–1.7 (more space for long reading)
   Headings:     1.1–1.3 (tighter for display text)
   Captions:     1.3–1.4
   Code:         1.5 (readability)
*/

:root {
  --lh-tight:   1.2;   /* display, large headings */
  --lh-snug:    1.375; /* subheadings */
  --lh-normal:  1.5;   /* body copy */
  --lh-relaxed: 1.625; /* long-form reading */
}

body          { line-height: var(--lh-normal); }
h1, h2        { line-height: var(--lh-tight); }
.article-body { line-height: var(--lh-relaxed); }
```

---

### Font Pairing
```
Effective pairing rules:
  1. Contrast: pair a serif with a sans-serif
     Heading: Playfair Display (serif, editorial)
     Body: Inter (sans-serif, neutral)

  2. Similarity in contrast: both geometric or both humanist
     Heading: Montserrat (geometric sans)
     Body: DM Sans (geometric sans, lighter weight)

  3. One font, multiple weights (simplest, most cohesive)
     Variable font with 400/500/600/700/800
     No pairing needed — weight creates hierarchy

Popular variable fonts (single-font system):
  Inter:      https://rsms.me/inter/ (most popular, UI-optimized)
  Plus Jakarta Sans: modern geometric, great for SaaS
  Outfit:     clean, slightly playful
  Sora:       rounded, friendly

Font pairing generators:
  fontpair.co, fonts.google.com/knowledge
```

---

### Typographic Hierarchy
```typescript
// Visual hierarchy through size, weight, and spacing — not decoration
const TypographicHierarchy = () => (
  <article>
    {/* Level 1: Page title — large, heavy weight */}
    <h1 className="text-4xl font-extrabold tracking-tight leading-tight text-gray-900">
      The Future of Work
    </h1>

    {/* Level 2: Subheadline — medium-large, medium weight, secondary color */}
    <p className="text-xl font-medium text-gray-600 mt-3">
      How distributed teams are reshaping productivity
    </p>

    {/* Level 3: Metadata — small, light, muted */}
    <div className="flex gap-4 mt-4 text-sm text-gray-400">
      <span>March 15, 2024</span>
      <span>8 min read</span>
    </div>

    {/* Body copy: optimal measure, comfortable line height */}
    <div className="mt-8 max-w-[65ch] text-base leading-relaxed text-gray-700 space-y-4">
      <p>...</p>
    </div>
  </article>
);
```

---

### Spacing Around Text
```css
/* Margin between heading and following text */
h1 { margin-bottom: 0.5em; }   /* relative to font size — scales */
h2 { margin-bottom: 0.5em; }
h3 { margin-bottom: 0.25em; }

/* Paragraphs */
p + p { margin-top: 1em; }     /* same-level spacing */
h2 + p { margin-top: 0.5em; }  /* subheading → first paragraph is closer */

/* Avoid orphans (single word on last line) */
p {
  orphans: 3;   /* min 3 lines before page break */
  widows: 3;    /* min 3 lines after page break */
}
```

---

## Decision Framework

```html
<!-- Preload critical fonts — prevent FOUT (flash of unstyled text) -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- Preload the exact font variant used above the fold -->
<link
  rel="preload"
  href="/fonts/inter-var.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
```

```css
/* Font display — controls FOUT/FOIT behavior */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;    /* swap: show fallback, then swap to custom font
                            optional: use custom font only if cached
                            block: invisible text until font loads (avoid) */
}

/* System font stack fallback — matches custom font weight/width */
:root {
  --font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont,
               'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code',
               Consolas, 'Courier New', monospace;
}
```

---

## Anti-Patterns

- Over-engineering the solution.
- Ignoring context and copying blindly.
- Mixing concerns unnecessarily.

## Example in Action

- [ ] Body text is 16px minimum
- [ ] Line height for body copy is 1.5 or greater
- [ ] Line length is constrained (max ~65ch for body)
- [ ] Heading/body contrast is clear (size + weight difference)
- [ ] Custom fonts use `font-display: swap`
- [ ] Critical font is preloaded (`<link rel="preload">`)
- [ ] System font fallback stack defined for each font role
- [ ] At most 2 font families (one brand + one mono for code)
- [ ] Letter-spacing tightened for large display headings (`tracking-tight`)
