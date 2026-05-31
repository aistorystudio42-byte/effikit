/**
 * @keywords    filter, rule engine, output filtering, diversity, deduplication, blacklist, post-processing
 * @domain      Recommendation Filter
 * @use-when    Post-processing recommendation results: dedup, diversity enforcement, business rules, blacklists
 * @not-when    You need to generate scores — use recommendation.engine.ts or recommendation.scoring.ts
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterableItem {
  id: string;
  score: number;
  tags: string[];
  categoryId?: string;
  authorId?: string;
  publishedAt?: number; // Unix timestamp
  metadata: Record<string, unknown>;
}

export interface FilterRule {
  name: string;
  enabled: boolean;
  apply: (items: FilterableItem[], context: FilterContext) => FilterableItem[];
}

export interface FilterContext {
  userId?: string;
  seenItemIds?: Set<string>;
  blacklistedIds?: Set<string>;
  blacklistedTags?: Set<string>;
  maxPerCategory?: number;
  maxPerAuthor?: number;
  diversityAlpha?: number; // 0 = pure relevance, 1 = maximum diversity (MMR)
  minPublishedAt?: number;
  maxResults?: number;
}

// ─── Rule Implementations ─────────────────────────────────────────────────────

// Remove items the user has already seen
const seenFilter: FilterRule = {
  name: "seen-filter",
  enabled: true,
  apply: (items, ctx) => {
    if (!ctx.seenItemIds?.size) return items;
    return items.filter((i) => !ctx.seenItemIds!.has(i.id));
  },
};

// Remove explicitly blacklisted item IDs
const blacklistFilter: FilterRule = {
  name: "blacklist-filter",
  enabled: true,
  apply: (items, ctx) => {
    if (!ctx.blacklistedIds?.size) return items;
    return items.filter((i) => !ctx.blacklistedIds!.has(i.id));
  },
};

// Remove items containing blacklisted tags
const tagFilter: FilterRule = {
  name: "tag-filter",
  enabled: true,
  apply: (items, ctx) => {
    if (!ctx.blacklistedTags?.size) return items;
    return items.filter((i) => !i.tags.some((t) => ctx.blacklistedTags!.has(t)));
  },
};

// Enforce max items per category to avoid category flooding
const categoryCapFilter: FilterRule = {
  name: "category-cap",
  enabled: true,
  apply: (items, ctx) => {
    if (!ctx.maxPerCategory) return items;
    const count: Record<string, number> = {};
    return items.filter((i) => {
      const cat = i.categoryId ?? "__none__";
      count[cat] = (count[cat] ?? 0) + 1;
      return count[cat] <= ctx.maxPerCategory!;
    });
  },
};

// Enforce max items per author
const authorCapFilter: FilterRule = {
  name: "author-cap",
  enabled: true,
  apply: (items, ctx) => {
    if (!ctx.maxPerAuthor) return items;
    const count: Record<string, number> = {};
    return items.filter((i) => {
      const auth = i.authorId ?? "__none__";
      count[auth] = (count[auth] ?? 0) + 1;
      return count[auth] <= ctx.maxPerAuthor!;
    });
  },
};

// Remove items older than a minimum publish date
const recencyFilter: FilterRule = {
  name: "recency-filter",
  enabled: true,
  apply: (items, ctx) => {
    if (!ctx.minPublishedAt) return items;
    return items.filter((i) => (i.publishedAt ?? Infinity) >= ctx.minPublishedAt!);
  },
};

// ─── Maximal Marginal Relevance (MMR) Diversity ───────────────────────────────
// Balances relevance with diversity: penalizes items too similar to already-selected ones

function tagOverlap(a: FilterableItem, b: FilterableItem): number {
  const setA = new Set(a.tags);
  const intersection = b.tags.filter((t) => setA.has(t)).length;
  const union = new Set([...a.tags, ...b.tags]).size;
  return union === 0 ? 0 : intersection / union;
}

const diversityFilter: FilterRule = {
  name: "mmr-diversity",
  enabled: true,
  apply: (items, ctx) => {
    const alpha = ctx.diversityAlpha ?? 0;
    if (alpha === 0 || items.length === 0) return items;

    const maxScore = Math.max(...items.map((i) => Math.abs(i.score)), 1e-9);
    const selected: FilterableItem[] = [];
    const inSelected = new Set<number>();
    const candidates = [...items];

    while (selected.length < (ctx.maxResults ?? items.length)) {
      let bestIdx = -1;
      let bestMMR = -Infinity;

      for (let i = 0; i < candidates.length; i++) {
        if (inSelected.has(i)) continue;

        const relevance = candidates[i].score / maxScore;
        const maxSim = selected.length === 0
          ? 0
          : Math.max(...selected.map((s) => tagOverlap(candidates[i], s)));

        const mmr = alpha * relevance - (1 - alpha) * maxSim;
        if (mmr > bestMMR) { bestMMR = mmr; bestIdx = i; }
      }

      if (bestIdx === -1) break;
      selected.push(candidates[bestIdx]);
      inSelected.add(bestIdx);
    }

    return selected;
  },
};

// ─── FilterPipeline ───────────────────────────────────────────────────────────

export class FilterPipeline {
  private rules: FilterRule[];

  constructor(rules: FilterRule[] = defaultRules()) {
    this.rules = rules;
  }

  addRule(rule: FilterRule): this {
    this.rules.push(rule);
    return this;
  }

  disableRule(name: string): this {
    const rule = this.rules.find((r) => r.name === name);
    if (rule) rule.enabled = false;
    return this;
  }

  apply(items: FilterableItem[], context: FilterContext): FilterableItem[] {
    let result = [...items];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      result = rule.apply(result, context);
    }

    // Final result cap
    if (context.maxResults) result = result.slice(0, context.maxResults);
    return result;
  }
}

function defaultRules(): FilterRule[] {
  return [
    { ...seenFilter },
    { ...blacklistFilter },
    { ...tagFilter },
    { ...recencyFilter },
    { ...categoryCapFilter },
    { ...authorCapFilter },
    { ...diversityFilter },
  ];
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createFilterPipeline(rules?: FilterRule[]): FilterPipeline {
  return new FilterPipeline(rules);
}

/*
 * Usage Example:
 *
 * const pipeline = createFilterPipeline();
 *
 * const filtered = pipeline.apply(recommendations, {
 *   seenItemIds: new Set(["item-1", "item-2"]),
 *   blacklistedTags: new Set(["nsfw", "spam"]),
 *   maxPerCategory: 3,
 *   maxPerAuthor: 2,
 *   diversityAlpha: 0.4,  // 40% diversity boost via MMR
 *   maxResults: 10,
 * });
 *
 * // Add a custom rule:
 * pipeline.addRule({
 *   name: "premium-only",
 *   enabled: true,
 *   apply: (items) => items.filter((i) => i.metadata.isPremium),
 * });
 */
