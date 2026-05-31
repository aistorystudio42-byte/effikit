<!-- @keywords: image, lazy loading, blur hash, WebP, AVIF, srcset, responsive image, CLS, progressive loading, placeholder, format detection, performance -->

# Media — Images as Performance-Critical Assets

## Core Philosophy

Every image is a performance tax. The question is not "should I optimize?" but "what is the minimum cost to deliver this image at acceptable quality?" Treat images as infrastructure, not content — they obey the same rules as code: measure, constrain, ship.

The browser will load what you give it. Give it wrong sizes, wrong formats, or no placeholders, and users pay the bill in Largest Contentful Paint and layout shift. You don't get a second chance at a first impression on a 3G connection.

---

## When to Activate

- Any page with more than one image above the fold
- LCP image needs optimization
- Cumulative Layout Shift (CLS) score is above 0.1
- Images are blocking time-to-interactive
- Hero images, product galleries, avatars, thumbnails

---

## Principles

**1. Declare dimensions always.** Width and height on every `<img>` prevents CLS. The browser reserves space before the image loads. No exceptions.

**2. Lazy load below the fold.** Everything below the initial viewport gets `loading="lazy"`. LCP image never gets `loading="lazy"` — it gets `fetchpriority="high"`.

**3. Serve modern formats with fallback.** AVIF → WebP → JPEG/PNG. Use `<picture>` with `<source>` elements. Never force AVIF on Safari < 16.

**4. Blur hash placeholder over spinners.** A blurred preview of the actual image is cognitively faster than a spinner. Users recognize content before it fully loads.

**5. Responsive srcset, not fixed width.** The image that looks perfect on desktop is 4× too large on mobile. Generate srcset at 400w, 800w, 1200w, 1600w minimum.

---

## Decision Framework

```
Is this image above the fold?
├── YES → fetchpriority="high", no lazy loading, preload link in <head>
└── NO  → loading="lazy", rootMargin="200px 0px" for early trigger

Does the browser support AVIF?
├── YES → serve AVIF (40-50% smaller than WebP)
└── NO  → Does it support WebP?
    ├── YES → serve WebP (25-35% smaller than JPEG)
    └── NO  → serve optimized JPEG/PNG

Is there a risk of layout shift?
├── YES → aspect-ratio CSS on container, explicit width/height on img
└── NO  → verify with real device throttling, then skip

Is this a hero/LCP image?
├── YES → blur hash placeholder + instant swap on load
└── NO  → low-quality image placeholder (LQIP) or solid color background
```

---

## Anti-Patterns

**Never do this:**
- `<img src="image.jpg">` with no width, height, or aspect ratio — instant CLS
- Loading all images on mount — kills TTI on image-heavy pages
- Using JPEG for images with transparency — use WebP or PNG
- Setting `loading="lazy"` on LCP image — delays the most important render
- Serving 2000px images when max display width is 400px
- Using `object-fit: contain` when you mean `cover` — causes unexpected whitespace
- Generating srcset client-side — do it at build time or CDN level

---

## Example in Action

Production-grade responsive image system with blur hash placeholder:

```tsx
import { useState, useRef, useEffect } from 'react';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  blurHash?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}

// Build srcset for common breakpoints
function buildSrcSet(src: string, widths: number[]): string {
  return widths
    .map(w => `${src}?w=${w}&fmt=auto ${w}w`)
    .join(', ');
}

// Canvas-based AVIF/WebP detection — run once, cache result
const formatSupport = {
  avif: null as boolean | null,
  webp: null as boolean | null,
};

async function detectFormat(format: 'avif' | 'webp'): Promise<boolean> {
  if (formatSupport[format] !== null) return formatSupport[format]!;
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => { formatSupport[format] = true; resolve(true); };
    img.onerror = () => { formatSupport[format] = false; resolve(false); };
    img.src = format === 'avif'
      ? 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQ=='
      : 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJZQCdAEO/gHOAAA=';
  });
}

export function ResponsiveImage({
  src,
  alt,
  width,
  height,
  blurHash,
  priority = false,
  sizes = '100vw',
  className,
}: ResponsiveImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [bestFormat, setBestFormat] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    detectFormat('avif').then(avif => {
      if (avif) { setBestFormat('avif'); return; }
      detectFormat('webp').then(webp => {
        setBestFormat(webp ? 'webp' : 'jpeg');
      });
    });
  }, []);

  const aspectRatio = `${width} / ${height}`;
  const srcSet = buildSrcSet(src, [400, 800, 1200, 1600]);

  return (
    <div
      style={{ position: 'relative', aspectRatio, width: '100%', overflow: 'hidden' }}
    >
      {/* Blur hash placeholder — visible until image loads */}
      {blurHash && !loaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${blurHash})`,
            backgroundSize: 'cover',
            filter: 'blur(20px)',
            transform: 'scale(1.1)', // prevent blur edge bleed
          }}
          aria-hidden="true"
        />
      )}

      <picture>
        {bestFormat === 'avif' && (
          <source srcSet={srcSet.replace(/fmt=auto/g, 'fmt=avif')} type="image/avif" sizes={sizes} />
        )}
        {(bestFormat === 'avif' || bestFormat === 'webp') && (
          <source srcSet={srcSet.replace(/fmt=auto/g, 'fmt=webp')} type="image/webp" sizes={sizes} />
        )}
        <img
          ref={imgRef}
          src={`${src}?w=800&fmt=auto`}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding={priority ? 'sync' : 'async'}
          onLoad={() => setLoaded(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
          className={className}
        />
      </picture>
    </div>
  );
}

// Usage:
// <ResponsiveImage
//   src="/images/hero.jpg"
//   alt="Hero image"
//   width={1200}
//   height={630}
//   blurHash="data:image/jpeg;base64,/9j/4AAQ..."
//   priority={true}
//   sizes="(max-width: 768px) 100vw, 1200px"
// />
```
