<!-- @keywords: accessibility, color contrast, WCAG, color blindness, visual design, contrast ratio -->

# Accessibility — Color and Visual Accessibility

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to color.

## Principles

### Color Contrast Requirements
WCAG 2.1 defines minimum contrast ratios for text readability.

```
AA Standard (minimum):
  Normal text (< 18px or < 14px bold): 4.5:1
  Large text  (≥ 18px or ≥ 14px bold): 3:1
  UI components (borders, icons):      3:1

AAA Standard (enhanced):
  Normal text: 7:1
  Large text:  4.5:1

Target AA for most projects. AAA for healthcare or high-stakes UI.
```

---

### Measuring Contrast
```typescript
// Calculate contrast ratio programmatically
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const sRGB = c / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(...hexToRgb(hex1));
  const l2 = getLuminance(...hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Usage
const ratio = getContrastRatio('#3b82f6', '#ffffff'); // blue on white
console.log(ratio.toFixed(2)); // 3.03 — fails AA for normal text, passes for large text

// Audit all color combinations
const colorPairs = [
  { fg: '#111827', bg: '#ffffff', context: 'body text' },
  { fg: '#6b7280', bg: '#ffffff', context: 'secondary text' },
  { fg: '#ffffff', bg: '#3b82f6', context: 'primary button' },
];

colorPairs.forEach(({ fg, bg, context }) => {
  const ratio = getContrastRatio(fg, bg);
  const passAA = ratio >= 4.5;
  console.log(`${context}: ${ratio.toFixed(2)}:1 ${passAA ? '✓' : '✗ FAIL'}`);
});
```

---

### Don't Rely on Color Alone
About 8% of men and 0.5% of women have some form of color blindness. Never use color as the only means of conveying information.

```tsx
// ✗ Color only — invisible to color blind users
<span style={{ color: errors.email ? 'red' : 'green' }}>
  {errors.email ? 'Invalid email' : 'Email looks good'}
</span>

// ✓ Color + icon + text
<span className={errors.email ? 'text-red-600' : 'text-green-600'}>
  {errors.email ? (
    <><ErrorIcon aria-hidden /> Invalid email format</>
  ) : (
    <><CheckIcon aria-hidden /> Email looks good</>
  )}
</span>

// ✗ Status only by color in table
<td style={{ backgroundColor: order.late ? 'red' : 'green' }} />

// ✓ Color + text label
<td className={order.late ? 'bg-red-100' : 'bg-green-100'}>
  <span className={order.late ? 'text-red-700' : 'text-green-700'}>
    {order.late ? 'Late' : 'On time'}
  </span>
</td>

// ✗ Charts with color-only data series
<LineChart colors={['red', 'green', 'blue']} />

// ✓ Charts with color + pattern + label
<LineChart
  series={[
    { label: 'Revenue', color: '#2563eb', dashArray: '0' },
    { label: 'Costs', color: '#dc2626', dashArray: '5,5' },
    { label: 'Profit', color: '#16a34a', dashArray: '10,3,3,3' },
  ]}
/>
```

---

### Color Blindness Testing
```
Types of color blindness:
  Deuteranopia (8% of men): can't distinguish red/green
  Protanopia (1% of men): reduced red sensitivity
  Tritanopia (rare): blue-yellow confusion
  Achromatopsia (very rare): no color vision at all

Testing tools:
  Chrome DevTools → Rendering → Emulate vision deficiency
  Figma plugin: "Color Blind" by Adobe
  NoCoffee browser extension
  Sim Daltonism (macOS)
```

---

### Dark Mode Contrast
```css
:root {
  --text-primary:     #111827;  /* on white: 16.1:1 ✓ */
  --text-secondary:   #4b5563;  /* on white: 7.0:1  ✓ */
  --text-tertiary:    #9ca3af;  /* on white: 2.8:1  ✗ — decorative only */
  --color-primary:    #2563eb;  /* on white: 4.5:1  ✓ AA */
}

.dark {
  --text-primary:     #f9fafb;  /* on #111827: 16.7:1 ✓ */
  --text-secondary:   #d1d5db;  /* on #111827: 8.9:1  ✓ */
  --text-tertiary:    #6b7280;  /* on #111827: 2.6:1  ✗ — decorative only */
  --color-primary:    #60a5fa;  /* on #111827: 4.6:1  ✓ AA */
  /* note: dark mode often needs a lighter primary shade to meet contrast */
}
```

---

### Focus Indicators — Contrast Requirements
```css
/* Focus ring must have 3:1 contrast against adjacent colors */
:focus-visible {
  /* Dark ring on light background */
  outline: 3px solid #1d4ed8;    /* 7.2:1 against white ✓ */
  outline-offset: 2px;
}

/* Problem: dark ring on dark background is invisible */
/* Solution: double ring */
:focus-visible {
  outline: 2px solid white;
  box-shadow: 0 0 0 4px #1d4ed8;
  /* white gap: visible on dark bg / dark ring: visible on light bg */
}
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

- [ ] All text meets AA contrast (4.5:1 for body, 3:1 for large text)
- [ ] UI components (borders, input outlines) meet 3:1 contrast
- [ ] No information conveyed by color alone (always add icon or label)
- [ ] Charts and graphs have patterns or labels beyond color
- [ ] Tested with deuteranopia simulation (most common color blindness)
- [ ] Dark mode colors re-checked (dark mode often needs lighter brand colors)
- [ ] Focus rings visible in both light and dark mode
- [ ] Error states use icon + text, not just red color
