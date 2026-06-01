<!-- @keywords: web audio api, AudioContext, AnalyserNode, audio visualizer, spatial audio, microphone, MediaRecorder, audio worklet, audio player, gesture requirement -->

# Media — Web Audio API as Precision Instrument

## Core Philosophy

The Web Audio API is a signal processing graph, not a `<audio>` tag with extra steps. Every sound passes through nodes. You control routing, effects, analysis, and spatialization explicitly. The price of this power is lifecycle management — an AudioContext not properly suspended burns CPU even when silent.

The golden constraint: **audio requires a user gesture.** No click, no sound. This is a browser security rule with no workaround. Design UX around it, not against it.

---

**1. One AudioContext per page.** Creating multiple contexts causes browser warnings and resource waste. Use a singleton. Reuse it for everything.

**2. Handle suspended state.** Browsers start AudioContext in `suspended` state on mobile. Always call `audioCtx.resume()` inside a user gesture handler before playing anything.

**3. Connect → process → output.** Every node chain ends at `audioCtx.destination`. A node not connected to destination produces no output. Disconnect nodes you're done with.

**4. AnalyserNode is read-only.** It doesn't modify audio. Insert it in the chain to inspect signal without affecting output: `source → analyser → destination`.

**5. AudioWorklet over ScriptProcessorNode.** ScriptProcessorNode is deprecated and runs on the main thread. AudioWorklet runs in a dedicated audio thread — lower latency, no jank.

---

## When to Activate

- Audio visualizer tied to microphone or playback
- Multi-sound interactive experiences (games, instruments)
- Spatial audio for 3D scenes
- Custom audio player with waveform scrubbing
- Real-time audio processing (pitch shift, reverb, EQ)
- Recording with format selection

---

## Principles

## Decision Framework

```
Do you need to analyze audio (visualizer, meter)?
├── YES → insert AnalyserNode between source and destination
└── NO  → skip, connect source directly to destination

Do you need to play multiple sounds simultaneously?
├── YES → create one BufferSourceNode per sound, connect all to destination
└── NO  → single source node is sufficient

Do you need positional audio (3D)?
├── YES → PannerNode with AudioListener positioned in scene
└── NO  → GainNode for volume, StereoPannerNode for left/right only

Do you need to record?
├── YES → MediaRecorder on MediaStreamDestinationNode output
└── NO  → skip MediaRecorder pipeline

Is the user on mobile Safari?
├── YES → always gate AudioContext.resume() behind user gesture
└── ALL → same rule applies everywhere, mobile is just more strict
```

---

## Anti-Patterns

- Creating AudioContext on module load — blocked by browsers before gesture
- Leaving AudioContext running when audio stops — wastes CPU/battery
- Using `setInterval` to read AnalyserNode — use `requestAnimationFrame` instead
- Forgetting to disconnect nodes — memory leak, orphaned processing
- Using ScriptProcessorNode in new code — it's deprecated, latency is terrible
- Not handling `audioCtx.state === 'closed'` — closed context cannot be restarted

---

## Example in Action

Real-time audio visualizer responding to microphone input:

```tsx
import { useEffect, useRef, useState, useCallback } from 'react';

// Singleton AudioContext — one per page
let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedContext || sharedContext.state === 'closed') {
    sharedContext = new AudioContext();
  }
  return sharedContext;
}

interface VisualizerOptions {
  fftSize?: 256 | 512 | 1024 | 2048;
  smoothingTimeConstant?: number;
}

export function useAudioVisualizer(options: VisualizerOptions = {}) {
  const { fftSize = 256, smoothingTimeConstant = 0.8 } = options;
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [isActive, setIsActive] = useState(false);
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(fftSize / 2));

  const start = useCallback(async () => {
    // Must be called from a user gesture handler
    try {
      const ctx = getAudioContext();
      await ctx.resume(); // Lift suspension on mobile

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = smoothingTimeConstant;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Microphone → analyser → (no destination = monitoring without playback)
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        setFrequencyData(new Uint8Array(dataArray)); // copy to trigger re-render
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
      setIsActive(true);
    } catch (err) {
      console.error('Microphone access denied or AudioContext failed:', err);
    }
  }, [fftSize, smoothingTimeConstant]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach(t => t.stop());
    sourceRef.current = null;
    streamRef.current = null;
    setIsActive(false);
    setFrequencyData(new Uint8Array(fftSize / 2));
  }, [fftSize]);

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop]);

  return { frequencyData, isActive, start, stop };
}

// Canvas visualizer component
export function AudioVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { frequencyData, isActive, start, stop } = useAudioVisualizer({ fftSize: 512 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);
    if (!isActive) return;

    const barWidth = width / frequencyData.length;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    frequencyData.forEach((value, i) => {
      const barHeight = (value / 255) * height;
      const hue = (i / frequencyData.length) * 280; // purple to blue spectrum
      ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
      ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
    });
  }, [frequencyData, isActive]);

  return (
    <div>
      <canvas ref={canvasRef} width={800} height={200} style={{ width: '100%', background: '#000' }} />
      <button onClick={isActive ? stop : start}>
        {isActive ? 'Stop' : 'Start Microphone'}
      </button>
    </div>
  );
}
```
