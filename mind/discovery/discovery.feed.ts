/**
 * @keywords    feed, content stream, pagination, cursor, infinite scroll, timeline, content ordering
 * @domain      Discovery Feed
 * @use-when    Building a paginated or cursor-based content feed with sorting and filtering
 * @not-when    You need algorithmic recommendations — use recommendation.engine.ts instead
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FeedItem {
  id: string;
  publishedAt: number; // Unix timestamp ms
  score: number;       // Pre-computed relevance or quality score
  type: string;        // "article" | "video" | "post" | any content type
  authorId: string;
  tags: string[];
  metadata: Record<string, unknown>;
}

export type SortStrategy = "chronological" | "score" | "trending" | "mixed";

export interface FeedCursor {
  lastId: string;
  lastValue: number; // Score or timestamp depending on sort
  page: number;
}

export interface FeedOptions {
  pageSize?: number;
  sort?: SortStrategy;
  cursor?: FeedCursor;
  filterTypes?: string[];
  filterTags?: string[];
  excludeIds?: Set<string>;
  timeWindowMs?: number; // Limit to items within this window (for trending)
  mixRatio?: number;     // 0–1: ratio of scored vs. chronological in "mixed" mode
}

export interface FeedPage {
  items: FeedItem[];
  nextCursor: FeedCursor | null;
  hasMore: boolean;
  totalEstimate?: number;
}

// ─── Trending Score ───────────────────────────────────────────────────────────

// Hacker News-style decay formula: score / (age_hours + 2)^gravity
function trendingScore(item: FeedItem, gravity = 1.8): number {
  const ageHours = (Date.now() - item.publishedAt) / 3_600_000;
  return item.score / Math.pow(ageHours + 2, gravity);
}

// ─── Sort Implementations ─────────────────────────────────────────────────────

type SortFn = (a: FeedItem, b: FeedItem) => number;

const sortFns: Record<SortStrategy, SortFn> = {
  chronological: (a, b) => b.publishedAt - a.publishedAt,
  score:         (a, b) => b.score - a.score,
  trending:      (a, b) => trendingScore(b) - trendingScore(a),
  mixed:         (a, b) => b.score - a.score, // overridden in buildFeed
};

// ─── Feed Builder ─────────────────────────────────────────────────────────────

export class FeedBuilder {
  private items: FeedItem[];

  constructor(items: FeedItem[]) {
    this.items = items;
  }

  build(options: FeedOptions = {}): FeedPage {
    const {
      pageSize = 20,
      sort = "chronological",
      cursor,
      filterTypes,
      filterTags,
      excludeIds,
      timeWindowMs,
      mixRatio = 0.6,
    } = options;

    let pool = [...this.items];

    // ─── Filtering ─────────────────────────────────────────────────────────

    if (filterTypes?.length) {
      const allowed = new Set(filterTypes);
      pool = pool.filter((i) => allowed.has(i.type));
    }

    if (filterTags?.length) {
      const required = new Set(filterTags);
      pool = pool.filter((i) => i.tags.some((t) => required.has(t)));
    }

    if (excludeIds?.size) {
      pool = pool.filter((i) => !excludeIds.has(i.id));
    }

    if (timeWindowMs) {
      const cutoff = Date.now() - timeWindowMs;
      pool = pool.filter((i) => i.publishedAt >= cutoff);
    }

    // ─── Sorting ───────────────────────────────────────────────────────────

    if (sort === "mixed") {
      // Interleave scored and chronological items
      const scored = [...pool].sort(sortFns.score);
      const chrono = [...pool].sort(sortFns.chronological);
      pool = interleaveMixed(scored, chrono, mixRatio);
    } else {
      pool = pool.sort(sortFns[sort]);
    }

    // ─── Cursor-based Pagination ───────────────────────────────────────────

    let startIdx = 0;
    if (cursor) {
      const idToIndex = new Map(pool.map((item, idx) => [item.id, idx]));
      const cursorIdx = idToIndex.get(cursor.lastId) ?? -1;
      startIdx = cursorIdx >= 0 ? cursorIdx + 1 : 0;
    }

    const pageItems = pool.slice(startIdx, startIdx + pageSize);
    const hasMore = startIdx + pageSize < pool.length;

    const lastItem = pageItems[pageItems.length - 1];
    const nextCursor: FeedCursor | null = hasMore && lastItem
      ? {
          lastId: lastItem.id,
          lastValue: sort === "chronological" ? lastItem.publishedAt : lastItem.score,
          page: (cursor?.page ?? 0) + 1,
        }
      : null;

    return {
      items: pageItems,
      nextCursor,
      hasMore,
      totalEstimate: pool.length,
    };
  }
}

// ─── Mixed Interleave ─────────────────────────────────────────────────────────

function interleaveMixed(
  scored: FeedItem[],
  chrono: FeedItem[],
  ratio: number
): FeedItem[] {
  // ratio = fraction of slots filled from scored list
  const seen = new Set<string>();
  const result: FeedItem[] = [];
  let si = 0;
  let ci = 0;
  const total = scored.length + chrono.length;

  for (let i = 0; i < total; i++) {
    // Ratio-based deterministic slot allocation (no randomness)
    const useScored = (si / (si + ci + 1)) < ratio;

    if (useScored) {
      while (si < scored.length && seen.has(scored[si].id)) si++;
      if (si < scored.length) { seen.add(scored[si].id); result.push(scored[si++]); continue; }
    }

    while (ci < chrono.length && seen.has(chrono[ci].id)) ci++;
    if (ci < chrono.length) { seen.add(chrono[ci].id); result.push(chrono[ci++]); }
  }

  return result;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createFeed(items: FeedItem[]): FeedBuilder {
  return new FeedBuilder(items);
}

/*
 * Usage Example:
 *
 * const feed = createFeed(allItems);
 *
 * // First page
 * const page1 = feed.build({ sort: "trending", pageSize: 20, filterTypes: ["article"] });
 *
 * // Next page using cursor
 * const page2 = feed.build({ sort: "trending", pageSize: 20, cursor: page1.nextCursor! });
 *
 * // Mixed feed: 60% scored, 40% chronological
 * const mixed = feed.build({ sort: "mixed", mixRatio: 0.6, pageSize: 30 });
 */
