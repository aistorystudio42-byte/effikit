/**
 * @keywords    diversity, deduplication, MMR, maximal marginal relevance, category balance, novelty, serendipity
 * @domain      Discovery Diversity
 * @use-when    Preventing echo chambers and category flooding in feeds; injecting novelty into ranked lists
 * @not-when    You need raw relevance ranking — diversity post-processing comes after ranking
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DiversifiableItem {
  id: string;
  score: number;
  categoryId: string;
  authorId: string;
  tags: string[];
  embedding?: number[]; // Optional dense embedding for semantic similarity
}

export interface DiversityConfig {
  lambda: number;            // MMR balance: 0 = max diversity, 1 = max relevance
  maxPerCategory: number;    // Hard cap per category in output
  maxPerAuthor: number;      // Hard cap per author in output
  noveltyBoost: number;      // Extra weight for items with low overlap to seen content
  serendipityRatio: number;  // 0–1, fraction of results injected as "wild card" low-score items
}

export interface DiversityResult {
  items: DiversifiableItem[];
  categoryDistribution: Record<string, number>;
  diversityScore: number; // 0–1, average pairwise dissimilarity in output
}

// ─── Similarity Functions ──────────────────────────────────────────────────────

function tagJaccard(a: DiversifiableItem, b: DiversifiableItem): number {
  const setA = new Set(a.tags);
  const intersection = b.tags.filter((t) => setA.has(t)).length;
  const union = new Set([...a.tags, ...b.tags]).size;
  return union === 0 ? 0 : intersection / union;
}

function cosineSimilarityVec(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < len; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

function itemSimilarity(a: DiversifiableItem, b: DiversifiableItem): number {
  // Use embedding cosine if available, else fall back to tag Jaccard
  if (a.embedding && b.embedding) {
    return cosineSimilarityVec(a.embedding, b.embedding);
  }
  return tagJaccard(a, b);
}

// ─── MMR (Maximal Marginal Relevance) ─────────────────────────────────────────
// Iteratively selects items that maximize: λ·relevance − (1−λ)·max_similarity_to_selected

function mmrSelect(
  candidates: DiversifiableItem[],
  selected: DiversifiableItem[],
  lambda: number
): { item: DiversifiableItem; index: number } {
  let bestIdx = 0;
  let bestScore = -Infinity;

  for (let i = 0; i < candidates.length; i++) {
    const relevance = candidates[i].score;
    const maxSim = selected.length === 0
      ? 0
      : Math.max(...selected.map((s) => itemSimilarity(candidates[i], s)));

    const mmr = lambda * relevance - (1 - lambda) * maxSim;
    if (mmr > bestScore) { bestScore = mmr; bestIdx = i; }
  }

  return { item: candidates[bestIdx], index: bestIdx };
}

// ─── Serendipity Injection ─────────────────────────────────────────────────────
// Randomly samples low-ranked items to inject surprise into the feed

function injectSerendipity(
  ranked: DiversifiableItem[],
  selected: DiversifiableItem[],
  ratio: number,
  targetSize: number
): DiversifiableItem[] {
  const serendipityCount = Math.floor(targetSize * ratio);
  if (serendipityCount === 0) return selected;

  // Items not yet selected, from bottom half of ranked list
  const selectedIds = new Set(selected.map((i) => i.id));
  const bottomHalf = ranked
    .slice(Math.floor(ranked.length / 2))
    .filter((i) => !selectedIds.has(i.id));

  // Reservoir sampling for uniform random selection
  const reservoir: DiversifiableItem[] = [];
  for (let i = 0; i < bottomHalf.length; i++) {
    if (i < serendipityCount) {
      reservoir.push(bottomHalf[i]);
    } else {
      const j = Math.floor(Math.random() * (i + 1));
      if (j < serendipityCount) reservoir[j] = bottomHalf[i];
    }
  }

  // Interleave serendipity items at regular intervals
  const result = [...selected];
  const step = Math.floor(result.length / (serendipityCount + 1));
  reservoir.forEach((item, i) => {
    const pos = Math.min((i + 1) * step, result.length);
    result.splice(pos, 0, item);
  });

  return result;
}

// ─── DiversityEngine ──────────────────────────────────────────────────────────

export class DiversityEngine {
  private config: DiversityConfig;

  constructor(config: Partial<DiversityConfig> = {}) {
    this.config = {
      lambda: config.lambda ?? 0.7,
      maxPerCategory: config.maxPerCategory ?? 5,
      maxPerAuthor: config.maxPerAuthor ?? 3,
      noveltyBoost: config.noveltyBoost ?? 0.1,
      serendipityRatio: config.serendipityRatio ?? 0.1,
    };
  }

  diversify(
    items: DiversifiableItem[],
    targetSize: number
  ): DiversityResult {
    if (items.length === 0) return { items: [], categoryDistribution: {}, diversityScore: 0 };

    const maxScore = items[0].score || 1;
    const normalized = items.map((i) => ({ ...i, score: i.score / maxScore }));

    const selected: DiversifiableItem[] = [];
    const candidates = [...normalized];
    const categoryCount: Record<string, number> = {};
    const authorCount: Record<string, number> = {};

    while (
      selected.length < targetSize - Math.floor(targetSize * this.config.serendipityRatio) &&
      candidates.length > 0
    ) {
      const { item, index } = mmrSelect(candidates, selected, this.config.lambda);

      // Enforce category and author caps
      const catCount = categoryCount[item.categoryId] ?? 0;
      const authCount = authorCount[item.authorId] ?? 0;

      if (catCount >= this.config.maxPerCategory || authCount >= this.config.maxPerAuthor) {
        candidates.splice(index, 1);
        continue;
      }

      selected.push(item);
      candidates.splice(index, 1);
      categoryCount[item.categoryId] = catCount + 1;
      authorCount[item.authorId] = authCount + 1;
    }

    // Inject serendipity items
    const finalItems = injectSerendipity(normalized, selected, this.config.serendipityRatio, targetSize);

    // Compute average pairwise dissimilarity as diversity score
    const diversityScore = computeAverageDissimilarity(finalItems.slice(0, targetSize));

    return {
      items: finalItems.slice(0, targetSize),
      categoryDistribution: categoryCount,
      diversityScore,
    };
  }
}

function computeAverageDissimilarity(items: DiversifiableItem[]): number {
  if (items.length < 2) return 1;
  let totalDissimilarity = 0;
  let pairs = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      totalDissimilarity += 1 - itemSimilarity(items[i], items[j]);
      pairs++;
    }
  }
  return pairs === 0 ? 1 : totalDissimilarity / pairs;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createDiversityEngine(config?: Partial<DiversityConfig>): DiversityEngine {
  return new DiversityEngine(config);
}

/*
 * Usage Example:
 *
 * const engine = createDiversityEngine({
 *   lambda: 0.65,          // slightly prefer diversity over pure relevance
 *   maxPerCategory: 4,
 *   maxPerAuthor: 2,
 *   serendipityRatio: 0.1, // 10% wild cards
 * });
 *
 * const { items, diversityScore, categoryDistribution } = engine.diversify(rankedItems, 20);
 * console.log(`Diversity score: ${diversityScore.toFixed(3)}`);
 * // diversityScore near 1 = maximally diverse, near 0 = homogeneous
 */
