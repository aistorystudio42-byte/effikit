<!-- @keywords: performance, frontend, Core Web Vitals, LCP, FID, CLS, bundle, lazy loading, rendering -->

# Performance — Frontend Optimization

## Measure Before You Optimize

Every optimization should be driven by data. Tools for measuring:

```
Chrome DevTools → Performance tab → record and analyze
Lighthouse      → automated audit, scores 0-100
WebPageTest     → real device testing, waterfall view
web-vitals      → real user monitoring (RUM) in production
```

```typescript
// Install real user monitoring
import { onLCP, onFID, onCLS, onINP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  // Send to your analytics endpoint
  navigator.sendBeacon('/analytics/vitals', JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,  // 'good' | 'needs-improvement' | 'poor'
    id: metric.id,
  }));
}

onLCP(sendToAnalytics);
onFID(sendToAnalytics);
onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

---

## LCP (Largest Contentful Paint) — < 2.5s

The largest visible element should load fast. Usually: hero image, above-fold heading, or product image.

```tsx
// Identify LCP element, then optimize it:

// 1. Preload the LCP image
<link rel="preload" as="image" href="/hero.jpg" fetchpriority="high" />

// 2. Next.js Image with priority flag
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority             // preloads, eager loading, high fetchpriority
  placeholder="blur"
  blurDataURL={blurPlaceholder}
/>

// 3. Avoid lazy-loading the LCP image (common mistake)
// Wrong: <img loading="lazy" src="/hero.jpg" />  — delays LCP
// Correct: loading="eager" (default) for above-fold images

// 4. Server-side render the LCP element
// LCP element should be in initial HTML, not inserted by JavaScript
// Wrong: fetch then render hero on client
// Correct: server component renders hero in HTML
```

---

## CLS (Cumulative Layout Shift) — < 0.1

Prevent elements from jumping around after initial render.

```tsx
// Fix 1: Reserve space for images (prevents shift when image loads)
// Always specify width and height
<img src="/product.jpg" alt="Product" width={300} height={300} />
// Or: use aspect-ratio CSS
<div style={{ aspectRatio: '4/3', width: '100%' }}>
  <img src="/product.jpg" alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
</div>

// Fix 2: Don't inject content above existing content
// Wrong: async banner that pushes page content down
useEffect(() => {
  fetchPromo().then(promo => setPromo(promo)); // inserts element → shifts content
}, []);

// Correct: reserve space for dynamic content upfront
<div style={{ minHeight: '60px' }}>
  {promo ? <PromoBanner promo={promo} /> : <div style={{ height: '60px' }} />}
</div>

// Fix 3: Load fonts without invisible text period
// font-display: swap or optional — text visible with fallback immediately
```

---

## Bundle Size Optimization

```typescript
// Analyze: what's in your bundle?
// Vite: npx vite-bundle-analyzer
// Webpack: npx webpack-bundle-analyzer

// Tree-shaking: ensure imports are named, not namespace
import { format } from 'date-fns'; // ✓ tree-shaken
import dateFns from 'date-fns';    // ✗ entire library

// Dynamic imports for heavy components
const ChartLibrary = dynamic(() => import('recharts').then(m => ({ default: m.LineChart })), {
  loading: () => <ChartSkeleton />,
  ssr: false, // chart libraries often don't support SSR
});

// Replace heavy libraries with lighter alternatives
// moment.js  (67kb) → date-fns (tree-shakeable, ~5kb used)
// lodash     (70kb) → lodash-es with named imports (~2kb used)
// axios      (40kb) → native fetch (0kb)

// Check alternatives: bundlephobia.com
```

---

## Rendering Performance

```typescript
// Long task detection — anything > 50ms blocks the main thread
const observer = new PerformanceObserver(list => {
  list.getEntries().forEach(entry => {
    if (entry.duration > 50) {
      console.warn('Long task detected:', entry.duration, entry);
    }
  });
});
observer.observe({ entryTypes: ['longtask'] });

// Defer non-critical work
// Wrong: heavy computation in render
function ProductList({ products }: { products: Product[] }) {
  const sorted = products.sort(complexComparator); // runs every render
  return <ul>{sorted.map(p => <ProductItem key={p.id} product={p} />)}</ul>;
}

// Correct: memoize or move outside
function ProductList({ products }: { products: Product[] }) {
  const sorted = useMemo(() => products.sort(complexComparator), [products]);
  return <ul>{sorted.map(p => <ProductItem key={p.id} product={p} />)}</ul>;
}

// Use startTransition for non-urgent updates
import { startTransition, useState } from 'react';

const [filter, setFilter] = useState('');
const [filteredProducts, setFilteredProducts] = useState(products);

const handleFilterChange = (value: string) => {
  setFilter(value); // urgent: update input immediately
  startTransition(() => {
    setFilteredProducts(filterProducts(products, value)); // not urgent: can defer
  });
};
```

---

## Resource Loading Strategy

```html
<!-- Critical CSS: inline above-the-fold styles -->
<style>
  /* Only what's needed for initial paint */
  body { margin: 0; font-family: system-ui; }
  .hero { min-height: 100vh; }
</style>

<!-- Preconnect to critical origins -->
<link rel="preconnect" href="https://api.myapp.com" />
<link rel="preconnect" href="https://fonts.googleapis.com" />

<!-- Prefetch likely next navigation -->
<link rel="prefetch" href="/checkout" as="document" />

<!-- Preload critical resources -->
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />

<!-- Load non-critical scripts asynchronously -->
<script src="/analytics.js" async></script>
<script src="/non-critical.js" defer></script>
```

---

## Performance Budget

```json
// performance-budget.json — enforced in CI
{
  "resourceSizes": [
    { "resourceType": "script", "budget": 300 },
    { "resourceType": "total",  "budget": 1000 }
  ],
  "timings": [
    { "metric": "interactive", "budget": 3500 },
    { "metric": "first-contentful-paint", "budget": 1500 }
  ]
}
```

---

## Frontend Performance Checklist

- [ ] LCP < 2.5s (measured with real users, not Lighthouse only)
- [ ] CLS < 0.1 (images have explicit dimensions, no content injection above fold)
- [ ] Bundle analyzed — no unexpectedly large dependencies
- [ ] LCP image has `priority` flag (or `loading="eager"` + `fetchpriority="high"`)
- [ ] Routes code-split with `lazy()`
- [ ] `useMemo`/`useCallback` only where profiler shows benefit
- [ ] Long tasks (> 50ms) identified and broken up
- [ ] Non-critical scripts loaded with `defer` or `async`
- [ ] Web Vitals tracked in production with real user monitoring
