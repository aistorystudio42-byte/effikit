/**
 * @keywords    recommendation, collaborative filtering, content-based, cosine similarity, user-item matrix, hybrid engine
 * @domain      Recommendation Engine
 * @use-when    Building a recommendation system that suggests items to users based on behavior and preferences
 * @not-when    You only need simple popularity-based sorting — use ranking.score.ts instead
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  userId: string;
  ratings: Record<string, number>; // itemId → rating (1–5)
  tags: string[];                   // explicit interest tags
}

export interface Item {
  itemId: string;
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface Recommendation {
  itemId: string;
  score: number;
  strategy: "collaborative" | "content" | "hybrid";
  confidence: number;
}

export interface EngineConfig {
  collaborativeWeight: number; // 0–1, weight for collaborative filtering
  contentWeight: number;       // 0–1, weight for content-based filtering
  minSimilarityThreshold: number;
  maxNeighbors: number;
  maxResults: number;
}

// ─── Math Utilities ───────────────────────────────────────────────────────────

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
}

function magnitude(v: number[]): number {
  return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
}

// Cosine similarity between two sparse rating vectors
function cosineSimilarity(
  a: Record<string, number>,
  b: Record<string, number>
): number {
  const commonKeys = Object.keys(a).filter((k) => k in b);
  if (commonKeys.length === 0) return 0;

  const vecA = commonKeys.map((k) => a[k]);
  const vecB = commonKeys.map((k) => b[k]);

  const mag = magnitude(vecA) * magnitude(vecB);
  return mag === 0 ? 0 : dotProduct(vecA, vecB) / mag;
}

// Jaccard similarity for tag sets
function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

// ─── Collaborative Filtering ──────────────────────────────────────────────────

function findSimilarUsers(
  target: UserProfile,
  allUsers: UserProfile[],
  maxNeighbors: number,
  minThreshold: number
): Array<{ user: UserProfile; similarity: number }> {
  return allUsers
    .filter((u) => u.userId !== target.userId)
    .map((u) => ({ user: u, similarity: cosineSimilarity(target.ratings, u.ratings) }))
    .filter((x) => x.similarity >= minThreshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxNeighbors);
}

function collaborativeScore(
  itemId: string,
  neighbors: Array<{ user: UserProfile; similarity: number }>
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const { user, similarity } of neighbors) {
    const rating = user.ratings[itemId];
    if (rating !== undefined) {
      weightedSum += similarity * rating;
      totalWeight += Math.abs(similarity);
    }
  }

  return totalWeight === 0 ? 0 : weightedSum / totalWeight;
}

// ─── Content-Based Filtering ──────────────────────────────────────────────────

function buildUserTagProfile(user: UserProfile, allItems: Item[]): Record<string, number> {
  // Weight tags by rating of items containing them
  const tagScores: Record<string, number[]> = {};

  for (const item of allItems) {
    const rating = user.ratings[item.itemId];
    if (rating === undefined) continue;
    for (const tag of item.tags) {
      if (!tagScores[tag]) tagScores[tag] = [];
      tagScores[tag].push(rating);
    }
  }

  // Average rating per tag → tag affinity score
  const profile: Record<string, number> = {};
  for (const [tag, ratings] of Object.entries(tagScores)) {
    profile[tag] = ratings.reduce((s, r) => s + r, 0) / ratings.length;
  }
  return profile;
}

function contentScore(item: Item, userTagProfile: Record<string, number>): number {
  if (item.tags.length === 0) return 0;
  const tagScores = item.tags.map((t) => userTagProfile[t] ?? 0);
  return tagScores.reduce((s, v) => s + v, 0) / item.tags.length;
}

// ─── Recommendation Engine ────────────────────────────────────────────────────

export class RecommendationEngine {
  private config: EngineConfig;

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = {
      collaborativeWeight: config.collaborativeWeight ?? 0.6,
      contentWeight: config.contentWeight ?? 0.4,
      minSimilarityThreshold: config.minSimilarityThreshold ?? 0.1,
      maxNeighbors: config.maxNeighbors ?? 50,
      maxResults: config.maxResults ?? 20,
    };

    // Normalize weights to sum to 1
    const total = this.config.collaborativeWeight + this.config.contentWeight;
    this.config.collaborativeWeight /= total;
    this.config.contentWeight /= total;
  }

  recommend(
    targetUser: UserProfile,
    allUsers: UserProfile[],
    allItems: Item[],
    excludeRated = true
  ): Recommendation[] {
    const ratedItems = new Set(Object.keys(targetUser.ratings));
    const candidates = excludeRated
      ? allItems.filter((item) => !ratedItems.has(item.itemId))
      : allItems;

    // Collaborative: find neighbors and predict ratings
    const neighbors = findSimilarUsers(
      targetUser,
      allUsers,
      this.config.maxNeighbors,
      this.config.minSimilarityThreshold
    );

    // Content-based: build tag affinity profile
    const tagProfile = buildUserTagProfile(targetUser, allItems);

    const recommendations: Recommendation[] = candidates.map((item) => {
      const collabScore = collaborativeScore(item.itemId, neighbors);
      const contScore = contentScore(item, tagProfile);

      // Hybrid: weighted combination
      const hybridScore =
        this.config.collaborativeWeight * collabScore +
        this.config.contentWeight * contScore;

      // Confidence: how many neighbors rated this item
      const raterCount = neighbors.filter((n) => item.itemId in n.user.ratings).length;
      const confidence = Math.min(raterCount / Math.max(neighbors.length, 1), 1);

      const strategy =
        collabScore === 0 ? "content" : contScore === 0 ? "collaborative" : "hybrid";

      return { itemId: item.itemId, score: hybridScore, strategy, confidence };
    });

    return recommendations
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.maxResults);
  }

  // Compute item-to-item similarity for "similar items" features
  itemSimilarity(itemA: Item, itemB: Item): number {
    return jaccardSimilarity(itemA.tags, itemB.tags);
  }

  // Find items similar to a given item
  similarItems(target: Item, allItems: Item[], topK = 10): Array<{ item: Item; similarity: number }> {
    return allItems
      .filter((i) => i.itemId !== target.itemId)
      .map((i) => ({ item: i, similarity: this.itemSimilarity(target, i) }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createEngine(config?: Partial<EngineConfig>): RecommendationEngine {
  return new RecommendationEngine(config);
}

/*
 * Usage Example:
 *
 * const engine = createEngine({ collaborativeWeight: 0.7, contentWeight: 0.3, maxResults: 10 });
 *
 * const recs = engine.recommend(currentUser, allUsers, allItems);
 * // [{ itemId: "item-42", score: 0.87, strategy: "hybrid", confidence: 0.6 }, ...]
 *
 * const similar = engine.similarItems(selectedItem, allItems, 5);
 * // [{ item: { itemId: "item-7", tags: [...] }, similarity: 0.75 }, ...]
 */
