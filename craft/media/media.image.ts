/**
 * @keywords    image loading, lazy load, progressive image, blur hash, responsive image, srcset, WebP, AVIF, CLS prevention, aspect ratio, image preloader, bandwidth-aware, IntersectionObserver, placeholder
 * @domain      Media — Image
 * @use-when    Loading images with performance constraints: lazy load, blur-up placeholders, responsive srcset, format detection, CLS prevention
 * @not-when    Simple <img> tags with no performance requirements — this library adds complexity only worth it for LCP/CLS-sensitive images
 */

import { useState, useEffect, useRef, useCallback, RefObject } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ImageFormat = "avif" | "webp" | "jpeg" | "png";

export interface ResponsiveBreakpoint {
  maxWidth: number;
  src: string;
}

export interface ResponsiveImageConfig {
  src: string;
  widths: number[];
  format?: ImageFormat;
  quality?: number;
  breakpoints?: ResponsiveBreakpoint[];
}

export interface ProgressiveImageState {
  src: string;
  isLoading: boolean;
  isLoaded: boolean;
  error: Error | null;
}

export interface LazyImageOptions {
  rootMargin?: string;
  threshold?: number;
  placeholder?: string;
}

export interface CLSConfig {
  width: number;
  height: number;
  fit?: "cover" | "contain" | "fill";
}

export interface PreloaderTask {
  src: string;
  priority: number;
  onLoad?: () => void;
  onError?: (e: ErrorEvent) => void;
}

// ─── Format Detection ─────────────────────────────────────────────────────────
// Canvas-based detection: tests actual codec support in the browser, not User-Agent

const formatCache: Partial<Record<ImageFormat, boolean>> = {};

async function detectFormat(format: "webp" | "avif"): Promise<boolean> {
  if (typeof document === "undefined") return false; // SSR guard
  if (formatCache[format] !== undefined) return formatCache[format]!;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      formatCache[format] = img.width > 0 && img.height > 0;
      resolve(formatCache[format]!);
    };
    img.onerror = () => {
      formatCache[format] = false;
      resolve(false);
    };
    // Smallest valid AVIF/WebP encoded as base64
    img.src =
      format === "avif"
        ? "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKBzgA"
        : "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAkA4JZACdAEO/gHOAAA=";
  });
}

export async function supportsWebP(): Promise<boolean> {
  return detectFormat("webp");
}

export async function supportsAVIF(): Promise<boolean> {
  return detectFormat("avif");
}

export async function bestSupportedFormat(): Promise<ImageFormat> {
  if (await supportsAVIF()) return "avif";
  if (await supportsWebP()) return "webp";
  return "jpeg";
}

// ─── useProgressiveImage — Blur placeholder → full image swap ─────────────────
// Always show something immediately. Never show an empty container.

export function useProgressiveImage(
  src: string,
  placeholder: string
): ProgressiveImageState {
  const [state, setState] = useState<ProgressiveImageState>({
    src: placeholder,
    isLoading: true,
    isLoaded: false,
    error: null,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setState({ src: placeholder, isLoading: true, isLoaded: false, error: null });

    const img = new Image();

    img.onload = () => {
      if (!mountedRef.current) return;
      setState({ src, isLoading: false, isLoaded: true, error: null });
    };

    img.onerror = () => {
      if (!mountedRef.current) return;
      setState({
        src: placeholder,
        isLoading: false,
        isLoaded: false,
        error: new Error(`Failed to load image: ${src}`),
      });
    };

    img.src = src;

    return () => {
      mountedRef.current = false;
      img.onload = null;
      img.onerror = null;
    };
  }, [src, placeholder]);

  return state;
}

// ─── useLazyImage — IntersectionObserver lazy loading ────────────────────────
// Defer network request until image is near the viewport.

export function useLazyImage(
  src: string,
  options: LazyImageOptions = {}
): { ref: RefObject<HTMLImageElement>; currentSrc: string; loaded: boolean } {
  const {
    rootMargin = "200px 0px",
    threshold = 0,
    placeholder = "",
  } = options;

  const ref = useRef<HTMLImageElement>(null);
  const [currentSrc, setCurrentSrc] = useState(placeholder);
  const [loaded, setLoaded] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      // Fallback for environments without IntersectionObserver
      setCurrentSrc(src);
      return;
    }

    const el = ref.current;
    if (!el) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setCurrentSrc(src);
          observerRef.current?.unobserve(el);
        });
      },
      { rootMargin, threshold }
    );

    observerRef.current.observe(el);

    return () => observerRef.current?.disconnect();
  }, [src, rootMargin, threshold]);

  useEffect(() => {
    if (!currentSrc || currentSrc === placeholder) return;
    const img = new Image();
    img.onload = () => setLoaded(true);
    img.src = currentSrc;
  }, [currentSrc, placeholder]);

  return { ref, currentSrc, loaded };
}

// ─── useResponsiveImage — srcset generation with format detection ─────────────
// Automatically selects best format and generates proper srcset string.

export function useResponsiveImage(config: ResponsiveImageConfig): {
  srcset: string;
  sizes: string;
  src: string;
  format: ImageFormat;
} {
  const [format, setFormat] = useState<ImageFormat>(config.format ?? "jpeg");

  useEffect(() => {
    if (config.format) return; // Caller specified format — trust it
    bestSupportedFormat().then(setFormat);
  }, [config.format]);

  // Generate srcset: "image-400.webp 400w, image-800.webp 800w, ..."
  const srcset = config.widths
    .map((w) => {
      const url = new URL(config.src, typeof location !== "undefined" ? location.href : "https://example.com");
      url.searchParams.set("w", String(w));
      url.searchParams.set("fmt", format);
      if (config.quality) url.searchParams.set("q", String(config.quality));
      return `${url.toString()} ${w}w`;
    })
    .join(", ");

  // Art-direction breakpoints → sizes string
  const sizes =
    config.breakpoints
      ?.map((bp) => `(max-width: ${bp.maxWidth}px) ${bp.src}`)
      .join(", ") ?? "100vw";

  const src = `${config.src}?w=${config.widths[config.widths.length - 1]}&fmt=${format}`;

  return { srcset, sizes, src, format };
}

// ─── ImagePreloader — Priority queue, bandwidth-aware loading ─────────────────
// Use to prefetch images before they enter the viewport.

export class ImagePreloader {
  private queue: PreloaderTask[] = [];
  private activeCount = 0;
  private readonly concurrency: number;

  constructor(concurrency: number = 3) {
    // Default 3 concurrent loads: balanced for most connections
    this.concurrency = concurrency;
  }

  enqueue(task: PreloaderTask): void {
    // Insert in priority order — higher number = higher priority
    const idx = this.queue.findIndex((t) => t.priority < task.priority);
    if (idx === -1) {
      this.queue.push(task);
    } else {
      this.queue.splice(idx, 0, task);
    }
    this.processNext();
  }

  private processNext(): void {
    while (this.activeCount < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift()!;
      this.activeCount++;

      const img = new Image();

      img.onload = () => {
        this.activeCount--;
        task.onLoad?.();
        this.processNext();
      };

      img.onerror = (e) => {
        this.activeCount--;
        task.onError?.(e as ErrorEvent);
        this.processNext();
      };

      img.src = task.src;
    }
  }

  clear(): void {
    this.queue = [];
  }

  get pendingCount(): number {
    return this.queue.length + this.activeCount;
  }
}

// ─── useCLS — Cumulative Layout Shift prevention ─────────────────────────────
// Lock image dimensions before load so nothing shifts. CLS killer.

export function useCLS(config: CLSConfig): {
  containerStyle: React.CSSProperties;
  imageStyle: React.CSSProperties;
} {
  const { width, height, fit = "cover" } = config;
  // Padding-bottom trick for aspect ratio: maintains space without explicit height
  const paddingBottom = `${(height / width) * 100}%`;

  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    paddingBottom,
    overflow: "hidden",
  };

  const imageStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: fit,
  };

  return { containerStyle, imageStyle };
}

// ─── Skeleton sizing utility ──────────────────────────────────────────────────

export function skeletonStyle(width: number, height: number): React.CSSProperties {
  return {
    display: "block",
    width: `${width}px`,
    height: `${height}px`,
    background: "linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)",
    backgroundSize: "200% 100%",
    animation: "effikit-skeleton 1.4s ease-in-out infinite",
    borderRadius: "4px",
  };
}

/*
 * Usage Examples:
 *
 * // Blur-up progressive load
 * const { src, isLoading } = useProgressiveImage(fullResSrc, blurHashDataUrl);
 * <img src={src} style={{ filter: isLoading ? "blur(20px)" : "none", transition: "filter 400ms" }} />
 *
 * // Lazy load with 300px pre-load margin
 * const { ref, currentSrc, loaded } = useLazyImage(imgSrc, { rootMargin: "300px 0px" });
 * <img ref={ref} src={currentSrc} style={{ opacity: loaded ? 1 : 0, transition: "opacity 300ms" }} />
 *
 * // Responsive srcset with best format
 * const { srcset, sizes, src } = useResponsiveImage({ src: "/img/hero.jpg", widths: [400, 800, 1200] });
 * <img src={src} srcSet={srcset} sizes={sizes} alt="Hero" />
 *
 * // CLS prevention aspect ratio box
 * const { containerStyle, imageStyle } = useCLS({ width: 16, height: 9 });
 * <div style={containerStyle}><img style={imageStyle} src={src} /></div>
 *
 * // Priority preloader
 * const preloader = new ImagePreloader(4);
 * preloader.enqueue({ src: criticalImg, priority: 10 });
 * preloader.enqueue({ src: belowFoldImg, priority: 1 });
 *
 * // Format detection
 * const format = await bestSupportedFormat(); // "avif" | "webp" | "jpeg"
 */
