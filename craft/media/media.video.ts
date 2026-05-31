/**
 * @keywords    video player, autoplay, IntersectionObserver, bandwidth detection, picture-in-picture, video progress, buffered ranges, NetworkInformation, prefers-reduced-motion, iOS Safari, mobile video, preload strategy, HLS, video chapters
 * @domain      Media — Video
 * @use-when    Any video that needs autoplay on scroll, bandwidth-aware quality, PiP toggle, buffered progress, or iOS inline playback
 * @not-when    Simple decorative backgrounds with autoplay and muted — a plain <video autoPlay muted playsInline> is enough
 */

import { useState, useEffect, useRef, useCallback, RefObject } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConnectionType = "slow-2g" | "2g" | "3g" | "4g" | "unknown";
export type PreloadStrategy = "none" | "metadata" | "auto";
export type VideoQuality = "low" | "medium" | "high";

export interface VideoPlayerState {
  playing: boolean;
  buffering: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  error: Error | null;
  ended: boolean;
}

export interface VideoPlayerControls {
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  retry: () => void;
}

export interface AutoplayOptions {
  rootMargin?: string;
  threshold?: number;
  respectReducedMotion?: boolean;
  resetOnExit?: boolean;
}

export interface BandwidthInfo {
  effectiveType: ConnectionType;
  downlink: number; // Mbps
  rtt: number;      // ms
  saveData: boolean;
  quality: VideoQuality;
}

export interface VideoChapter {
  start: number;  // seconds
  end: number;
  title: string;
}

export interface VideoProgressState {
  currentTime: number;
  duration: number;
  bufferedRanges: Array<{ start: number; end: number }>;
  bufferedPercent: number;
  playedPercent: number;
  activeChapter: VideoChapter | null;
}

// ─── useVideoPlayer — Full playback control with retry ───────────────────────
// Wraps <video> ref with state sync + error recovery. Never use raw event handlers.

export function useVideoPlayer(
  ref: RefObject<HTMLVideoElement>,
  maxRetries: number = 3
): { state: VideoPlayerState; controls: VideoPlayerControls } {
  const [state, setState] = useState<VideoPlayerState>({
    playing: false,
    buffering: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    muted: false,
    error: null,
    ended: false,
  });

  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);

  const update = useCallback(<K extends keyof VideoPlayerState>(
    key: K,
    value: VideoPlayerState[K]
  ) => {
    if (mountedRef.current) setState((s) => ({ ...s, [key]: value }));
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const el = ref.current;
    if (!el) return;

    const handlers: Partial<Record<string, () => void>> = {
      playing:    () => update("playing",   true),
      pause:      () => update("playing",   false),
      waiting:    () => update("buffering", true),
      canplay:    () => update("buffering", false),
      ended:      () => { update("playing", false); update("ended", true); },
      volumechange: () => {
        update("volume", el.volume);
        update("muted",  el.muted);
      },
      timeupdate: () => update("currentTime", el.currentTime),
      durationchange: () => update("duration", el.duration),
      error: () => {
        const err = new Error(
          el.error?.message ?? "Unknown video error"
        );
        update("error", err);
        update("buffering", false);
      },
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      el.addEventListener(event, handler as EventListener);
    });

    return () => {
      mountedRef.current = false;
      Object.entries(handlers).forEach(([event, handler]) => {
        el.removeEventListener(event, handler as EventListener);
      });
    };
  }, [ref, update]);

  const controls: VideoPlayerControls = {
    play: async () => {
      const el = ref.current;
      if (!el) return;
      try {
        retryCountRef.current = 0;
        await el.play();
      } catch (e) {
        update("error", e as Error);
      }
    },

    pause: () => ref.current?.pause(),

    seek: (time) => {
      const el = ref.current;
      if (!el) return;
      // Clamp to valid range — seeking past duration causes silent failure
      el.currentTime = Math.max(0, Math.min(time, el.duration || 0));
    },

    setVolume: (v) => {
      const el = ref.current;
      if (!el) return;
      el.volume = Math.max(0, Math.min(1, v));
    },

    toggleMute: () => {
      const el = ref.current;
      if (!el) return;
      el.muted = !el.muted;
    },

    retry: async () => {
      const el = ref.current;
      if (!el || retryCountRef.current >= maxRetries) return;
      retryCountRef.current++;
      update("error", null);
      const currentTime = el.currentTime;
      el.load();
      el.currentTime = currentTime;
      await controls.play();
    },
  };

  return { state, controls };
}

// ─── useVideoAutoplay — IntersectionObserver-based autoplay ──────────────────
// Plays only when visible, pauses on exit. Respects prefers-reduced-motion.

export function useVideoAutoplay(
  ref: RefObject<HTMLVideoElement>,
  options: AutoplayOptions = {}
): { isPlaying: boolean } {
  const {
    rootMargin = "0px",
    threshold = 0.5,
    respectReducedMotion = true,
    resetOnExit = false,
  } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const reducedMotion =
    respectReducedMotion &&
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reducedMotion) return; // Honor accessibility preference
    if (typeof IntersectionObserver === "undefined") return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.play().then(() => setIsPlaying(true)).catch(() => {
              // Autoplay blocked — silently fail, don't show error UI
            });
          } else {
            el.pause();
            setIsPlaying(false);
            if (resetOnExit) el.currentTime = 0;
          }
        });
      },
      { rootMargin, threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, threshold, reducedMotion, resetOnExit]);

  return { isPlaying };
}

// ─── useBandwidthDetection — NetworkInformation API wrapper ──────────────────
// Maps connection type to a quality decision signal. Not a promise — reactive.

export function useBandwidthDetection(): BandwidthInfo {
  const getInfo = useCallback((): BandwidthInfo => {
    if (typeof navigator === "undefined") {
      return { effectiveType: "unknown", downlink: 0, rtt: 0, saveData: false, quality: "medium" };
    }

    // NetworkInformation API is not yet in TypeScript lib — cast safely
    const conn = (navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
        saveData?: boolean;
      };
    }).connection;

    const effectiveType = (conn?.effectiveType ?? "unknown") as ConnectionType;
    const downlink = conn?.downlink ?? 0;
    const rtt = conn?.rtt ?? 0;
    const saveData = conn?.saveData ?? false;

    let quality: VideoQuality = "high";
    if (saveData || effectiveType === "slow-2g" || effectiveType === "2g") quality = "low";
    else if (effectiveType === "3g" || downlink < 2) quality = "medium";

    return { effectiveType, downlink, rtt, saveData, quality };
  }, []);

  const [info, setInfo] = useState<BandwidthInfo>(getInfo);

  useEffect(() => {
    const conn = (navigator as Navigator & {
      connection?: EventTarget & { addEventListener: (e: string, cb: () => void) => void; removeEventListener: (e: string, cb: () => void) => void };
    }).connection;

    if (!conn) return;

    const onChange = () => setInfo(getInfo());
    conn.addEventListener("change", onChange);
    return () => conn.removeEventListener("change", onChange);
  }, [getInfo]);

  return info;
}

// ─── VideoPreloader — Metadata or full preload with abort ─────────────────────

export class VideoPreloader {
  private abortControllers = new Map<string, AbortController>();

  preload(src: string, strategy: PreloadStrategy = "metadata"): Promise<void> {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      this.abortControllers.set(src, controller);

      const video = document.createElement("video");
      video.preload = strategy;
      video.muted = true;

      const cleanup = () => {
        video.onloadedmetadata = null;
        video.oncanplaythrough = null;
        video.onerror = null;
        this.abortControllers.delete(src);
      };

      const onReady = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error(`Preload failed: ${src}`)); };

      // Abort = remove from DOM without loading more
      controller.signal.addEventListener("abort", () => {
        video.src = "";
        video.load();
        cleanup();
        reject(new DOMException("Preload aborted", "AbortError"));
      });

      if (strategy === "metadata") {
        video.onloadedmetadata = onReady;
      } else {
        video.oncanplaythrough = onReady;
      }

      video.onerror = onError;
      video.src = src;
    });
  }

  abort(src: string): void {
    this.abortControllers.get(src)?.abort();
  }

  abortAll(): void {
    this.abortControllers.forEach((ctrl) => ctrl.abort());
    this.abortControllers.clear();
  }
}

// ─── usePictureInPicture — PiP API with graceful fallback ────────────────────

export interface PiPControls {
  supported: boolean;
  active: boolean;
  enter: () => Promise<void>;
  exit: () => Promise<void>;
  toggle: () => Promise<void>;
}

export function usePictureInPicture(ref: RefObject<HTMLVideoElement>): PiPControls {
  const [active, setActive] = useState(false);
  const supported =
    typeof document !== "undefined" &&
    "pictureInPictureEnabled" in document &&
    document.pictureInPictureEnabled;

  useEffect(() => {
    const el = ref.current;
    if (!el || !supported) return;

    const onEnter = () => setActive(true);
    const onExit  = () => setActive(false);

    el.addEventListener("enterpictureinpicture", onEnter);
    el.addEventListener("leavepictureinpicture", onExit);

    return () => {
      el.removeEventListener("enterpictureinpicture", onEnter);
      el.removeEventListener("leavepictureinpicture", onExit);
    };
  }, [ref, supported]);

  const enter = useCallback(async () => {
    const el = ref.current;
    if (!el || !supported) return;
    await el.requestPictureInPicture().catch(() => {});
  }, [ref, supported]);

  const exit = useCallback(async () => {
    if (!document.pictureInPictureElement) return;
    await document.exitPictureInPicture().catch(() => {});
  }, []);

  const toggle = useCallback(async () => {
    active ? await exit() : await enter();
  }, [active, enter, exit]);

  return { supported, active, enter, exit, toggle };
}

// ─── useVideoProgress — Buffered ranges + chapter tracking ───────────────────

export function useVideoProgress(
  ref: RefObject<HTMLVideoElement>,
  chapters: VideoChapter[] = []
): VideoProgressState {
  const [state, setState] = useState<VideoProgressState>({
    currentTime: 0,
    duration: 0,
    bufferedRanges: [],
    bufferedPercent: 0,
    playedPercent: 0,
    activeChapter: null,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const sync = () => {
      const duration = el.duration || 0;
      const currentTime = el.currentTime;

      // Extract all buffered ranges into a plain array
      const bufferedRanges: Array<{ start: number; end: number }> = [];
      for (let i = 0; i < el.buffered.length; i++) {
        bufferedRanges.push({ start: el.buffered.start(i), end: el.buffered.end(i) });
      }

      // Total buffered: use the range containing currentTime, fallback to last range
      const activeBufferRange = bufferedRanges.find(
        (r) => r.start <= currentTime && r.end >= currentTime
      );
      const bufferedPercent =
        duration > 0 ? ((activeBufferRange?.end ?? 0) / duration) * 100 : 0;

      const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

      const activeChapter =
        chapters.find((c) => currentTime >= c.start && currentTime < c.end) ?? null;

      setState({ currentTime, duration, bufferedRanges, bufferedPercent, playedPercent, activeChapter });
    };

    el.addEventListener("timeupdate",      sync);
    el.addEventListener("progress",        sync);
    el.addEventListener("durationchange",  sync);

    return () => {
      el.removeEventListener("timeupdate",     sync);
      el.removeEventListener("progress",       sync);
      el.removeEventListener("durationchange", sync);
    };
  }, [ref, chapters]);

  return state;
}

/*
 * Usage Examples:
 *
 * // Full player with controls
 * const videoRef = useRef<HTMLVideoElement>(null);
 * const { state, controls } = useVideoPlayer(videoRef);
 * <video ref={videoRef} src={src} playsInline />
 * <button onClick={() => state.playing ? controls.pause() : controls.play()}>Toggle</button>
 *
 * // Autoplay on scroll (Instagram-style feed)
 * const videoRef = useRef<HTMLVideoElement>(null);
 * useVideoAutoplay(videoRef, { threshold: 0.6, resetOnExit: true });
 * <video ref={videoRef} src={src} muted playsInline loop />
 *
 * // Quality switching based on connection
 * const { quality, saveData } = useBandwidthDetection();
 * const src = quality === "high" ? "/video-1080.mp4" : quality === "medium" ? "/video-480.mp4" : "/video-240.mp4";
 *
 * // Picture-in-Picture button
 * const { supported, active, toggle } = usePictureInPicture(videoRef);
 * {supported && <button onClick={toggle}>{active ? "Exit PiP" : "PiP"}</button>}
 *
 * // Chapter display
 * const chapters = [{ start: 0, end: 30, title: "Intro" }, { start: 30, end: 90, title: "Main" }];
 * const { activeChapter, playedPercent } = useVideoProgress(videoRef, chapters);
 * <span>{activeChapter?.title}</span>
 *
 * // iOS inline video (required attributes — missing any breaks iOS Safari)
 * <video ref={videoRef} src={src} playsInline muted autoPlay loop />
 */
