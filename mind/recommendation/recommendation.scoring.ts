/**
 * @keywords    scoring, weighted score, multi-criteria, normalization, ranking score, utility function
 * @domain      Recommendation Scoring
 * @use-when    You need to combine multiple signals (relevance, recency, popularity, quality) into a single score
 * @not-when    You need full collaborative filtering — use recommendation.engine.ts instead
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScoringSignal {
  name: string;
  value: number;   // Raw value before normalization
  weight: number;  // Relative importance (will be normalized)
  transform?: "linear" | "log" | "sqrt" | "sigmoid";
}

export interface ScoredItem<T = Record<string, unknown>> {
  id: string;
  data: T;
  signals: ScoringSignal[];
  rawScore: number;
  normalizedScore: number;
}

export interface ScoringConfig {
  signals: Array<Omit<ScoringSignal, "value">>;
  normalizationStrategy: "minmax" | "zscore" | "softmax";
  tiebreaker?: (a: ScoredItem, b: ScoredItem) => number;
}

// ─── Transform Functions ──────────────────────────────────────────────────────

const transforms: Record<NonNullable<ScoringSignal["transform"]>, (v: number) => number> = {
  linear:  (v) => v,
  log:     (v) => v > 0 ? Math.log1p(v) : 0,
  sqrt:    (v) => v > 0 ? Math.sqrt(v) : 0,
  sigmoid: (v) => 1 / (1 + Math.exp(-v)),
};

function applyTransform(value: number, t: ScoringSignal["transform"] = "linear"): number {
  return transforms[t](value);
}

// ─── Normalization Strategies ─────────────────────────────────────────────────

function minMaxNormalize(scores: number[]): number[] {
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min;
  return range === 0 ? scores.map(() => 0.5) : scores.map((s) => (s - min) / range);
}

function zScoreNormalize(scores: number[]): number[] {
  const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
  const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length;
  const std = Math.sqrt(variance);
  // Map to [0,1] using sigmoid after z-score
  return std === 0
    ? scores.map(() => 0.5)
    : scores.map((s) => 1 / (1 + Math.exp(-((s - mean) / std))));
}

function softmaxNormalize(scores: number[]): number[] {
  if (scores.length === 0) return [];
  const maxScore = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - maxScore)); // numerically stable
  const sum = exps.reduce((a, b) => a + b, 0);
  return sum === 0 ? scores.map(() => 1 / scores.length) : exps.map((e) => e / sum);
}

function normalize(scores: number[], strategy: ScoringConfig["normalizationStrategy"]): number[] {
  if (scores.length === 0) return [];
  switch (strategy) {
    case "minmax":  return minMaxNormalize(scores);
    case "zscore":  return zScoreNormalize(scores);
    case "softmax": return softmaxNormalize(scores);
  }
}

// ─── Weight Normalization ──────────────────────────────────────────────────────

function normalizeWeights(signals: Array<{ weight: number }>): number[] {
  if (signals.length === 0) return [];
  const total = signals.reduce((s, sig) => s + Math.abs(sig.weight), 0);
  return total === 0 ? signals.map(() => 0) : signals.map((s) => s.weight / total);
}

// ─── MultiCriteriaScorer ──────────────────────────────────────────────────────

export class MultiCriteriaScorer<T = Record<string, unknown>> {
  private config: ScoringConfig;

  constructor(config: ScoringConfig) {
    this.config = config;
  }

  score(
    items: Array<{ id: string; data: T; values: Record<string, number> }>
  ): ScoredItem<T>[] {
    if (items.length === 0) return [];

    const signalNames = this.config.signals.map((s) => s.name);

    // Build per-signal value arrays for batch normalization
    const rawValuesBySignal: Record<string, number[]> = {};
    for (const sig of signalNames) {
      rawValuesBySignal[sig] = items.map((item) => item.values[sig] ?? 0);
    }

    // Apply transforms then normalize each signal column
    const transformedBySignal: Record<string, number[]> = {};
    for (const sig of this.config.signals) {
      transformedBySignal[sig.name] = rawValuesBySignal[sig.name].map((v) =>
        applyTransform(v, sig.transform)
      );
    }

    const normalizedBySignal: Record<string, number[]> = {};
    for (const sig of this.config.signals) {
      normalizedBySignal[sig.name] = normalize(
        transformedBySignal[sig.name],
        this.config.normalizationStrategy
      );
    }

    const weights = normalizeWeights(this.config.signals);

    // Compute weighted composite score for each item
    const scoredItems: ScoredItem<T>[] = items.map((item, idx) => {
      const signals: ScoringSignal[] = this.config.signals.map((sig) => ({
        name: sig.name,
        value: rawValuesBySignal[sig.name][idx],
        weight: sig.weight,
        transform: sig.transform,
      }));

      const rawScore = signals.reduce(
        (sum, sig, i) => sum + weights[i] * normalizedBySignal[sig.name][idx],
        0
      );

      return { id: item.id, data: item.data, signals, rawScore, normalizedScore: rawScore };
    });

    // Final normalization pass across composite scores
    const compositeScores = scoredItems.map((s) => s.rawScore);
    const finalScores = normalize(compositeScores, this.config.normalizationStrategy);
    scoredItems.forEach((item, i) => {
      item.normalizedScore = finalScores[i];
    });

    // Sort descending, apply optional tiebreaker
    return scoredItems.sort((a, b) => {
      const diff = b.normalizedScore - a.normalizedScore;
      if (diff !== 0) return diff;
      return this.config.tiebreaker ? this.config.tiebreaker(a, b) : 0;
    });
  }
}

// ─── Preset Signal Definitions ─────────────────────────────────────────────────

export const Signals = {
  relevance: (weight = 1.0): Omit<ScoringSignal, "value"> => ({
    name: "relevance", weight, transform: "linear",
  }),
  recency: (weight = 0.8): Omit<ScoringSignal, "value"> => ({
    name: "recency", weight, transform: "sigmoid",
  }),
  popularity: (weight = 0.5): Omit<ScoringSignal, "value"> => ({
    name: "popularity", weight, transform: "log",
  }),
  quality: (weight = 0.7): Omit<ScoringSignal, "value"> => ({
    name: "quality", weight, transform: "linear",
  }),
  diversity: (weight = 0.3): Omit<ScoringSignal, "value"> => ({
    name: "diversity", weight, transform: "sqrt",
  }),
} as const;

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createScorer<T = Record<string, unknown>>(
  config: ScoringConfig
): MultiCriteriaScorer<T> {
  return new MultiCriteriaScorer<T>(config);
}

/*
 * Usage Example:
 *
 * const scorer = createScorer({
 *   signals: [Signals.relevance(1.0), Signals.recency(0.8), Signals.popularity(0.5)],
 *   normalizationStrategy: "minmax",
 * });
 *
 * const results = scorer.score([
 *   { id: "post-1", data: { title: "..." }, values: { relevance: 0.9, recency: 0.7, popularity: 1200 } },
 *   { id: "post-2", data: { title: "..." }, values: { relevance: 0.6, recency: 0.95, popularity: 340 } },
 * ]);
 *
 * // results[0] has highest normalizedScore
 */
