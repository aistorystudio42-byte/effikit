/**
 * @keywords    adaptive content, dynamic adaptation, layout personalization, contextual rendering, user-driven UI
 * @domain      Personalization Adapt
 * @use-when    Dynamically adapting content, layout, or feature visibility based on user profile and context
 * @not-when    You need server-side A/B testing — use a feature flag system for that
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdaptationContext {
  userId: string;
  deviceType: "mobile" | "tablet" | "desktop";
  locale: string;
  timezone: string;
  hourOfDay: number;  // 0–23 local hour
  dayOfWeek: number;  // 0=Sun, 6=Sat
  interests: Record<string, number>;   // tag → affinity score
  categories: Record<string, number>;  // category → affinity score
  engagementScore: number;             // 0–1
  sessionCount: number;
  isNewUser: boolean;
  recentlyViewed: string[];            // Item IDs
}

export interface AdaptationRule<T = unknown> {
  id: string;
  priority: number;   // Higher = applied first; later rules can override
  condition: (ctx: AdaptationContext) => boolean;
  adapt: (value: T, ctx: AdaptationContext) => T;
}

export interface ContentSlot<T = unknown> {
  id: string;
  defaultValue: T;
  rules: AdaptationRule<T>[];
}

export interface AdaptedLayout {
  slots: Record<string, unknown>;
  appliedRules: Record<string, string[]>; // slotId → rule IDs applied
  context: Pick<AdaptationContext, "userId" | "deviceType" | "locale">;
}

// ─── AdaptationEngine ─────────────────────────────────────────────────────────

export class AdaptationEngine {
  private slots: Map<string, ContentSlot> = new Map();

  registerSlot<T>(slot: ContentSlot<T>): this {
    this.slots.set(slot.id, slot as ContentSlot);
    return this;
  }

  adapt(context: AdaptationContext): AdaptedLayout {
    const result: Record<string, unknown> = {};
    const appliedRules: Record<string, string[]> = {};

    for (const [slotId, slot] of this.slots) {
      let value = slot.defaultValue;
      const applied: string[] = [];

      // Sort rules by priority descending
      const sortedRules = [...slot.rules].sort((a, b) => b.priority - a.priority);

      for (const rule of sortedRules) {
        if (rule.condition(context)) {
          value = rule.adapt(value, context);
          applied.push(rule.id);
        }
      }

      result[slotId] = value;
      appliedRules[slotId] = applied;
    }

    return {
      slots: result,
      appliedRules,
      context: { userId: context.userId, deviceType: context.deviceType, locale: context.locale },
    };
  }
}

// ─── Content Adapter ──────────────────────────────────────────────────────────
// Adapts content feeds and item lists based on user profile

export interface ContentAdapterConfig {
  interestBoostMultiplier?: number;   // How much to boost matching content (default 1.5)
  diversityWeight?: number;           // How much to enforce diversity (0–1)
  newUserFallbackTags?: string[];     // Default tags to show new users
}

export class ContentAdapter {
  private config: Required<ContentAdapterConfig>;

  constructor(config: ContentAdapterConfig = {}) {
    this.config = {
      interestBoostMultiplier: config.interestBoostMultiplier ?? 1.5,
      diversityWeight: config.diversityWeight ?? 0.3,
      newUserFallbackTags: config.newUserFallbackTags ?? ["popular", "trending"],
    };
  }

  rankForUser<T extends { id: string; score: number; tags: string[]; categoryId: string }>(
    items: T[],
    context: AdaptationContext
  ): T[] {
    const interests = context.isNewUser
      ? Object.fromEntries(this.config.newUserFallbackTags.map((t) => [t, 0.7]))
      : context.interests;

    const scored = items.map((item) => {
      let score = item.score;

      // Boost by tag affinity
      const tagBoost = item.tags.reduce((s, tag) => {
        return s + (interests[tag] ?? 0);
      }, 0) / Math.max(item.tags.length, 1);

      // Boost by category affinity
      const catBoost = context.categories[item.categoryId] ?? 0;

      // Combined affinity
      const affinity = (tagBoost * 0.6 + catBoost * 0.4);
      score *= 1 + affinity * (this.config.interestBoostMultiplier - 1);

      // Penalize recently viewed items
      if (context.recentlyViewed.includes(item.id)) {
        score *= 0.3;
      }

      return { item, score };
    });

    // Sort by boosted score
    return scored.sort((a, b) => b.score - a.score).map((s) => ({ ...s.item, score: s.score }));
  }

  // Adapt UI configuration based on engagement level
  adaptUIConfig(context: AdaptationContext): UIConfig {
    const { engagementScore, isNewUser, deviceType } = context;

    return {
      showOnboarding:     isNewUser,
      showAdvancedFilters: engagementScore > 0.6,
      itemDensity: deviceType === "mobile"
        ? "compact"
        : engagementScore > 0.7 ? "dense" : "comfortable",
      featuredSlots: isNewUser ? 3 : engagementScore > 0.8 ? 1 : 2,
      autoplayEnabled: engagementScore > 0.5 && deviceType !== "mobile",
      notificationLevel: engagementScore > 0.7 ? "all" : engagementScore > 0.3 ? "important" : "minimal",
    };
  }
}

interface UIConfig {
  showOnboarding: boolean;
  showAdvancedFilters: boolean;
  itemDensity: "compact" | "comfortable" | "dense";
  featuredSlots: number;
  autoplayEnabled: boolean;
  notificationLevel: "all" | "important" | "minimal";
}

// ─── Temporal Adaptation ──────────────────────────────────────────────────────
// Adapts content and experience based on time of day and week

export interface TemporalConfig {
  [timeSlot: string]: {
    condition: (hour: number, day: number) => boolean;
    contentTags?: string[];
    layoutVariant?: string;
    notificationEnabled?: boolean;
  };
}

export const DEFAULT_TEMPORAL_CONFIG: TemporalConfig = {
  morning: {
    condition: (h) => h >= 6 && h < 10,
    contentTags: ["news", "briefing", "daily"],
    layoutVariant: "news-focused",
    notificationEnabled: true,
  },
  workday: {
    condition: (h, d) => h >= 10 && h < 17 && d >= 1 && d <= 5,
    contentTags: ["productivity", "learning", "tutorial"],
    layoutVariant: "minimal",
    notificationEnabled: false,
  },
  evening: {
    condition: (h) => h >= 17 && h < 21,
    contentTags: ["entertainment", "social", "trending"],
    layoutVariant: "rich-media",
    notificationEnabled: true,
  },
  late_night: {
    condition: (h) => h >= 21 || h < 6,
    contentTags: ["long-form", "deep-dive"],
    layoutVariant: "dark-relaxed",
    notificationEnabled: false,
  },
  weekend: {
    condition: (_, d) => d === 0 || d === 6,
    contentTags: ["leisure", "entertainment", "discovery"],
    layoutVariant: "discovery",
    notificationEnabled: true,
  },
};

export function getActiveTemporalSlot(
  hour: number,
  day: number,
  config = DEFAULT_TEMPORAL_CONFIG
): { name: string; contentTags: string[]; layoutVariant: string } | null {
  for (const [name, slot] of Object.entries(config)) {
    if (slot.condition(hour, day)) {
      return {
        name,
        contentTags: slot.contentTags ?? [],
        layoutVariant: slot.layoutVariant ?? "default",
      };
    }
  }
  return null;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createAdaptationEngine(): AdaptationEngine {
  return new AdaptationEngine();
}

export function createContentAdapter(config?: ContentAdapterConfig): ContentAdapter {
  return new ContentAdapter(config);
}

/*
 * Usage Example:
 *
 * const adapter = createContentAdapter({ interestBoostMultiplier: 2.0 });
 *
 * const personalized = adapter.rankForUser(feedItems, {
 *   userId: "user-42",
 *   interests: { "typescript": 0.9, "react": 0.8, "rust": 0.4 },
 *   categories: { "frontend": 0.85, "backend": 0.3 },
 *   engagementScore: 0.72,
 *   isNewUser: false,
 *   recentlyViewed: ["item-1", "item-2"],
 *   deviceType: "desktop",
 *   locale: "tr-TR",
 *   timezone: "Europe/Istanbul",
 *   hourOfDay: 14,
 *   dayOfWeek: 2,
 *   sessionCount: 28,
 * });
 *
 * // Temporal slot
 * const slot = getActiveTemporalSlot(9, 1); // 9am Monday
 * // { name: "morning", contentTags: ["news", "briefing", "daily"], layoutVariant: "news-focused" }
 */
