/**
 * @keywords    ranking, multi-factor, boost, decay, freshness, engagement, wilson score, bayesian
 * @domain      Discovery Ranking
 * @use-when    Building a multi-factor content ranking system with freshness decay, engagement signals and boosts
 * @not-when    You just need to sort by a single field — plain Array.sort is sufficient
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RankableItem {
  id: string;
  publishedAt: number;      // Unix ms
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clickThroughRate: number; // 0–1
  qualityScore: number;     // 0–1, editorial or ML-derived quality
  boostMultiplier?: number; // Manual boost (default 1.0)
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface RankedItem {
  id: string;
  item: RankableItem;
  components: RankingComponents;
  finalScore: number;
}

export interface RankingComponents {
  engagementScore: number;
  freshnessScore: number;
  qualityScore: number;
  wilsonScore: number;
  compositeScore: number;
}

export interface RankingWeights {
  engagement: number;
  freshness: number;
  quality: number;
  wilson: number;
}

// ─── Engagement Score ─────────────────────────────────────────────────────────

const ENGAGEMENT_WEIGHTS = {
  views:    0.05,
  likes:    0.35,
  comments: 0.30,
  shares:   0.20,
  saves:    0.10,
} as const;

function computeEngagement(item: RankableItem): number {
  const raw =
    item.views    * ENGAGEMENT_WEIGHTS.views +
    item.likes    * ENGAGEMENT_WEIGHTS.likes +
    item.comments * ENGAGEMENT_WEIGHTS.comments +
    item.shares   * ENGAGEMENT_WEIGHTS.shares +
    item.saves    * ENGAGEMENT_WEIGHTS.saves;

  // Log-compress to prevent viral items from dominating
  return Math.log1p(raw);
}

// ─── Freshness Decay ──────────────────────────────────────────────────────────

// Exponential decay: score halves every halfLifeHours
function computeFreshness(publishedAt: number, halfLifeHours = 48): number {
  const ageMs = Date.now() - publishedAt;
  const ageHours = ageMs / 3_600_000;
  return Math.exp((-Math.LN2 / halfLifeHours) * ageHours);
}

// ─── Wilson Score Lower Bound ──────────────────────────────────────────────────
// Bayesian lower bound on true positive rate — robust for small sample sizes
// Based on: http://www.evanmiller.org/how-not-to-sort-by-average-rating.html

function wilsonLowerBound(positives: number, total: number, confidence = 0.95): number {
  if (total === 0) return 0;

  // z-score for given confidence (1.96 for 95%)
  const zTable: Record<number, number> = { 0.90: 1.645, 0.95: 1.96, 0.99: 2.576 };
  const z = zTable[confidence] ?? 1.96;

  const pHat = positives / total;
  const z2 = z * z;
  const n = total;

  return (
    (pHat + z2 / (2 * n) - z * Math.sqrt((pHat * (1 - pHat) + z2 / (4 * n)) / n)) /
    (1 + z2 / n)
  );
}

// ─── Ranking Engine ───────────────────────────────────────────────────────────

export class RankingEngine {
  private weights: RankingWeights;
  private freshnessHalfLifeHours: number;

  constructor(
    weights: Partial<RankingWeights> = {},
    freshnessHalfLifeHours = 48
  ) {
    const raw = {
      engagement: weights.engagement ?? 0.35,
      freshness:  weights.freshness  ?? 0.25,
      quality:    weights.quality    ?? 0.25,
      wilson:     weights.wilson     ?? 0.15,
    };

    // Normalize weights to sum to 1
    const total = Object.values(raw).reduce((s, v) => s + v, 0);
    this.weights = {
      engagement: raw.engagement / total,
      freshness:  raw.freshness  / total,
      quality:    raw.quality    / total,
      wilson:     raw.wilson     / total,
    };

    this.freshnessHalfLifeHours = freshnessHalfLifeHours;
  }

  rankItem(item: RankableItem): RankedItem {
    const engagementScore = computeEngagement(item);
    const freshnessScore  = computeFreshness(item.publishedAt, this.freshnessHalfLifeHours);
    const qualityScore    = item.qualityScore;
    const wilsonScore     = wilsonLowerBound(
      Math.min(item.likes, item.views), // likes > views olamaz
      Math.max(item.views, item.likes)  // total en az likes kadar
    );

    const compositeScore =
      this.weights.engagement * engagementScore +
      this.weights.freshness  * freshnessScore +
      this.weights.quality    * qualityScore +
      this.weights.wilson     * wilsonScore;

    // Apply optional manual boost
    const finalScore = compositeScore * (item.boostMultiplier ?? 1.0);

    return {
      id: item.id,
      item,
      components: { engagementScore, freshnessScore, qualityScore, wilsonScore, compositeScore },
      finalScore,
    };
  }

  rank(items: RankableItem[]): RankedItem[] {
    return items.map((i) => this.rankItem(i)).sort((a, b) => b.finalScore - a.finalScore);
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createRankingEngine(
  weights?: Partial<RankingWeights>,
  freshnessHalfLifeHours?: number
): RankingEngine {
  return new RankingEngine(weights, freshnessHalfLifeHours);
}

/*
 * Usage Example:
 *
 * const engine = createRankingEngine(
 *   { engagement: 0.4, freshness: 0.3, quality: 0.2, wilson: 0.1 },
 *   24  // content half-life: 24 hours
 * );
 *
 * const ranked = engine.rank(allItems);
 * // ranked[0] is the highest-scoring item
 * // ranked[0].components shows how each signal contributed
 *
 * // Manually boost a sponsored item:
 * items[5].boostMultiplier = 2.0;
 */
