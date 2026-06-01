/**
 * @keywords    pin item to top, promote content, sponsored placement, editorial boost, manual rank override, A/B test boost, force item position
 * @domain      Ranking Boost
 * @use-when    Applying business rules, editorial picks, sponsored content, or A/B test boosts to a ranked list
 * @not-when    You need algorithmic scoring — run ranking first, then apply boosts as post-processing
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Boostable {
  id: string;
  score: number;
  tags?: string[];
  categoryId?: string;
  authorId?: string;
  metadata?: Record<string, unknown>;
}

export type BoostRuleType = "id" | "tag" | "category" | "author" | "predicate";

export interface BoostRule {
  type: BoostRuleType;
  target?: string;                          // For id/tag/category/author match
  predicate?: (item: Boostable) => boolean; // For type="predicate"
  multiplier?: number;                      // Score *= multiplier
  additive?: number;                        // Score += additive
  pin?: number;                             // Force position (1-indexed, 0 = no pin)
  expiresAt?: number;                       // Unix ms — rule inactive after this
  label?: string;                           // For logging/debugging
}

export interface BoostResult {
  id: string;
  originalScore: number;
  boostedScore: number;
  pinnedPosition: number | null;
  appliedRules: string[];
}

// ─── Rule Matching ────────────────────────────────────────────────────────────

function ruleMatches(rule: BoostRule, item: Boostable): boolean {
  if (rule.expiresAt && Date.now() > rule.expiresAt) return false;

  switch (rule.type) {
    case "id":        return item.id === rule.target;
    case "tag":       return item.tags?.includes(rule.target ?? "") ?? false;
    case "category":  return item.categoryId === rule.target;
    case "author":    return item.authorId === rule.target;
    case "predicate": return rule.predicate ? rule.predicate(item) : false;
  }
}

// ─── BoostEngine ──────────────────────────────────────────────────────────────

export class BoostEngine {
  private rules: BoostRule[];

  constructor(rules: BoostRule[] = []) {
    this.rules = rules;
  }

  addRule(rule: BoostRule): this {
    this.rules.push(rule);
    return this;
  }

  removeRule(label: string): this {
    if (!label) return this;
    this.rules = this.rules.filter((r) => r.label !== label);
    return this;
  }

  // Purge expired rules
  pruneExpired(): number {
    const before = this.rules.length;
    this.rules = this.rules.filter((r) => !r.expiresAt || Date.now() <= r.expiresAt);
    return before - this.rules.length;
  }

  apply(items: Boostable[]): Array<Boostable & BoostResult> {
    const results: Array<Boostable & BoostResult> = items.map((item) => {
      let score = item.score;
      const appliedRules: string[] = [];
      let pinnedPosition: number | null = null;

      for (const rule of this.rules) {
        if (!ruleMatches(rule, item)) continue;

        if (rule.multiplier !== undefined) score *= rule.multiplier;
        if (rule.additive   !== undefined) score += rule.additive;
        if (rule.pin        !== undefined && rule.pin > 0) pinnedPosition = rule.pin;

        appliedRules.push(rule.label ?? rule.type);
      }

      return {
        ...item,
        originalScore: item.score,
        boostedScore: score,
        score,  // Update in-place for downstream sorting
        pinnedPosition,
        appliedRules,
      };
    });

    return this.sortWithPins(results);
  }

  private sortWithPins(
    items: Array<Boostable & BoostResult>
  ): Array<Boostable & BoostResult> {
    const pinned = items
      .filter((i) => i.pinnedPosition !== null)
      .sort((a, b) => {
        if (a.pinnedPosition === b.pinnedPosition) return b.boostedScore - a.boostedScore;
        return (a.pinnedPosition ?? 0) - (b.pinnedPosition ?? 0);
      });
      
    const unpinned = items
      .filter((i) => i.pinnedPosition === null)
      .sort((a, b) => b.boostedScore - a.boostedScore);

    const result: Array<Boostable & BoostResult> = [];
    let unpinnedIdx = 0;

    for (const p of pinned) {
      const targetIdx = Math.max(0, (p.pinnedPosition ?? 1) - 1);
      while (result.length < targetIdx && unpinnedIdx < unpinned.length) {
        result.push(unpinned[unpinnedIdx++]);
      }
      result.push(p);
    }

    while (unpinnedIdx < unpinned.length) {
      result.push(unpinned[unpinnedIdx++]);
    }

    return result;
  }
}

// ─── A/B Boost Experiment ─────────────────────────────────────────────────────
// Applies different boost rules to different user segments for experimentation

export interface ABBoostVariant {
  name: string;
  rules: BoostRule[];
  trafficFraction: number; // 0–1
}

export class ABBoostExperiment {
  private variants: ABBoostVariant[];
  private engines: Map<string, BoostEngine> = new Map();

  constructor(variants: ABBoostVariant[]) {
    // Normalize traffic fractions
    const totalTraffic = variants.reduce((s, v) => s + v.trafficFraction, 0);
    this.variants = variants.map((v) => ({
      ...v,
      trafficFraction: v.trafficFraction / totalTraffic,
    }));

    for (const v of this.variants) {
      this.engines.set(v.name, new BoostEngine(v.rules));
    }
  }

  // Deterministically assign a user to a variant based on user ID hash
  assignVariant(userId: string): string {
    const hash = userId.split("").reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0);
    const normalized = (Math.abs(hash) % 10000) / 10000;

    let cumulative = 0;
    for (const v of this.variants) {
      cumulative += v.trafficFraction;
      if (normalized < cumulative) return v.name;
    }
    return this.variants[this.variants.length - 1].name;
  }

  applyForUser(userId: string, items: Boostable[]): {
    variant: string;
    items: Array<Boostable & BoostResult>;
  } {
    const variant = this.assignVariant(userId);
    const engine = this.engines.get(variant)!;
    return { variant, items: engine.apply(items) };
  }
}

// ─── Prebuilt Rule Factories ──────────────────────────────────────────────────

export const BoostRules = {
  pin:       (id: string, position: number, label?: string): BoostRule =>
    ({ type: "id", target: id, pin: position, label: label ?? `pin:${id}` }),

  sponsoredId: (id: string, multiplier = 2.0, expiresAt?: number): BoostRule =>
    ({ type: "id", target: id, multiplier, label: `sponsored:${id}`, expiresAt }),

  categoryBoost: (categoryId: string, multiplier: number): BoostRule =>
    ({ type: "category", target: categoryId, multiplier, label: `cat:${categoryId}` }),

  tagPenalty: (tag: string, multiplier: number): BoostRule =>
    ({ type: "tag", target: tag, multiplier, label: `tag-penalty:${tag}` }),

  freshBoost: (maxAgeMs = 3_600_000, additive = 10): BoostRule => ({
    type: "predicate",
    predicate: (item) => {
      const ts = (item.metadata?.publishedAt as number | undefined) ?? 0;
      return ts > 0 && Date.now() - ts < maxAgeMs;
    },
    additive,
    label: "fresh-boost",
  }),
} as const;

/*
 * Usage Example:
 *
 * const engine = new BoostEngine([
 *   BoostRules.pin("featured-post", 1),
 *   BoostRules.sponsoredId("ad-123", 1.5, Date.now() + 86_400_000),
 *   BoostRules.categoryBoost("breaking-news", 1.3),
 *   BoostRules.tagPenalty("clickbait", 0.5),
 *   BoostRules.freshBoost(30 * 60_000, 20),
 * ]);
 *
 * const boosted = engine.apply(rankedItems);
 * // featured-post is at position 1, ad-123 score is 1.5×, clickbait items are penalized
 *
 * // A/B test: 50% get category boost, 50% get fresh boost
 * const experiment = new ABBoostExperiment([
 *   { name: "control",   rules: [],                              trafficFraction: 0.5 },
 *   { name: "treatment", rules: [BoostRules.freshBoost()],       trafficFraction: 0.5 },
 * ]);
 * const { variant, items } = experiment.applyForUser(userId, rankedItems);
 */
