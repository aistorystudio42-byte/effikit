<!-- @keywords: media optimization, Core Web Vitals, LCP, CLS, media budget, build-time optimization, runtime optimization, SVG pipeline, video compression, Lighthouse, image pipeline -->

# Media — Media as the #1 Performance Killer

## Core Philosophy

Media is responsible for 60-80% of page weight on the average site. Text, JavaScript, and CSS are optimized obsessively while a 4MB JPEG sits in the hero slot. Fix the media, and Lighthouse scores move more than any code optimization ever will.

The constraint is not quality — it's **budget**. Define a media budget per page type, enforce it at build time, and treat every violation as a blocking bug.

---

## When to Activate

- Lighthouse performance score below 70
- LCP above 2.5 seconds
- Page weight above 2MB on mobile
- Images in production that weren't processed at build time
- Video files served from the same origin as the app (not CDN)

---

## Principles

**1. LCP image is the single highest-priority optimization.** Find it with DevTools → Performance → LCP. Then: preload it, serve it at the right size, use modern format. This one change moves LCP more than anything else.

**2. Enforce a media budget.** Set hard limits per page type: hero page ≤ 1.5MB total media, product page ≤ 2MB, blog post ≤ 800KB. Treat budget overages as build failures.

**3. Build-time over runtime.** Process images at build time with sharp, imagemin, or Squoosh. Runtime optimization (client-side canvas resize) is slow, synchronous, and never as good. If you're resizing in the browser, you've already lost.

**4. SVG is code, not an image.** Inline SVGs that are used more than twice. Use `<use>` with `<symbol>` for repeated icons. Run all SVGs through SVGO — it removes 40-70% of file size from editor exports.

**5. Video compression target: 1MB per minute at 1080p.** Use H.264 for maximum compatibility, H.265/HEVC for Apple devices, AV1 for modern browsers with highest quality/size ratio. ffmpeg with CRF 23-28 for H.264 is the production standard.

---

## Decision Framework

```
What is the Lighthouse LCP score?
├── > 2.5s → find LCP element, preload it, serve correct size/format
├── 2.5-4s → preload link in <head>, fetchpriority="high" on img
└── > 4s   → server response time + LCP both need fixing

Where are images processed?
├── Build time (sharp, next/image, Cloudinary) → correct
├── Runtime (canvas, browser) → move to build time
└── Not processed → add build pipeline immediately

What format are images being served?
├── AVIF → correct, maximum compression
├── WebP → acceptable, add AVIF fallback
├── JPEG/PNG only → add format pipeline, 30-50% savings waiting
└── BMP/TIFF/GIF (non-animated) → immediate conversion required

What is the video file size?
├── < 1MB/min at target quality → acceptable
├── 1-5MB/min → re-encode with ffmpeg CRF 23
└── > 5MB/min → blocking issue, serve lower quality or use streaming
```

---

## Anti-Patterns

- Uploading raw camera images (5-20MB) without processing
- Serving PNG when JPEG or WebP is identical visually
- Not using a CDN for media — origin server adds 200-500ms per asset
- Animated GIF for video content — GIF is 3-10× larger than MP4
- SVGs not run through SVGO — Illustrator exports contain 60% waste
- Setting `quality=100` in image processors — perceptual quality difference above 80 is invisible
- Ignoring mobile viewport — serving 1600px images to 375px screens
- Media loaded via JavaScript on first paint — parser-blocking, not preloadable

---

## Example in Action

Fix a media-heavy page from Lighthouse 40 to 90+:

**Step 1 — Audit what you have**
```bash
# Find all images above 100KB
find ./public -name "*.jpg" -o -name "*.png" | xargs ls -la | awk '$5 > 102400'

# Check actual vs displayed dimensions in DevTools
# Network tab → filter Images → check "Size" column
```

**Step 2 — Add build-time image pipeline**
```ts
// scripts/optimize-images.ts
import sharp from 'sharp';
import { readdir, mkdir } from 'fs/promises';
import path from 'path';

const INPUT = './public/images/raw';
const OUTPUT = './public/images/optimized';
const WIDTHS = [400, 800, 1200, 1600];

async function processImage(file: string) {
  const name = path.parse(file).name;
  await mkdir(OUTPUT, { recursive: true });

  for (const width of WIDTHS) {
    // WebP
    await sharp(`${INPUT}/${file}`)
      .resize(width, null, { withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(`${OUTPUT}/${name}-${width}.webp`);

    // AVIF — slower encode, worth it for production
    await sharp(`${INPUT}/${file}`)
      .resize(width, null, { withoutEnlargement: true })
      .avif({ quality: 65 }) // AVIF quality scale is different
      .toFile(`${OUTPUT}/${name}-${width}.avif`);
  }
}

const files = await readdir(INPUT);
await Promise.all(files.filter(f => /\.(jpg|jpeg|png)$/i.test(f)).map(processImage));
console.log(`Processed ${files.length} images`);
```

**Step 3 — Add LCP preload**
```html
<!-- In <head>, before any scripts -->
<link
  rel="preload"
  as="image"
  href="/images/optimized/hero-1200.webp"
  imagesrcset="/images/optimized/hero-400.webp 400w, /images/optimized/hero-800.webp 800w, /images/optimized/hero-1200.webp 1200w"
  imagesizes="100vw"
>
```

**Step 4 — SVG pipeline**
```bash
# Install SVGO
npm install -g svgo

# Process all SVGs
svgo --recursive ./public/icons --output ./public/icons/optimized

# Typical result: 40-70% size reduction
```

**Step 5 — Video re-encoding**
```bash
# H.264 for universal compatibility
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset slow -c:a aac -b:a 128k output.mp4

# AVIF/AV1 for modern browsers (smaller, slower encode)
ffmpeg -i input.mp4 -c:v libaom-av1 -crf 32 -b:v 0 output-av1.mp4

# Strip audio for background/hero videos
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -an output-muted.mp4
```

**Expected results after all steps:**
- Page weight: 4.2MB → 900KB (mobile)
- LCP: 4.8s → 1.6s
- Lighthouse: 42 → 91
- CLS: 0.18 → 0.02 (from adding width/height attributes)
