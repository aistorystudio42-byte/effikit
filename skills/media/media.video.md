<!-- @keywords: video, autoplay, bandwidth detection, preload, picture-in-picture, poster, Core Web Vitals, intersection observer, mobile video, hero video -->

# Media — Video That Loads Fast Without Destroying UX

## Core Philosophy

Video is the most dangerous asset on any page. Autoplay kills bandwidth. Wrong preload kills LCP. No poster kills perceived performance. One unoptimized hero video can single-handedly push Lighthouse from 80 to 40.

The rule: video starts loading when the user is about to see it, not when the page loads. Everything else is negotiable.

---

**1. Intersection-based autoplay, not page-load autoplay.** Autoplay on page load downloads video before the user sees it. Use IntersectionObserver to trigger play when 50% of the video is visible.

**2. Poster image is mandatory.** A poster image shows instantly while video buffers. Without it, users see a black rectangle. The poster should be the first frame or a representative still.

**3. Preload strategy by context:**
- `preload="none"` — content feed, multiple videos on page
- `preload="metadata"` — single video, user likely to play
- `preload="auto"` — hero video that will autoplay, paid WiFi assumed

**4. Respect prefers-reduced-motion.** Users who set this preference get static poster instead of autoplay. No exceptions.

**5. Mobile Safari demands inline playback.** `playsinline` attribute is required for iOS autoplay. Without it, video opens fullscreen and kills the UX.

---

## When to Activate

- Hero section with background video
- Content feed with inline video previews
- Product demos that autoplay on scroll
- Interactive video players with custom controls
- Any page where video is above or near the fold

---

## Principles

## Decision Framework

```
Is there more than one video on the page?
├── YES → preload="none" for all, lazy-load src itself
└── NO  → Is it a hero/background video?
    ├── YES → preload="metadata", autoplay on visibility
    └── NO  → preload="none", play on user click only

Does the user have prefers-reduced-motion?
├── YES → show poster image only, no autoplay ever
└── NO  → proceed with autoplay strategy

What is the effective connection type?
├── 4g → full quality, preload="metadata"
├── 3g → lower quality source, preload="none"
└── 2g/slow-2g → show poster only, offer manual play
```

---

## Anti-Patterns

- `autoplay` without `muted` — browsers block it, video never plays
- No `poster` attribute — black flash before video loads
- `preload="auto"` on every video — downloads gigabytes on page load
- No `playsinline` — iOS opens fullscreen, breaks layout
- Autoplay on page load regardless of viewport — mobile data destroyed
- Playing video when tab is hidden — MediaSession waste, battery drain
- No bandwidth check — serving 1080p to 2G connection

---

## Example in Action

Hero video section that doesn't tank Core Web Vitals:

```tsx
import { useRef, useEffect, useState } from 'react';

interface HeroVideoProps {
  src: string;
  srcMobile?: string;
  poster: string;
  reducedMotionPoster?: string;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

function getEffectiveConnectionType(): string {
  const nav = navigator as Navigator & {
    connection?: { effectiveType: string };
  };
  return nav.connection?.effectiveType ?? '4g';
}

export function HeroVideo({ src, srcMobile, poster, reducedMotionPoster }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [canAutoplay, setCanAutoplay] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  // Determine best source based on screen and bandwidth
  const videoSrc = (() => {
    if (reducedMotion) return null;
    const connection = getEffectiveConnectionType();
    if (connection === '2g' || connection === 'slow-2g') return null;
    if (srcMobile && window.innerWidth < 768) return srcMobile;
    return src;
  })();

  useEffect(() => {
    if (!videoRef.current || !videoSrc) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.5 }
    );

    observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, [videoSrc]);

  useEffect(() => {
    if (!videoRef.current || !isVisible || !videoSrc) return;
    const video = videoRef.current;

    // Autoplay policy test — attempt and catch rejection
    video.play()
      .then(() => setCanAutoplay(true))
      .catch(() => setCanAutoplay(false));

    return () => {
      video.pause();
    };
  }, [isVisible, videoSrc]);

  // Pause when tab is hidden
  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const handleVisibility = () => {
      if (document.hidden) video.pause();
      else if (isVisible && canAutoplay) video.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isVisible, canAutoplay]);

  if (!videoSrc) {
    return (
      <div style={{ width: '100%', aspectRatio: '16/9', position: 'relative' }}>
        <img
          src={reducedMotionPoster ?? poster}
          alt=""
          aria-hidden="true"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
      aria-hidden="true"
    >
      <source src={videoSrc} type="video/mp4" />
    </video>
  );
}

// Usage:
// <HeroVideo
//   src="/videos/hero-desktop.mp4"
//   srcMobile="/videos/hero-mobile.mp4"
//   poster="/images/hero-poster.jpg"
//   reducedMotionPoster="/images/hero-still.jpg"
// />
```
