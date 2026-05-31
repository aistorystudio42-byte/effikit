/**
 * @keywords    inverted index, full-text search, TF-IDF, BM25, search index, posting list, in-memory search
 * @domain      Search Index
 * @use-when    Building an in-memory full-text search engine with TF-IDF or BM25 ranking
 * @not-when    You have millions of documents — use Elasticsearch, Typesense, or Meilisearch for that scale
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IndexedDocument {
  id: string;
  fields: Record<string, string>; // fieldName → text content
}

export interface SearchResult {
  id: string;
  score: number;
  matchedTerms: string[];
  fieldBreakdown: Record<string, number>; // Per-field score contribution
}

export interface IndexConfig {
  fields: Array<{
    name: string;
    weight: number;    // Boosts this field's contribution to score
    indexed: boolean;  // Whether to index this field
    stored: boolean;   // Whether to store raw value for retrieval
  }>;
  algorithm?: "tfidf" | "bm25";
  bm25?: { k1: number; b: number }; // BM25 hyperparams (k1=1.5, b=0.75 are defaults)
  tokenizer?: (text: string) => string[];
}

interface PostingEntry {
  docId: string;
  termFrequency: number;
  fieldName: string;
  positions: number[]; // Token positions for phrase matching
}

// ─── Default Tokenizer ────────────────────────────────────────────────────────

function defaultTokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

// ─── BM25 Scoring ──────────────────────────────────────────────────────────────
// Okapi BM25: state-of-the-art probabilistic relevance model

function bm25Score(
  tf: number,
  df: number,
  docCount: number,
  docLen: number,
  avgDocLen: number,
  k1: number,
  b: number
): number {
  const idf = Math.log((docCount - df + 0.5) / (df + 0.5) + 1);
  const tfNorm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgDocLen)));
  return idf * tfNorm;
}

// ─── TF-IDF Scoring ───────────────────────────────────────────────────────────

function tfidfScore(tf: number, df: number, docCount: number): number {
  const tfLog = 1 + Math.log(tf);
  const idf   = Math.log(docCount / (df + 1)) + 1;
  return tfLog * idf;
}

// ─── InvertedIndex ────────────────────────────────────────────────────────────

export class InvertedIndex {
  private config: Required<IndexConfig>;
  private index: Map<string, PostingEntry[]> = new Map();
  private docLengths: Map<string, Map<string, number>> = new Map(); // docId → field → tokenCount
  private docStore: Map<string, Record<string, string>> = new Map();
  private docCount = 0;

  constructor(config: IndexConfig) {
    this.config = {
      fields: config.fields,
      algorithm: config.algorithm ?? "bm25",
      bm25: config.bm25 ?? { k1: 1.5, b: 0.75 },
      tokenizer: config.tokenizer ?? defaultTokenize,
    };
  }

  add(doc: IndexedDocument): void {
    this.docCount++;
    const stored: Record<string, string> = {};
    const fieldLengths = new Map<string, number>();

    for (const fieldConfig of this.config.fields) {
      const text = doc.fields[fieldConfig.name] ?? "";

      if (fieldConfig.stored) stored[fieldConfig.name] = text;
      if (!fieldConfig.indexed) continue;

      const tokens = this.config.tokenizer(text);
      fieldLengths.set(fieldConfig.name, tokens.length);

      // Build term frequency map with positions
      const tfMap = new Map<string, { count: number; positions: number[] }>();
      tokens.forEach((token, pos) => {
        const entry = tfMap.get(token) ?? { count: 0, positions: [] };
        entry.count++;
        entry.positions.push(pos);
        tfMap.set(token, entry);
      });

      // Add to inverted index
      for (const [term, { count, positions }] of tfMap) {
        if (!this.index.has(term)) this.index.set(term, []);
        this.index.get(term)!.push({
          docId: doc.id,
          termFrequency: count,
          fieldName: fieldConfig.name,
          positions,
        });
      }
    }

    this.docStore.set(doc.id, stored);
    this.docLengths.set(doc.id, fieldLengths);
  }

  addMany(docs: IndexedDocument[]): void {
    docs.forEach((d) => this.add(d));
  }

  remove(docId: string): boolean {
    if (!this.docStore.has(docId)) return false;

    this.docStore.delete(docId);
    this.docLengths.delete(docId);
    this.docCount--;

    for (const [term, postings] of this.index) {
      const filtered = postings.filter((p) => p.docId !== docId);
      if (filtered.length === 0) this.index.delete(term);
      else this.index.set(term, filtered);
    }

    return true;
  }

  search(terms: string[], maxResults = 20): SearchResult[] {
    if (terms.length === 0 || this.docCount === 0) return [];

    const scores   = new Map<string, number>();
    const matched  = new Map<string, Set<string>>();
    const fieldBreaks = new Map<string, Record<string, number>>();

    // Compute average doc length per field for BM25
    const avgFieldLen: Record<string, number> = {};
    for (const fieldConfig of this.config.fields) {
      if (!fieldConfig.indexed) continue;
      const total = [...this.docLengths.values()].reduce(
        (s, fm) => s + (fm.get(fieldConfig.name) ?? 0), 0
      );
      avgFieldLen[fieldConfig.name] = total / Math.max(this.docCount, 1);
    }

    for (const term of terms) {
      const postings = this.index.get(term) ?? [];
      const df = new Set(postings.map((p) => p.docId)).size;

      for (const posting of postings) {
        const fieldConfig = this.config.fields.find((f) => f.name === posting.fieldName);
        const fieldWeight = fieldConfig?.weight ?? 1;
        const docLen = this.docLengths.get(posting.docId)?.get(posting.fieldName) ?? 1;

        let termScore: number;
        if (this.config.algorithm === "bm25") {
          termScore = bm25Score(
            posting.termFrequency, df, this.docCount, docLen,
            avgFieldLen[posting.fieldName] ?? 1,
            this.config.bm25.k1, this.config.bm25.b
          );
        } else {
          termScore = tfidfScore(posting.termFrequency, df, this.docCount);
        }

        const weighted = termScore * fieldWeight;
        scores.set(posting.docId, (scores.get(posting.docId) ?? 0) + weighted);

        // Track matched terms per doc
        if (!matched.has(posting.docId)) matched.set(posting.docId, new Set());
        matched.get(posting.docId)!.add(term);

        // Track per-field breakdown
        if (!fieldBreaks.has(posting.docId)) fieldBreaks.set(posting.docId, {});
        const fb = fieldBreaks.get(posting.docId)!;
        fb[posting.fieldName] = (fb[posting.fieldName] ?? 0) + weighted;
      }
    }

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxResults)
      .map(([id, score]) => ({
        id,
        score,
        matchedTerms: [...(matched.get(id) ?? [])],
        fieldBreakdown: fieldBreaks.get(id) ?? {},
      }));
  }

  // Retrieve stored field data for a document
  retrieve(docId: string): Record<string, string> | undefined {
    return this.docStore.get(docId);
  }

  get stats() {
    return {
      documentCount: this.docCount,
      uniqueTerms: this.index.size,
      storedDocuments: this.docStore.size,
    };
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createIndex(config: IndexConfig): InvertedIndex {
  return new InvertedIndex(config);
}

/*
 * Usage Example:
 *
 * const index = createIndex({
 *   algorithm: "bm25",
 *   fields: [
 *     { name: "title",   weight: 3.0, indexed: true, stored: true  },
 *     { name: "body",    weight: 1.0, indexed: true, stored: false },
 *     { name: "tags",    weight: 2.0, indexed: true, stored: true  },
 *   ],
 * });
 *
 * index.addMany([
 *   { id: "doc-1", fields: { title: "React Hooks Guide", body: "...", tags: "react hooks" } },
 *   { id: "doc-2", fields: { title: "Vue.js Introduction", body: "...", tags: "vue javascript" } },
 * ]);
 *
 * const results = index.search(["react", "hook"]);
 * // results[0].id === "doc-1", score reflects BM25 with field weights
 *
 * const title = index.retrieve("doc-1")?.title; // "React Hooks Guide"
 */
