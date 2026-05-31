<!-- @keywords: performance, frontend performance, Core Web Vitals, LCP, CLS, FID, bundle size, lighthouse -->
<!-- @domain: Frontend Performance Prompts -->

# Frontend Performance Prompts

## Core Web Vitals Audit

```
Audit and improve Core Web Vitals for: [page / application]

**Current scores (from Lighthouse or PageSpeed Insights):**
- LCP (Largest Contentful Paint): [X s] → target <2.5s
- INP (Interaction to Next Paint): [X ms] → target <200ms
- CLS (Cumulative Layout Shift): [X] → target <0.1
- FCP (First Contentful Paint): [X s]
- TTFB (Time to First Byte): [X ms]

**For each metric below target, diagnose and fix:**

**LCP Improvements:**
- [ ] Is the LCP element an image? → add fetchpriority="high"
- [ ] Is the LCP element loaded via CSS background? → move to <img>
- [ ] Is the font causing render blocking? → add preload for critical fonts
- [ ] Is there server-side rendering? → move LCP content to SSR
- [ ] Is TTFB high? → fix server response time first

**CLS Improvements:**
- [ ] Images without explicit width/height → add dimensions
- [ ] Fonts causing layout shift → font-display: optional or swap with size-adjust
- [ ] Ads/embeds without reserved space → add min-height placeholder
- [ ] Dynamic content inserted above existing content → insert below viewport

**INP Improvements:**
- [ ] Long tasks blocking main thread → break with scheduler.yield()
- [ ] Heavy event handlers → debounce or move work off main thread
- [ ] Large React re-renders → memo, useMemo, useCallback

Analyze and fix: [your specific page].
```

---

## Bundle Size Optimization

```
Analyze and reduce the JavaScript bundle size.

**Current bundle analysis:**
[paste output from: npx @next/bundle-analyzer or webpack-bundle-analyzer]

**Or run:**
```bash
# Next.js
ANALYZE=true npm run build

# Create React App
npx source-map-explorer build/static/js/*.js

# Vite
npx vite-bundle-visualizer
```

**Common issues to find and fix:**

**1. Large dependencies:**
```bash
# Find the biggest packages
npx bundlephobia [package-name]
```
- Chart library imported fully when only one chart type is used → import specific
- lodash/underscore imported fully → use lodash-es with tree shaking
- date-fns/moment → moment is huge, switch to date-fns

**2. Duplicated code:**
- Same component code in multiple chunks
- Fix: Check for multiple versions of same package in node_modules

**3. Unnecessary polyfills:**
- IE11 polyfills in a modern-browsers app
- Fix: Set browserslist targets appropriately

**4. Dynamic imports missing:**
```typescript
// ❌ Modal loaded on every page load
import { HeavyModal } from './HeavyModal';

// ✅ Load only when needed
const HeavyModal = dynamic(() => import('./HeavyModal'), { ssr: false });
```

**5. Images in JS bundles:**
- Icons imported as modules vs sprite/SVG system

For each item found: current size → after fix → implementation.
```

---

## Image Optimization

```
Optimize images for web performance.

**Current image issues:**
[paste Lighthouse image audit results or describe problems]

**Image optimization checklist:**

**Format selection:**
```
Photos → WebP (85% quality) or AVIF (for supporting browsers)
Icons/logos → SVG (infinitely scalable, tiny)
Transparent PNGs → WebP with transparency
Animated content → WebP or video (not GIF)
```

**Next.js Image component (handles most automatically):**
```tsx
import Image from 'next/image';

// ✅ Automatic: WebP conversion, resizing, lazy loading, size hints
<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority           // add for above-fold images (prevents lazy load)
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>

// ❌ Standard <img> — misses all optimizations
<img src="/hero.jpg" alt="..." />
```

**Manual optimization for non-Next.js:**
```bash
# Install sharp
npm install sharp

# Batch convert to WebP
find public/images -name "*.jpg" -exec sh -c 'sharp "$0" --format webp -o "${0%.jpg}.webp"' {} \;
```

**Lazy loading:**
```html
<!-- Viewport images: eager (default) -->
<img src="hero.jpg" loading="eager" fetchpriority="high" alt="...">

<!-- Below fold images: lazy -->
<img src="product.jpg" loading="lazy" alt="...">
```

**Responsive images:**
```html
<picture>
  <source media="(max-width: 640px)" srcset="image-640.webp" type="image/webp">
  <source media="(max-width: 1280px)" srcset="image-1280.webp" type="image/webp">
  <img src="image-1280.jpg" alt="..." width="1280" height="720">
</picture>
```

Apply to: [your specific image loading scenario].
```

---

## React Rendering Performance

```
Find and fix unnecessary re-renders in this React application.

**Symptoms:**
[laggy UI / dropped frames / slow interactions / profiler shows excessive renders]

**Profiling with React DevTools:**
1. Open React DevTools → Profiler tab
2. Click Record
3. Perform the slow interaction
4. Stop recording
5. Identify: which component renders most often, what triggers it

**Common patterns and fixes:**

**1. Object/array created inline (new reference every render):**
```tsx
// ❌ New array every render → triggers re-render of memoized child
<DataTable columns={[{ id: 'name', label: 'Name' }]} />

// ✅ Stable reference
const COLUMNS = [{ id: 'name', label: 'Name' }];
<DataTable columns={COLUMNS} />
```

**2. Inline function props:**
```tsx
// ❌ New function every render → child always re-renders
<Button onClick={() => handleClick(item.id)} />

// ✅ useCallback for stable reference
const handleItemClick = useCallback((id: string) => handleClick(id), [handleClick]);
<Button onClick={() => handleItemClick(item.id)} />
```

**3. Context causing global re-renders:**
```tsx
// ❌ All consumers re-render when ANY context value changes
const AppContext = createContext({ user, theme, notifications });

// ✅ Split contexts — consumers only re-render for their slice
const UserContext = createContext(user);
const ThemeContext = createContext(theme);
```

**4. Missing memo:**
```tsx
// ✅ Memoize expensive pure components
const ExpensiveList = memo(({ items, onSelect }) => {
  // Only re-renders if items or onSelect reference changes
});
```

Find and fix re-render issues in: [your specific code].
```

---

## Performance Monitoring Setup

```
Set up performance monitoring for: [application]

**Metrics to track in production:**

**Real User Monitoring (RUM):**
```typescript
// Vercel Analytics (zero config for Next.js)
import { Analytics } from '@vercel/analytics/react';
<Analytics /> // in root layout

// Or Web Vitals API for custom implementation
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  fetch('/api/vitals', {
    method: 'POST',
    body: JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
      page: window.location.pathname,
    }),
  });
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
```

**Performance Budget:**
```json
// .lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }]
      }
    }
  }
}
```

**CI performance check:**
```yaml
# .github/workflows/lighthouse.yml
- name: Lighthouse CI
  run: npx lhci autorun
```

Build monitoring for: [your specific performance concerns].
```
