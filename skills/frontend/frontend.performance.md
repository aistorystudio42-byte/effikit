<!-- @keywords: performance, lazy loading, code splitting, bundle size, render optimization, web vitals -->

# Check for duplicate packages

## Core Philosophy

Performance optimization without measurement is guesswork. Target real user metrics:

```
LCP  (Largest Contentful Paint)  → < 2.5s   — loading speed
FID  (First Input Delay)         → < 100ms  — interactivity
CLS  (Cumulative Layout Shift)   → < 0.1    — visual stability
INP  (Interaction to Next Paint) → < 200ms  — responsiveness
TTFB (Time to First Byte)        → < 800ms  — server response
```

Measure with: Chrome DevTools > Lighthouse, `web-vitals` library, Real User Monitoring (RUM).

---

## When to Activate

> This skill should be activated when you need to resolve issues related to performance.

## Principles

### Bundle Optimization
### Code Splitting — Route Level
```tsx
import { lazy, Suspense } from 'react';

// Each route loads its own chunk — initial bundle stays small
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const AnalyticsPage = lazy(() => import('./pages/Analytics'));

const App = () => (
  <Suspense fallback={<PageSkeleton />}>
    <Routes>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  </Suspense>
);
```

### Component-Level Splitting
```tsx
// Heavy component loaded only when needed
const RichTextEditor = lazy(() => import('./RichTextEditor'));
const DataVisualization = lazy(() => import('./DataVisualization'));

// Conditional load — don't load what user won't see
const HeavyModal = lazy(() => import('./HeavyModal'));

const Page = () => {
  const [showModal, setShowModal] = useState(false);
  return (
    <>
      <button onClick={() => setShowModal(true)}>Open</button>
      {showModal && (
        <Suspense fallback={<ModalSkeleton />}>
          <HeavyModal onClose={() => setShowModal(false)} />
        </Suspense>
      )}
    </>
  );
};
```

### Bundle Analysis
```bash
npx vite-bundle-analyzer
npx webpack-bundle-analyzer

npx duplicate-package-checker-webpack-plugin
```

---

### Render Optimization
### Virtualization — Long Lists
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const VirtualList = ({ items }: { items: Item[] }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // estimated row height in px
    overscan: 5,            // render 5 extra items outside viewport
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              transform: `translateY(${virtualItem.start}px)`,
              height: `${virtualItem.size}px`,
            }}
          >
            <ItemRow item={items[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

**Rule:** If a list has more than 100 items and scrolls, virtualize it.

### Memoization Decision Tree
```
Is this component re-rendering unnecessarily?
  → Profile first (React DevTools Profiler)
  → If yes: is re-render caused by parent or prop changes?

Props change frequently (on every parent render)?
  → memo() won't help — the props are different anyway

Props are stable but parent re-renders often?
  → memo() helps — wraps shallow comparison

Expensive calculation inside component?
  → useMemo() for the result

Callback passed to memoized child?
  → useCallback() to stabilize reference
```

---

### Image Optimization
```tsx
// Next.js Image component — automatic optimization
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority      // LCP image — preload it
  placeholder="blur"
  blurDataURL={blurDataUrl}
/>

// Non-critical images: lazy load (default behavior)
<Image
  src="/feature.jpg"
  alt="Feature"
  width={600}
  height={400}
  loading="lazy"  // default, explicit for clarity
/>
```

### Responsive Images
```tsx
// Different sizes for different viewports
<Image
  src="/hero.jpg"
  alt="Hero"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  fill
  style={{ objectFit: 'cover' }}
/>
```

---

### Data Fetching Performance
### Prefetching
```tsx
// Prefetch on hover — data ready when user clicks
const router = useRouter();

<Link
  href="/dashboard"
  onMouseEnter={() => router.prefetch('/dashboard')}
>
  Dashboard
</Link>

// React Query prefetch
const queryClient = useQueryClient();

const prefetchUser = (userId: string) =>
  queryClient.prefetchQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 10 * 60 * 1000,
  });
```

### Suspense + Concurrent Features
```tsx
// Stream data as it arrives — don't wait for everything
const Page = () => (
  <div>
    <HeroSection />  {/* Loads immediately */}
    <Suspense fallback={<StatsSkeleton />}>
      <StatsSection />  {/* Streams when ready */}
    </Suspense>
    <Suspense fallback={<FeedSkeleton />}>
      <FeedSection />   {/* Independent stream */}
    </Suspense>
  </div>
);
```

---

### CSS Performance
```tsx
// Avoid layout thrashing — batch DOM reads and writes
// Wrong: Read-write-read-write pattern
const width = el.offsetWidth;       // read (forces layout)
el.style.width = width + 'px';      // write
const height = el.offsetHeight;     // read (forces layout again)
el.style.height = height + 'px';    // write

// Correct: Batch reads, then writes
const width = el.offsetWidth;       // read
const height = el.offsetHeight;     // read
el.style.width = width + 'px';      // write
el.style.height = height + 'px';    // write

// Use transform/opacity for animations — GPU-accelerated
// Wrong: Animating top/left (triggers layout)
// Correct: Animating transform: translateX/Y (no layout)
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

- [ ] Lighthouse score > 90 on production build
- [ ] Routes are code-split
- [ ] Images use modern formats (WebP, AVIF) and are properly sized
- [ ] Lists with 100+ items are virtualized
- [ ] No unnecessary re-renders in React DevTools Profiler
- [ ] Third-party scripts loaded with `async`/`defer` or dynamic import
- [ ] Fonts preloaded, `font-display: swap` applied
- [ ] Service Worker / cache strategy in place for static assets
