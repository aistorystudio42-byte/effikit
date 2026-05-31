/**
 * @keywords    Web Audio API, AudioContext, audio player, audio visualizer, AnalyserNode, spatial audio, PannerNode, AudioWorklet, MediaRecorder, audio recorder, microphone, crossfade, waveform, frequency data, SoundBoard, mobile audio
 * @domain      Media — Audio
 * @use-when    Web Audio API: visualizers, players with crossfade, spatial audio, real-time microphone processing, audio worklets, or multi-sound boards
 * @not-when    Simple <audio> element playback — use HTMLAudioElement directly; AudioContext adds startup latency for basic use cases
 */

import { useState, useEffect, useRef, useCallback, RefObject } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AudioContextState = "suspended" | "running" | "closed";
export type DistanceModel = "linear" | "inverse" | "exponential";
export type RecordingFormat = "audio/webm" | "audio/ogg" | "audio/mp4";

export interface AudioEngineOptions {
  sampleRate?: number;
  latencyHint?: AudioContextLatencyCategory;
}

export interface VisualizerOptions {
  fftSize?: number;         // Must be power of 2: 32–32768
  smoothing?: number;       // 0.0–1.0
  type?: "frequency" | "waveform";
}

export interface AudioPlayerOptions {
  loop?: boolean;
  playbackRate?: number;
  crossfadeDuration?: number; // seconds
}

export interface SpatialConfig {
  x: number;
  y: number;
  z: number;
  distanceModel?: DistanceModel;
  refDistance?: number;
  maxDistance?: number;
  rolloffFactor?: number;
}

export interface RecorderOptions {
  format?: RecordingFormat;
  timeslice?: number; // ms between ondataavailable events
}

export interface RecorderState {
  recording: boolean;
  paused: boolean;
  duration: number; // seconds elapsed
  blob: Blob | null;
}

// ─── AudioEngine — Singleton AudioContext with lifecycle management ────────────
// AudioContext must be created after a user gesture. Never create at module load.

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  private ctx: AudioContext | null = null;
  private readonly options: AudioEngineOptions;

  private constructor(options: AudioEngineOptions = {}) {
    this.options = options;
  }

  static getInstance(options?: AudioEngineOptions): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine(options);
    }
    return AudioEngine.instance;
  }

  // Call on first user gesture (click, keydown, touchstart)
  async resume(): Promise<AudioContext> {
    if (!this.ctx) {
      this.ctx = new AudioContext({
        sampleRate: this.options.sampleRate,
        latencyHint: this.options.latencyHint ?? "interactive",
      });
    }

    // AudioContext starts suspended on creation in most browsers — explicit resume required
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }

    return this.ctx;
  }

  get context(): AudioContext | null {
    return this.ctx;
  }

  get state(): AudioContextState {
    return (this.ctx?.state ?? "suspended") as AudioContextState;
  }

  async suspend(): Promise<void> {
    await this.ctx?.suspend();
  }

  async close(): Promise<void> {
    await this.ctx?.close();
    this.ctx = null;
    AudioEngine.instance = null;
  }

  createGain(value: number = 1): GainNode {
    const ctx = this.requireContext();
    const node = ctx.createGain();
    node.gain.value = value;
    return node;
  }

  createAnalyser(fftSize: number = 2048, smoothing: number = 0.8): AnalyserNode {
    const ctx = this.requireContext();
    const node = ctx.createAnalyser();
    node.fftSize = fftSize;
    node.smoothingTimeConstant = smoothing;
    return node;
  }

  private requireContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      throw new Error("AudioContext not initialized. Call AudioEngine.resume() first.");
    }
    return this.ctx;
  }
}

// ─── useAudioVisualizer — AnalyserNode frequency/waveform data ───────────────
// Returns raw Float32Array each animation frame. Draw it yourself on canvas.

export function useAudioVisualizer(
  source: MediaStream | null,
  options: VisualizerOptions = {}
): { data: Float32Array | null; analyser: AnalyserNode | null } {
  const {
    fftSize = 2048,
    smoothing = 0.8,
    type = "frequency",
  } = options;

  const [data, setData] = useState<Float32Array | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!source) return;

    const engine = AudioEngine.getInstance();
    let sourceNode: MediaStreamAudioSourceNode | null = null;

    const init = async () => {
      const ctx = await engine.resume();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = smoothing;
      analyserRef.current = analyser;

      sourceNode = ctx.createMediaStreamSource(source);
      sourceNode.connect(analyser);

      const buffer = new Float32Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!mountedRef.current) return;
        if (type === "frequency") {
          analyser.getFloatFrequencyData(buffer);
        } else {
          analyser.getFloatTimeDomainData(buffer);
        }
        setData(new Float32Array(buffer)); // Copy to trigger re-render
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    init();

    return () => {
      mountedRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      sourceNode?.disconnect();
      analyserRef.current = null;
    };
  }, [source, fftSize, smoothing, type]);

  return { data, analyser: analyserRef.current };
}

// ─── useAudioPlayer — Playback with seek, volume, rate, crossfade ────────────

export interface AudioPlayerState {
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  loading: boolean;
  error: Error | null;
}

export interface AudioPlayerControls {
  play: () => Promise<void>;
  pause: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  setRate: (r: number) => void;
  crossfadeTo: (src: string, duration?: number) => Promise<void>;
}

export function useAudioPlayer(
  ref: RefObject<HTMLAudioElement>,
  options: AudioPlayerOptions = {}
): { state: AudioPlayerState; controls: AudioPlayerControls } {
  const { loop = false, crossfadeDuration = 1 } = options;
  const mountedRef = useRef(true);

  const [state, setState] = useState<AudioPlayerState>({
    playing: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: options.playbackRate ?? 1,
    loading: false,
    error: null,
  });

  const update = useCallback(<K extends keyof AudioPlayerState>(
    key: K,
    value: AudioPlayerState[K]
  ) => {
    if (mountedRef.current) setState((s) => ({ ...s, [key]: value }));
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const el = ref.current;
    if (!el) return;

    el.loop = loop;

    const map: Record<string, () => void> = {
      play:           () => update("playing",  true),
      pause:          () => update("playing",  false),
      ended:          () => update("playing",  false),
      waiting:        () => update("loading",  true),
      canplay:        () => update("loading",  false),
      timeupdate:     () => update("currentTime", el.currentTime),
      durationchange: () => update("duration",    el.duration),
      volumechange:   () => update("volume",      el.volume),
      ratechange:     () => update("playbackRate", el.playbackRate),
      error:          () => update("error", new Error(el.error?.message ?? "Audio error")),
    };

    Object.entries(map).forEach(([e, h]) => el.addEventListener(e, h));
    return () => {
      mountedRef.current = false;
      Object.entries(map).forEach(([e, h]) => el.removeEventListener(e, h));
    };
  }, [ref, loop, update]);

  const controls: AudioPlayerControls = {
    play: async () => {
      try {
        await ref.current?.play();
      } catch (e) {
        update("error", e as Error);
      }
    },

    pause: () => ref.current?.pause(),

    seek: (t) => {
      const el = ref.current;
      if (el) el.currentTime = Math.max(0, Math.min(t, el.duration || 0));
    },

    setVolume: (v) => {
      const el = ref.current;
      if (el) el.volume = Math.max(0, Math.min(1, v));
    },

    setRate: (r) => {
      const el = ref.current;
      // HTMLAudioElement supports 0.25–16; outside this range is silently clamped
      if (el) el.playbackRate = Math.max(0.25, Math.min(16, r));
    },

    crossfadeTo: async (src, duration = crossfadeDuration) => {
      const el = ref.current;
      if (!el) return;

      const next = new Audio(src);
      next.volume = 0;
      next.play().catch(() => {});

      const step = 50;
      const steps = (duration * 1000) / step;
      let i = 0;

      const fade = setInterval(() => {
        i++;
        const progress = i / steps;
        el.volume = Math.max(0, 1 - progress);
        next.volume = Math.min(1, progress);

        if (i >= steps) {
          clearInterval(fade);
          el.pause();
          el.src = src;
          el.volume = 1;
        }
      }, step);
    },
  };

  return { state, controls };
}

// ─── useSpatialAudio — PannerNode 3D positioning ─────────────────────────────

export function useSpatialAudio(
  source: AudioNode | null,
  config: SpatialConfig
): { pannerNode: PannerNode | null; updatePosition: (pos: Partial<SpatialConfig>) => void } {
  const pannerRef = useRef<PannerNode | null>(null);
  const engine = AudioEngine.getInstance();

  useEffect(() => {
    if (!source || !engine.context) return;
    const ctx = engine.context;

    const panner = ctx.createPanner();
    panner.distanceModel = config.distanceModel ?? "inverse";
    panner.refDistance   = config.refDistance   ?? 1;
    panner.maxDistance   = config.maxDistance   ?? 10000;
    panner.rolloffFactor = config.rolloffFactor ?? 1;
    panner.positionX.value = config.x;
    panner.positionY.value = config.y;
    panner.positionZ.value = config.z;

    source.connect(panner);
    panner.connect(ctx.destination);
    pannerRef.current = panner;

    return () => {
      source.disconnect(panner);
      panner.disconnect(ctx.destination);
      pannerRef.current = null;
    };
  }, [source]); // Only reconnect when source changes — position updates use AudioParam

  const updatePosition = useCallback((pos: Partial<SpatialConfig>) => {
    const panner = pannerRef.current;
    if (!panner) return;
    if (pos.x !== undefined) panner.positionX.value = pos.x;
    if (pos.y !== undefined) panner.positionY.value = pos.y;
    if (pos.z !== undefined) panner.positionZ.value = pos.z;
  }, []);

  return { pannerNode: pannerRef.current, updatePosition };
}

// ─── AudioWorkletManager — Worklet registration and processor communication ───

export class AudioWorkletManager {
  private readonly engine: AudioEngine;
  private registeredProcessors = new Set<string>();
  private nodes = new Map<string, AudioWorkletNode>();

  constructor(engine: AudioEngine) {
    this.engine = engine;
  }

  async register(name: string, processorUrl: string): Promise<void> {
    if (this.registeredProcessors.has(name)) return;
    const ctx = await this.engine.resume();

    if (!ctx.audioWorklet) {
      throw new Error("AudioWorklet not supported in this browser. Use ScriptProcessor as fallback.");
    }

    await ctx.audioWorklet.addModule(processorUrl);
    this.registeredProcessors.add(name);
  }

  createNode(
    processorName: string,
    options?: AudioWorkletNodeOptions
  ): AudioWorkletNode {
    const ctx = this.engine.context;
    if (!ctx || ctx.state === "closed") {
      throw new Error("AudioContext not running. Call resume() first.");
    }

    if (!this.registeredProcessors.has(processorName)) {
      throw new Error(`Processor "${processorName}" not registered. Call register() first.`);
    }

    const node = new AudioWorkletNode(ctx, processorName, options);
    this.nodes.set(processorName, node);
    return node;
  }

  sendMessage(processorName: string, data: unknown): void {
    const node = this.nodes.get(processorName);
    if (!node) return;
    node.port.postMessage(data);
  }

  onMessage(processorName: string, handler: (data: unknown) => void): () => void {
    const node = this.nodes.get(processorName);
    if (!node) return () => {};

    const listener = (e: MessageEvent) => handler(e.data);
    node.port.addEventListener("message", listener);
    node.port.start();

    return () => node.port.removeEventListener("message", listener);
  }

  disconnect(processorName: string): void {
    const node = this.nodes.get(processorName);
    node?.disconnect();
    this.nodes.delete(processorName);
  }
}

// ─── useAudioRecorder — MediaRecorder with chunk collection ──────────────────

export function useAudioRecorder(options: RecorderOptions = {}): {
  state: RecorderState;
  start: () => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
} {
  const { format = "audio/webm", timeslice = 250 } = options;

  const [state, setState] = useState<RecorderState>({
    recording: false,
    paused: false,
    duration: 0,
    blob: null,
  });

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<BlobEvent["data"][]>([]);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const mountedRef  = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      recorderRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Pick first supported format — not all browsers support all MIME types
    const mimeType = MediaRecorder.isTypeSupported(format)
      ? format
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "";

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    recorderRef.current = recorder;
    chunksRef.current = [];
    startTimeRef.current = Date.now();

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop()); // Release microphone
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      if (mountedRef.current) {
        setState((s) => ({ ...s, recording: false, paused: false, blob }));
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };

    recorder.start(timeslice);

    // Track duration in realtime
    timerRef.current = setInterval(() => {
      if (mountedRef.current) {
        setState((s) => ({
          ...s,
          duration: (Date.now() - startTimeRef.current) / 1000,
        }));
      }
    }, 200);

    setState({ recording: true, paused: false, duration: 0, blob: null });
  };

  const stop   = () => recorderRef.current?.stop();
  const pause  = () => { recorderRef.current?.pause();  setState((s) => ({ ...s, paused: true  })); };
  const resumeRec = () => { recorderRef.current?.resume(); setState((s) => ({ ...s, paused: false })); };

  return { state, start, stop, pause, resume: resumeRec };
}

// ─── SoundBoard — Preload multiple sounds with overlap control ────────────────

interface SoundConfig {
  src: string;
  volume?: number;
  maxOverlap?: number; // Max concurrent instances
}

export class SoundBoard {
  private sounds = new Map<string, { config: SoundConfig; pool: HTMLAudioElement[] }>();

  async load(id: string, config: SoundConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(config.src);
      audio.volume = config.volume ?? 1;
      audio.preload = "auto";
      audio.oncanplaythrough = () => {
        this.sounds.set(id, { config, pool: [audio] });
        resolve();
      };
      audio.onerror = () => reject(new Error(`SoundBoard: failed to load "${id}"`));
    });
  }

  play(id: string): void {
    const entry = this.sounds.get(id);
    if (!entry) return;

    const { config, pool } = entry;
    const maxOverlap = config.maxOverlap ?? 3;

    // Count currently playing instances
    const playingCount = pool.filter((a) => !a.paused && a.currentTime > 0).length;
    if (playingCount >= maxOverlap) return; // Respect overlap limit

    // Reuse a finished audio element or clone a new one
    const finished = pool.find((a) => a.paused && a.currentTime > 0);
    const instance = finished ?? (pool[0].cloneNode() as HTMLAudioElement);

    if (!finished && pool.length < maxOverlap) {
      pool.push(instance);
    }

    instance.volume = config.volume ?? 1;
    instance.currentTime = 0;
    instance.play().catch(() => {}); // Ignore autoplay policy for board sounds
  }

  stop(id: string): void {
    this.sounds.get(id)?.pool.forEach((a) => { a.pause(); a.currentTime = 0; });
  }

  setVolume(id: string, volume: number): void {
    const entry = this.sounds.get(id);
    if (!entry) return;
    entry.config.volume = Math.max(0, Math.min(1, volume));
    entry.pool.forEach((a) => (a.volume = entry.config.volume ?? 1));
  }

  stopAll(): void {
    this.sounds.forEach((_, id) => this.stop(id));
  }
}

/*
 * Usage Examples:
 *
 * // Real-time microphone visualizer
 * const [stream, setStream] = useState<MediaStream | null>(null);
 * const start = async () => setStream(await navigator.mediaDevices.getUserMedia({ audio: true }));
 * const { data } = useAudioVisualizer(stream, { fftSize: 1024, type: "frequency" });
 * // Draw data on <canvas> with requestAnimationFrame
 *
 * // Audio player with crossfade
 * const ref = useRef<HTMLAudioElement>(null);
 * const { state, controls } = useAudioPlayer(ref, { crossfadeDuration: 1.5 });
 * <audio ref={ref} src={trackA} />
 * <button onClick={() => controls.crossfadeTo(trackB)}>Next Track</button>
 *
 * // AudioEngine — must call after user gesture
 * const engine = AudioEngine.getInstance();
 * document.addEventListener("click", () => engine.resume(), { once: true });
 *
 * // Spatial audio positioned to the right
 * const sourceNode = ...; // AudioNode from AudioContext
 * const { updatePosition } = useSpatialAudio(sourceNode, { x: 10, y: 0, z: 0 });
 * updatePosition({ x: -10 }); // Move to left
 *
 * // AudioWorklet processor
 * const manager = new AudioWorkletManager(AudioEngine.getInstance());
 * await manager.register("noise-gate", "/worklets/noise-gate.js");
 * const node = manager.createNode("noise-gate", { processorOptions: { threshold: -40 } });
 *
 * // SoundBoard for UI sounds
 * const board = new SoundBoard();
 * await board.load("click", { src: "/sounds/click.mp3", maxOverlap: 2 });
 * await board.load("success", { src: "/sounds/success.mp3", volume: 0.8 });
 * board.play("click"); // Call on button click
 *
 * // Voice recorder
 * const { state, start, stop } = useAudioRecorder({ format: "audio/webm" });
 * <button onClick={state.recording ? stop : start}>{state.recording ? "Stop" : "Record"}</button>
 * {state.blob && <audio src={URL.createObjectURL(state.blob)} controls />}
 */
