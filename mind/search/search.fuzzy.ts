/**
 * @keywords    fuzzy search, Levenshtein, Jaro-Winkler, edit distance, typo tolerance, approximate matching
 * @domain      Search Fuzzy
 * @use-when    Searching with typo tolerance, autocorrect, or approximate string matching
 * @not-when    You need exact string matching — plain includes() or indexOf() is faster
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FuzzyMatch<T = string> {
  item: T;
  score: number;      // 0–1, higher = better match
  distance?: number;  // Edit distance (Levenshtein only)
  highlights?: number[][]; // Character ranges matched
}

export interface FuzzyOptions {
  threshold?: number;       // Minimum score to include in results (0–1)
  maxResults?: number;
  caseSensitive?: boolean;
  algorithm?: "levenshtein" | "jaro-winkler" | "ngram" | "bitap";
  weights?: {
    prefix?: number;        // Bonus for prefix matches (Jaro-Winkler p)
    sequential?: number;    // Bonus for sequential character matches
  };
}

// ─── Levenshtein Distance ──────────────────────────────────────────────────────
// Dynamic programming with O(m*n) time, O(min(m,n)) space

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Keep only two rows to minimize memory
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }

  return prev[b.length];
}

// Normalized Levenshtein similarity: 0–1 (1 = identical)
export function levenshteinSimilarity(a: string, b: string): number {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

// ─── Jaro-Winkler Similarity ──────────────────────────────────────────────────
// Better for short strings and names; rewards prefix matches

export function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  const len1 = s1.length, len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;

  const matchDist = Math.floor(Math.max(len1, len2) / 2) - 1;
  const safeMatchDist = Math.max(0, matchDist);
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  let matches = 0, transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - safeMatchDist);
    const end   = Math.min(i + safeMatchDist + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
}

export function jaroWinklerSimilarity(s1: string, s2: string, p = 0.1): number {
  const jaro = jaroSimilarity(s1, s2);
  let prefixLen = 0;
  const maxPrefix = Math.min(4, Math.min(s1.length, s2.length));
  while (prefixLen < maxPrefix && s1[prefixLen] === s2[prefixLen]) prefixLen++;
  return jaro + prefixLen * p * (1 - jaro);
}

// ─── N-gram Similarity ─────────────────────────────────────────────────────────
// Good for longer strings and substring matching

function ngrams(str: string, n: number): Set<string> {
  const grams = new Set<string>();
  for (let i = 0; i <= str.length - n; i++) {
    grams.add(str.slice(i, i + n));
  }
  return grams;
}

export function ngramSimilarity(a: string, b: string, n = 2): number {
  const ga = ngrams(a, n);
  const gb = ngrams(b, n);
  if (ga.size === 0 && gb.size === 0) return 1;
  if (ga.size === 0 || gb.size === 0) return 0;
  const intersection = [...ga].filter((g) => gb.has(g)).length;
  return (2 * intersection) / (ga.size + gb.size); // Sørensen–Dice coefficient
}

// ─── Bitap Algorithm ──────────────────────────────────────────────────────────
// Efficient for short patterns in longer texts; supports up to k errors

export function bitapSearch(text: string, pattern: string, maxErrors = 1): number {
  const m = pattern.length;
  if (m === 0) return 0;
  if (m > 31) return levenshtein(text, pattern) <= maxErrors ? 1 : 0; // Bitap in JS is limited to 31 chars due to 32-bit bitwise ops

  // Build character bitmask
  const patternMask: Record<string, number> = {};
  for (let i = 0; i < m; i++) {
    const c = pattern[i];
    patternMask[c] = (patternMask[c] ?? ~0) & ~(1 << i);
  }

  const R: number[] = new Array(maxErrors + 1).fill(~1);
  const accept = 1 << (m - 1);

  for (const c of text) {
    let oldRj = R[0];
    R[0] |= patternMask[c] ?? ~0;
    R[0] = (R[0] << 1) | 1;

    for (let e = 1; e <= maxErrors; e++) {
      const tmp = R[e];
      R[e] = ((R[e] | (patternMask[c] ?? ~0)) << 1) | 1;
      R[e] &= (oldRj << 1) | 1;     // Insertion
      R[e] &= (R[e - 1] << 1) | 1;  // Deletion
      oldRj = tmp;
    }

    if ((R[maxErrors] & accept) === 0) return 1; // Found with ≤ maxErrors
  }

  return 0; // Not found
}

// ─── FuzzySearch ──────────────────────────────────────────────────────────────

export class FuzzySearch<T = string> {
  private items: T[];
  private getString: (item: T) => string;
  private config: Required<FuzzyOptions>;

  constructor(
    items: T[],
    getString: (item: T) => string = (x) => String(x),
    options: FuzzyOptions = {}
  ) {
    this.items = items;
    this.getString = getString;
    this.config = {
      threshold: options.threshold ?? 0.5,
      maxResults: options.maxResults ?? 20,
      caseSensitive: options.caseSensitive ?? false,
      algorithm: options.algorithm ?? "jaro-winkler",
      weights: { prefix: 0.1, sequential: 0.05, ...options.weights },
    };
  }

  search(query: string): FuzzyMatch<T>[] {
    const q = this.config.caseSensitive ? query : query.toLowerCase();

    const scored: FuzzyMatch<T>[] = [];

    for (const item of this.items) {
      const str = this.config.caseSensitive ? this.getString(item) : this.getString(item).toLowerCase();
      let score: number;

      switch (this.config.algorithm) {
        case "levenshtein":  score = levenshteinSimilarity(q, str); break;
        case "jaro-winkler": score = jaroWinklerSimilarity(q, str, this.config.weights.prefix); break;
        case "ngram":        score = ngramSimilarity(q, str); break;
        case "bitap":        score = bitapSearch(str, q) > 0 ? 1 : levenshteinSimilarity(q, str); break;
      }

      // Bonus for substring containment
      if (str.includes(q)) score = Math.min(1, score + 0.2);

      if (score >= this.config.threshold) {
        scored.push({ item, score, distance: levenshtein(q, str) });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.maxResults);
  }

  // Update items without creating a new instance
  update(items: T[]): void { this.items = items; }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createFuzzySearch<T = string>(
  items: T[],
  getString?: (item: T) => string,
  options?: FuzzyOptions
): FuzzySearch<T> {
  return new FuzzySearch(items, getString, options);
}

/*
 * Usage Example:
 *
 * const search = createFuzzySearch(
 *   [{ id: "1", name: "TypeScript" }, { id: "2", name: "JavaScript" }],
 *   (item) => item.name,
 *   { algorithm: "jaro-winkler", threshold: 0.6 }
 * );
 *
 * search.search("typscript");  // typo tolerance → [{ item: {name:"TypeScript"}, score: 0.94 }]
 * search.search("java");       // → [{ item: {name:"JavaScript"}, score: 0.71 }]
 *
 * // Raw distance functions
 * levenshtein("kitten", "sitting");            // → 3
 * jaroWinklerSimilarity("MARTHA", "MARHTA");   // → 0.961
 * ngramSimilarity("hello world", "helo wrld"); // → 0.78
 */
