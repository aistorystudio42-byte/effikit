/**
 * @keywords    query parsing, tokenization, normalization, query DSL, search query, stemming, stop words
 * @domain      Search Query
 * @use-when    Parsing and normalizing raw search strings into structured query objects before indexing or searching
 * @not-when    You're using a search engine like Elasticsearch that handles query parsing internally
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type TokenType = "term" | "phrase" | "field" | "operator" | "wildcard" | "negation";

export interface Token {
  type: TokenType;
  value: string;
  field?: string;     // For field-specific tokens: title:"hello world"
  negated?: boolean;  // Prefixed with - or NOT
}

export interface ParsedQuery {
  raw: string;
  tokens: Token[];
  terms: string[];        // Simple normalized terms
  phrases: string[];      // Quoted phrases
  fields: Record<string, string[]>; // field → terms
  negated: string[];      // Excluded terms
  wildcards: string[];    // Terms containing * or ?
  hasWildcard: boolean;
  isEmpty: boolean;
}

export interface QueryParserConfig {
  stopWords?: Set<string>;
  stemmer?: (word: string) => string;
  maxTerms?: number;
  allowWildcards?: boolean;
  allowFields?: boolean;
  fieldAliases?: Record<string, string>; // Maps "by" → "author", etc.
}

// ─── Default Stop Words (English) ─────────────────────────────────────────────

const DEFAULT_STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "not", "no", "nor", "so",
  "yet", "both", "either", "neither", "this", "that", "these", "those",
]);

// ─── Simple Porter Stemmer (Core Rules) ───────────────────────────────────────

export function naiveStem(word: string): string {
  word = word.toLowerCase();
  if (word.length < 3) return word;

  // Step 1a: plurals and -ed/-ing
  if (word.endsWith("sses")) return word.slice(0, -2);
  if (word.endsWith("ies"))  return word.slice(0, -2);
  if (word.endsWith("ss"))   return word;
  if (word.endsWith("s") && word.length > 3) word = word.slice(0, -1);

  // Step 1b: -ing, -ed
  if (word.endsWith("ing") && word.length > 5) return word.slice(0, -3);
  if (word.endsWith("ed") && word.length > 4)  return word.slice(0, -2);

  // Step 2: -ational, -tional, -enci, -anci
  if (word.endsWith("ational")) return word.slice(0, -7) + "ate";
  if (word.endsWith("tional"))  return word.slice(0, -2);
  if (word.endsWith("izer"))    return word.slice(0, -2) + "e";

  return word;
}

// ─── Tokenizer ────────────────────────────────────────────────────────────────

function tokenize(raw: string): Array<{ raw: string; type: TokenType; field?: string; negated?: boolean }> {
  const tokens: Array<{ raw: string; type: TokenType; field?: string; negated?: boolean }> = [];
  let i = 0;

  while (i < raw.length) {
    while (i < raw.length && /\s/.test(raw[i])) i++;
    if (i >= raw.length) break;

    let negated = false;
    if (raw[i] === "-") {
      negated = true;
      i += 1;
    } else if (raw.startsWith("NOT ", i) || raw.slice(i) === "NOT") {
      negated = true;
      i += (raw.slice(i) === "NOT" ? 3 : 4);
      while (i < raw.length && /\s/.test(raw[i])) i++;
    }

    let field: string | undefined;
    const colonMatch = raw.slice(i).match(/^([a-zA-Z0-9_-]+):/);
    if (colonMatch) {
      field = colonMatch[1].toLowerCase();
      i += colonMatch[0].length;
    }

    let value = "";
    let isPhrase = false;
    if (raw[i] === '"') {
      isPhrase = true;
      const end = raw.indexOf('"', i + 1);
      if (end === -1) {
        value = raw.slice(i + 1);
        i = raw.length;
      } else {
        value = raw.slice(i + 1, end);
        i = end + 1;
      }
    } else {
      let j = i;
      while (j < raw.length && !/\s/.test(raw[j])) j++;
      value = raw.slice(i, j);
      i = j;
    }

    if (!value) continue;

    if (field) {
      tokens.push({ raw: value, type: "field", field, negated });
      continue;
    }

    if (isPhrase) {
      tokens.push({ raw: value, type: "phrase", negated });
      continue;
    }

    if (value.includes("*") || value.includes("?")) {
      tokens.push({ raw: value.toLowerCase(), type: "wildcard", negated });
      continue;
    }

    if (value === "AND" || value === "OR") {
      tokens.push({ raw: value, type: "operator" });
      continue;
    }

    tokens.push({ raw: value.toLowerCase(), type: "term", negated });
  }

  return tokens;
}

// ─── QueryParser ──────────────────────────────────────────────────────────────

export class QueryParser {
  private config: Required<QueryParserConfig>;

  constructor(config: QueryParserConfig = {}) {
    this.config = {
      stopWords: config.stopWords ?? DEFAULT_STOP_WORDS,
      stemmer: config.stemmer ?? naiveStem,
      maxTerms: config.maxTerms ?? 32,
      allowWildcards: config.allowWildcards ?? true,
      allowFields: config.allowFields ?? true,
      fieldAliases: config.fieldAliases ?? {},
    };
  }

  parse(raw: string): ParsedQuery {
    const trimmed = raw.trim();
    if (!trimmed) {
      return { raw, tokens: [], terms: [], phrases: [], fields: {}, negated: [], wildcards: [], hasWildcard: false, isEmpty: true };
    }

    const rawTokens = tokenize(trimmed).slice(0, this.config.maxTerms);
    const tokens: Token[] = [];
    const terms: string[] = [];
    const phrases: string[] = [];
    const fields: Record<string, string[]> = {};
    const negated: string[] = [];
    const wildcards: string[] = [];

    for (const rt of rawTokens) {
      if (rt.type === "operator") {
        tokens.push({ type: "operator", value: rt.raw });
        continue;
      }

      if (rt.type === "phrase") {
        const normalized = rt.raw.toLowerCase().trim();
        tokens.push({ type: "phrase", value: normalized, negated: rt.negated });
        if (rt.negated) negated.push(normalized);
        else phrases.push(normalized);
        continue;
      }

      if (rt.type === "wildcard" && this.config.allowWildcards) {
        tokens.push({ type: "wildcard", value: rt.raw, negated: rt.negated });
        wildcards.push(rt.raw);
        continue;
      }

      if (rt.type === "field" && this.config.allowFields && rt.field) {
        const resolvedField = this.config.fieldAliases[rt.field] ?? rt.field;
        const value = this.normalize(rt.raw);
        tokens.push({ type: "field", value, field: resolvedField, negated: rt.negated });
        if (!fields[resolvedField]) fields[resolvedField] = [];
        fields[resolvedField].push(value);
        continue;
      }

      // Regular term
      if (this.config.stopWords.has(rt.raw)) continue;
      const stemmed = this.config.stemmer(rt.raw);
      tokens.push({ type: "term", value: stemmed, negated: rt.negated });
      if (rt.negated) negated.push(stemmed);
      else terms.push(stemmed);
    }

    return {
      raw,
      tokens,
      terms: [...new Set(terms)],
      phrases: [...new Set(phrases)],
      fields,
      negated: [...new Set(negated)],
      wildcards: [...new Set(wildcards)],
      hasWildcard: wildcards.length > 0,
      isEmpty: tokens.filter((t) => t.type !== "operator").length === 0,
    };
  }

  private normalize(word: string): string {
    return this.config.stemmer(word.toLowerCase().replace(/[^\w\s*?]/g, ""));
  }

  // Suggest query corrections/expansions based on common patterns
  suggest(query: ParsedQuery): string[] {
    const suggestions: string[] = [];

    if (query.terms.length === 1 && query.terms[0].length < 3) {
      suggestions.push(`${query.terms[0]}*`); // Suggest wildcard for short terms
    }

    if (query.phrases.length === 0 && query.terms.length > 3) {
      suggestions.push(`"${query.terms.join(" ")}"`); // Suggest exact phrase
    }

    return suggestions;
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createQueryParser(config?: QueryParserConfig): QueryParser {
  return new QueryParser(config);
}

/*
 * Usage Example:
 *
 * const parser = createQueryParser({
 *   allowFields: true,
 *   fieldAliases: { by: "author", in: "category" },
 * });
 *
 * const q = parser.parse('React hooks -class author:"Dan Abramov" type:article');
 * // q.terms      → ["react", "hook"]
 * // q.negated    → ["class"]
 * // q.fields     → { author: ["dan abramov"], type: ["articl"] }
 * // q.phrases    → []
 *
 * const q2 = parser.parse('"machine learning" -neural title:python');
 * // q2.phrases   → ["machine learning"]
 * // q2.negated   → ["neural"]
 * // q2.fields    → { title: ["python"] }
 */
