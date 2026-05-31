/**
 * @keywords    time decay, score decay, freshness, half-life, exponential decay, temporal ranking
 * @domain      Ranking Decay
 * @use-when    Scores need to decrease over time: trending content, hot posts, activity scores
 * @not-when    Scores should be permanent — use ranking.score.ts for static point systems
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type DecayFunction = "exponential" | "linear" | "step" | "gaussian" | "power";

export interface DecayConfig {
  fn: DecayFunction;
  halfLifeMs?: number;      // Time for score to halve (exponential/linear)
  peakMs?: number;          // For gaussian: center of the bell curve from event time
  spreadMs?: number;        // For gaussian: std deviation of the bell
  steps?: DecayStep[];      // For step: discrete time-bracket multipliers
  power?: number;           // For power law: score * (1 / age^power)
  floor?: number;           // Minimum multiplier (0 = can decay to zero)
}

export interface DecayStep {
  maxAgeMs: number;
  multiplier: number; // Applied when age <= maxAgeMs
}

export interface DecayedScore {
  id: string;
  originalScore: number;
  decayedScore: number;
  decayMultiplier: number;
  ageMs: number;
}

// ─── Decay Functions ──────────────────────────────────────────────────────────

function exponentialDecay(ageMs: number, halfLifeMs: number): number {
  return Math.exp((-Math.LN2 / halfLifeMs) * ageMs);
}

function linearDecay(ageMs: number, halfLifeMs: number): number {
  // Reaches 0 at 2 × halfLifeMs
  return Math.max(0, 1 - ageMs / (2 * halfLifeMs));
}

function stepDecay(ageMs: number, steps: DecayStep[]): number {
  const sorted = [...steps].sort((a, b) => a.maxAgeMs - b.maxAgeMs);
  for (const step of sorted) {
    if (ageMs <= step.maxAgeMs) return step.multiplier;
  }
  return sorted[sorted.length - 1]?.multiplier ?? 0;
}

function gaussianDecay(ageMs: number, peakMs: number, spreadMs: number): number {
  if (spreadMs === 0) return ageMs === peakMs ? 1 : 0;
  const x = ageMs - peakMs;
  return Math.exp(-(x * x) / (2 * spreadMs * spreadMs));
}

function powerDecay(ageMs: number, power: number): number {
  const ageHours = Math.max(ageMs / 3_600_000, 0.001); // Prevent division by zero
  return 1 / Math.pow(ageHours, power);
}

// ─── ScoreDecay ───────────────────────────────────────────────────────────────

export class ScoreDecay {
  private config: Required<DecayConfig>;

  constructor(config: DecayConfig) {
    this.config = {
      fn: config.fn,
      halfLifeMs: config.halfLifeMs ?? 24 * 3_600_000, // Default 24h half-life
      peakMs: config.peakMs ?? 0,
      spreadMs: config.spreadMs ?? 6 * 3_600_000,
      steps: config.steps ?? [
        { maxAgeMs: 3_600_000,      multiplier: 1.0 },  // < 1 hour
        { maxAgeMs: 24 * 3_600_000, multiplier: 0.7 },  // < 1 day
        { maxAgeMs: 7 * 86_400_000, multiplier: 0.4 },  // < 1 week
        { maxAgeMs: Infinity,        multiplier: 0.1 },
      ],
      power: config.power ?? 1.5,
      floor: config.floor ?? 0,
    };
  }

  multiplier(eventTimeMs: number, nowMs = Date.now()): number {
    const ageMs = Math.max(0, nowMs - eventTimeMs);
    let m: number;

    switch (this.config.fn) {
      case "exponential": m = exponentialDecay(ageMs, this.config.halfLifeMs); break;
      case "linear":      m = linearDecay(ageMs, this.config.halfLifeMs); break;
      case "step":        m = stepDecay(ageMs, this.config.steps); break;
      case "gaussian":    m = gaussianDecay(ageMs, this.config.peakMs, this.config.spreadMs); break;
      case "power":       m = powerDecay(ageMs, this.config.power); break;
    }

    return Math.max(this.config.floor, Math.min(1, m));
  }

  applyToScore(score: number, eventTimeMs: number, nowMs = Date.now()): number {
    return score * this.multiplier(eventTimeMs, nowMs);
  }

  applyBatch(
    items: Array<{ id: string; score: number; eventTimeMs: number }>,
    nowMs = Date.now()
  ): DecayedScore[] {
    return items
      .map((item) => {
        const ageMs = Math.max(0, nowMs - item.eventTimeMs);
        const decayMultiplier = this.multiplier(item.eventTimeMs, nowMs);
        return {
          id: item.id,
          originalScore: item.score,
          decayedScore: item.score * decayMultiplier,
          decayMultiplier,
          ageMs,
        };
      })
      .sort((a, b) => b.decayedScore - a.decayedScore);
  }
}

// ─── Multi-signal Decay ───────────────────────────────────────────────────────
// Different signals decay at different rates — combine them with individual decay configs

export interface SignalWithDecay {
  name: string;
  value: number;
  weight: number;
  eventTimeMs: number;
  decay: ScoreDecay;
}

export function multiSignalDecay(signals: SignalWithDecay[], nowMs = Date.now()): number {
  const totalWeight = signals.reduce((s, sig) => s + sig.weight, 0);
  if (totalWeight === 0) return 0;

  return signals.reduce((score, sig) => {
    const decayed = sig.decay.applyToScore(sig.value, sig.eventTimeMs, nowMs);
    return score + (sig.weight / totalWeight) * decayed;
  }, 0);
}

// ─── Decay Presets ────────────────────────────────────────────────────────────

export const DecayPresets = {
  /** Hot content: fast exponential, 6-hour half-life */
  trending: (): ScoreDecay => new ScoreDecay({ fn: "exponential", halfLifeMs: 6 * 3_600_000, floor: 0 }),

  /** News articles: 24-hour half-life, never fully disappear */
  news: (): ScoreDecay => new ScoreDecay({ fn: "exponential", halfLifeMs: 24 * 3_600_000, floor: 0.05 }),

  /** Weekly content like newsletters */
  weekly: (): ScoreDecay => new ScoreDecay({ fn: "linear", halfLifeMs: 7 * 86_400_000, floor: 0 }),

  /** Evergreen content — slow power-law decay */
  evergreen: (): ScoreDecay => new ScoreDecay({ fn: "power", power: 0.3, floor: 0.1 }),

  /** Events: peak at event time, gaussian bell before and after */
  event: (peakMs: number, spreadMs = 2 * 3_600_000): ScoreDecay =>
    new ScoreDecay({ fn: "gaussian", peakMs, spreadMs }),

  /** User activity: step-function for recency buckets */
  activity: (): ScoreDecay => new ScoreDecay({
    fn: "step",
    steps: [
      { maxAgeMs: 15 * 60_000,     multiplier: 1.0  }, // < 15 min
      { maxAgeMs: 60 * 60_000,     multiplier: 0.85 }, // < 1 hour
      { maxAgeMs: 24 * 3_600_000,  multiplier: 0.6  }, // < 1 day
      { maxAgeMs: 7 * 86_400_000,  multiplier: 0.3  }, // < 1 week
      { maxAgeMs: 30 * 86_400_000, multiplier: 0.1  }, // < 30 days
      { maxAgeMs: Infinity,         multiplier: 0.02 }, // older
    ],
  }),
} as const;

/*
 * Usage Example:
 *
 * // Apply trending decay to posts
 * const decay = DecayPresets.trending();
 * const ranked = decay.applyBatch(posts.map((p) => ({
 *   id: p.id,
 *   score: p.engagementScore,
 *   eventTimeMs: p.publishedAt,
 * })));
 *
 * // Multi-signal: likes decay fast, shares decay slow
 * const score = multiSignalDecay([
 *   { name: "likes",  value: 200, weight: 0.5, eventTimeMs: post.likedAt,   decay: DecayPresets.trending() },
 *   { name: "shares", value: 50,  weight: 0.5, eventTimeMs: post.sharedAt,  decay: DecayPresets.news() },
 * ]);
 */
