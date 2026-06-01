/**
 * @keywords    MMR maximal marginal relevance, feed diversity algorithm, prevent category flooding, echo chamber prevention, inject novelty, serendipity in ranked list
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

function tagJaccard(a: DiversifiableItem & { tagSet?: Set<string> }, b: DiversifiableItem & { tagSet?: Set<string> }): number {
  const setA = a.tagSet ?? new Set(a.tags);
  const setB = b.tagSet ?? new Set(b.tags);
  let intersection = 0;
  if (setA.size < setB.size) {
    for (const t of setA) if (setB.has(t)) intersection++;
  } else {
    for (const t of setB) if (setA.has(t)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
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

function itemSimilarity(a: DiversifiableItem & { tagSet?: Set<string> }, b: DiversifiableItem & { tagSet?: Set<string> }): number {
  if (a.embedding && b.embedding) {
    return cosineSimilarityVec(a.embedding, b.embedding);
  }
  return tagJaccard(a, b);
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
    const pos = Math.min((i + 1) * step + i, result.length);
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

    const maxScore = Math.max(...items.map((i) => Math.abs(i.score)), 1e-9);
    const normalized = items.map((i) => ({ ...i, score: i.score / maxScore, tagSet: new Set(i.tags) }));

    const selected: DiversifiableItem[] = [];
    const inSelected = new Set<number>();
    const candidates = [...normalized];
    const maxSims = new Array(candidates.length).fill(0);
    const categoryCount: Record<string, number> = {};
    const authorCount: Record<string, number> = {};

    while (
      selected.length < targetSize - Math.floor(targetSize * this.config.serendipityRatio)
    ) {
      let bestIdx = -1;
      let bestScore = -Infinity;

      for (let i = 0; i < candidates.length; i++) {
        if (inSelected.has(i)) continue;

        const relevance = candidates[i].score;
        const mmr = this.config.lambda * relevance - (1 - this.config.lambda) * maxSims[i];
        if (mmr > bestScore) { bestScore = mmr; bestIdx = i; }
      }

      if (bestIdx === -1) break;

      const item = candidates[bestIdx];
      const catCount = categoryCount[item.categoryId] ?? 0;
      const authCount = authorCount[item.authorId] ?? 0;

      if (catCount >= this.config.maxPerCategory || authCount >= this.config.maxPerAuthor) {
        inSelected.add(bestIdx);
        continue;
      }

      selected.push(item);
      inSelected.add(bestIdx);
      categoryCount[item.categoryId] = catCount + 1;
      authorCount[item.authorId] = authCount + 1;

      for (let i = 0; i < candidates.length; i++) {
        if (!inSelected.has(i)) {
          maxSims[i] = Math.max(maxSims[i], itemSimilarity(candidates[i], item));
        }
      }
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
