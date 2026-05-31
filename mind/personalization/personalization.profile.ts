/**
 * @keywords    user profile, interest model, preference learning, taste graph, user representation
 * @domain      Personalization Profile
 * @use-when    Building and maintaining a dynamic user interest profile from interaction signals
 * @not-when    You only need simple tag following — this is for weighted, decaying multi-dimensional profiles
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type InteractionType = "view" | "like" | "share" | "save" | "click" | "skip" | "dislike" | "comment";

export interface Interaction {
  itemId: string;
  type: InteractionType;
  tags: string[];
  categoryId: string;
  authorId?: string;
  timestamp: number; // Unix ms
  durationMs?: number; // Time spent (for view events)
}

export interface InterestVector {
  tags: Record<string, number>;       // tag → affinity score (0–1)
  categories: Record<string, number>; // category → affinity score
  authors: Record<string, number>;    // author → affinity score
}

export interface UserProfile {
  userId: string;
  interests: InterestVector;
  disliked: { tags: Set<string>; categories: Set<string>; authors: Set<string> };
  recentItems: string[];     // Last N seen item IDs (sliding window)
  updatedAt: number;
  totalInteractions: number;
}

export interface ProfileConfig {
  interactionWeights?: Partial<Record<InteractionType, number>>;
  decayHalfLifeMs?: number;   // How fast old interactions lose influence
  maxRecentItems?: number;    // Sliding window size
  minAffinityThreshold?: number; // Prune tags/categories below this score
}

// ─── Default Interaction Weights ──────────────────────────────────────────────

const DEFAULT_WEIGHTS: Record<InteractionType, number> = {
  view:     0.1,
  click:    0.2,
  like:     0.6,
  save:     0.7,
  comment:  0.5,
  share:    0.8,
  skip:    -0.1,
  dislike: -0.5,
};

// ─── Decay Function ───────────────────────────────────────────────────────────

function decayWeight(timestamp: number, halfLifeMs: number, nowMs = Date.now()): number {
  const ageMs = Math.max(0, nowMs - timestamp);
  return Math.exp((-Math.LN2 / halfLifeMs) * ageMs);
}

// ─── UserProfileBuilder ───────────────────────────────────────────────────────

export class UserProfileBuilder {
  private config: Required<ProfileConfig>;

  constructor(config: ProfileConfig = {}) {
    this.config = {
      interactionWeights: { ...DEFAULT_WEIGHTS, ...config.interactionWeights },
      decayHalfLifeMs: config.decayHalfLifeMs ?? 7 * 86_400_000, // 7-day half-life
      maxRecentItems: config.maxRecentItems ?? 200,
      minAffinityThreshold: config.minAffinityThreshold ?? 0.01,
    };
  }

  createEmpty(userId: string): UserProfile {
    return {
      userId,
      interests: { tags: {}, categories: {}, authors: {} },
      disliked: { tags: new Set(), categories: new Set(), authors: new Set() },
      recentItems: [],
      updatedAt: Date.now(),
      totalInteractions: 0,
    };
  }

  applyInteraction(profile: UserProfile, interaction: Interaction): UserProfile {
    const baseWeight = this.config.interactionWeights[interaction.type] ?? 0;
    const decay      = decayWeight(interaction.timestamp, this.config.decayHalfLifeMs);
    const signal     = baseWeight * decay;

    // Duration bonus for view events (longer view = higher signal)
    const durationBonus = interaction.type === "view" && interaction.durationMs
      ? Math.min(0.3, interaction.durationMs / 60_000) // Cap at 1 min = +0.3
      : 0;

    const totalSignal = signal + durationBonus;

    // Negative interactions → disliked sets
    if (totalSignal < -0.3) {
      if (interaction.authorId) profile.disliked.authors.add(interaction.authorId);
      if (Math.abs(totalSignal) > 0.4) {
        interaction.tags.forEach((t) => profile.disliked.tags.add(t));
        profile.disliked.categories.add(interaction.categoryId);
      }
    }

    // Update interest vectors (positive and mild negative)
    this.updateVector(profile.interests.tags, interaction.tags, totalSignal, (t) => t);
    this.updateVector(profile.interests.categories, [interaction.categoryId], totalSignal, (c) => c);
    if (interaction.authorId) {
      this.updateVector(profile.interests.authors, [interaction.authorId], totalSignal, (a) => a);
    }

    // Maintain sliding window of recent items
    profile.recentItems.unshift(interaction.itemId);
    if (profile.recentItems.length > this.config.maxRecentItems) {
      profile.recentItems.pop();
    }

    profile.totalInteractions++;
    profile.updatedAt = Date.now();

    // Prune low-affinity entries
    this.pruneVector(profile.interests.tags);
    this.pruneVector(profile.interests.categories);
    this.pruneVector(profile.interests.authors);

    return profile;
  }

  buildFromHistory(userId: string, interactions: Interaction[]): UserProfile {
    const profile = this.createEmpty(userId);
    // Sort chronologically so decay is applied correctly
    const sorted = [...interactions].sort((a, b) => a.timestamp - b.timestamp);
    for (const interaction of sorted) {
      this.applyInteraction(profile, interaction);
    }
    return profile;
  }

  // Merge two profiles (useful for cross-device identity resolution)
  merge(primary: UserProfile, secondary: UserProfile): UserProfile {
    const merged: UserProfile = {
      userId: primary.userId,
      interests: {
        tags:       mergeVectors(primary.interests.tags, secondary.interests.tags),
        categories: mergeVectors(primary.interests.categories, secondary.interests.categories),
        authors:    mergeVectors(primary.interests.authors, secondary.interests.authors),
      },
      disliked: {
        tags:       new Set([...primary.disliked.tags, ...secondary.disliked.tags]),
        categories: new Set([...primary.disliked.categories, ...secondary.disliked.categories]),
        authors:    new Set([...primary.disliked.authors, ...secondary.disliked.authors]),
      },
      recentItems: [...new Set([...primary.recentItems, ...secondary.recentItems])].slice(0, this.config.maxRecentItems),
      updatedAt: Math.max(primary.updatedAt, secondary.updatedAt),
      totalInteractions: primary.totalInteractions + secondary.totalInteractions,
    };
    return merged;
  }

  // Return top-N tags/categories sorted by affinity
  topInterests(
    profile: UserProfile,
    topN = 10
  ): { tags: Array<[string, number]>; categories: Array<[string, number]> } {
    const sortByScore = (v: Record<string, number>) =>
      Object.entries(v).sort((a, b) => b[1] - a[1]).slice(0, topN);

    return {
      tags:       sortByScore(profile.interests.tags),
      categories: sortByScore(profile.interests.categories),
    };
  }

  private updateVector(
    vector: Record<string, number>,
    keys: string[],
    signal: number,
    normalize: (k: string) => string
  ): void {
    for (const key of keys) {
      const k = normalize(key);
      const current = vector[k] ?? 0;
      // Exponential moving average update: blend new signal with existing score
      vector[k] = Math.max(-1, Math.min(1, current + signal * (1 - Math.abs(current))));
    }
  }

  private pruneVector(vector: Record<string, number>): void {
    for (const key of Object.keys(vector)) {
      if (Math.abs(vector[key]) < this.config.minAffinityThreshold) {
        delete vector[key];
      }
    }
  }
}

function mergeVectors(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const result = { ...a };
  for (const [k, v] of Object.entries(b)) {
    result[k] = ((result[k] ?? 0) + v) / 2;
  }
  return result;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createProfileBuilder(config?: ProfileConfig): UserProfileBuilder {
  return new UserProfileBuilder(config);
}

/*
 * Usage Example:
 *
 * const builder = createProfileBuilder({ decayHalfLifeMs: 3 * 86_400_000 });
 *
 * const profile = builder.buildFromHistory("user-42", [
 *   { itemId: "a", type: "like",  tags: ["react"], categoryId: "frontend", timestamp: Date.now() - 3_600_000 },
 *   { itemId: "b", type: "share", tags: ["typescript"], categoryId: "frontend", timestamp: Date.now() },
 *   { itemId: "c", type: "skip",  tags: ["php"], categoryId: "backend", timestamp: Date.now() },
 * ]);
 *
 * const { tags } = builder.topInterests(profile, 5);
 * // tags: [["typescript", 0.8], ["react", 0.6], ...]
 */
