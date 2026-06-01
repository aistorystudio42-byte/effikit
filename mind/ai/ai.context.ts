/**
 * @keywords    context window, token budget, conversation memory, summarization, sliding window, RAG context
 * @domain      AI Context
 * @use-when    Managing AI conversation context: token budgeting, memory compression, RAG document injection
 * @not-when    Simple single-turn prompts — context management only pays off in multi-turn conversations
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type MessageRole = "system" | "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  tokens: number;      // Pre-computed token estimate
  timestamp: number;
  pinned?: boolean;    // Pinned messages are never evicted
  importance?: number; // 0–1, higher = kept longer during compression
}

export interface ContextConfig {
  maxTokens: number;              // Total token budget
  systemBudget?: number;          // Reserved tokens for system messages
  summarizeBudget?: number;       // Tokens reserved for summary messages
  compressionThreshold?: number;  // Compress when context exceeds this ratio (0–1)
  summarizer?: (messages: Message[]) => Promise<string>; // External LLM call
}

export interface ContextStats {
  messageCount: number;
  totalTokens: number;
  usedRatio: number;
  pinnedMessages: number;
  compressionCount: number;
}

// ─── Token Estimation ─────────────────────────────────────────────────────────

function estimateTokens(text: string): number {
  // Tiktoken approximation: ~4 chars/token for English, ~2-3 for code
  return Math.ceil(text.length / 3.8);
}

// ─── ContextWindow ────────────────────────────────────────────────────────────

export class ContextWindow {
  private messages: Message[] = [];
  private config: Required<ContextConfig>;
  private compressionCount = 0;
  private summaryAccumulator: string[] = [];

  constructor(config: ContextConfig) {
    this.config = {
      maxTokens: config.maxTokens,
      systemBudget: config.systemBudget ?? Math.floor(config.maxTokens * 0.15),
      summarizeBudget: config.summarizeBudget ?? Math.floor(config.maxTokens * 0.1),
      compressionThreshold: config.compressionThreshold ?? 0.8,
      summarizer: config.summarizer ?? defaultSummarizer,
    };
  }

  addMessage(role: MessageRole, content: string, options: { pinned?: boolean; importance?: number } = {}): Message {
    const msg: Message = {
      id: crypto.randomUUID(),
      role,
      content,
      tokens: estimateTokens(content),
      timestamp: Date.now(),
      pinned: options.pinned,
      importance: options.importance ?? (role === "system" ? 1.0 : 0.5),
    };

    this.messages.push(msg);
    return msg;
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  /** Messages formatted for API call */
  toApiMessages(): Array<{ role: MessageRole; content: string }> {
    return this.messages.map(({ role, content }) => ({ role, content }));
  }

  get totalTokens(): number {
    return this.messages.reduce((s, m) => s + m.tokens, 0);
  }

  get usedRatio(): number {
    return this.totalTokens / this.config.maxTokens;
  }

  /** Check if compression is needed */
  needsCompression(): boolean {
    return this.usedRatio >= this.config.compressionThreshold;
  }

  /** Sliding window: evict oldest non-pinned messages until under budget */
  trimOldest(targetRatio = 0.7): number {
    const targetTokens = Math.floor(this.config.maxTokens * targetRatio);
    let evicted = 0;

    while (this.totalTokens > targetTokens) {
      // Find oldest non-pinned, non-system message
      const idx = this.messages.findIndex((m) => !m.pinned && m.role !== "system");
      if (idx === -1) break; // All remaining are pinned/system
      this.messages.splice(idx, 1);
      evicted++;
    }

    return evicted;
  }

  /** Importance-based eviction: removes lowest-importance messages first */
  trimByImportance(targetRatio = 0.7): number {
    const targetTokens = Math.floor(this.config.maxTokens * targetRatio);
    let evicted = 0;

    const evictable = this.messages
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => !m.pinned && m.role !== "system")
      .sort((a, b) => (a.m.importance ?? 0) - (b.m.importance ?? 0) || a.m.timestamp - b.m.timestamp);

    for (const { m } of evictable) {
      if (this.totalTokens <= targetTokens) break;
      const idx = this.messages.indexOf(m);
      this.messages.splice(idx, 1);
      evicted++;
    }

    return evicted;
  }

  /** Compress: summarize old messages and replace them with summary */
  async compress(keepLast = 4): Promise<string | null> {
    const nonPinned = this.messages.filter((m) => !m.pinned && m.role !== "system");
    const toSummarize = nonPinned.slice(0, Math.max(0, nonPinned.length - keepLast));

    if (toSummarize.length === 0) return null;

    const summary = await this.config.summarizer(toSummarize);
    this.summaryAccumulator.push(summary);

    // Remove summarized messages and inject summary as system message
    const summarizedIds = new Set(toSummarize.map((m) => m.id));
    this.messages = this.messages.filter((m) => !summarizedIds.has(m.id));

    const summaryMsg: Message = {
      id: crypto.randomUUID(),
      role: "system",
      content: `[Conversation summary]: ${summary}`,
      tokens: estimateTokens(`[Conversation summary]: ${summary}`),
      timestamp: Date.now(),
      pinned: true,
      importance: 0.9,
    };

    // Inject summary at the beginning (after any existing pinned system prompts)
    let insertIdx = 0;
    while (insertIdx < this.messages.length && this.messages[insertIdx].role === "system" && this.messages[insertIdx].pinned) {
      insertIdx++;
    }
    this.messages.splice(insertIdx, 0, summaryMsg);

    this.compressionCount++;
    return summary;
  }

  /** Inject RAG documents into context with token budget awareness */
  injectDocuments(
    documents: Array<{ id: string; content: string; relevanceScore: number }>,
    budgetTokens?: number
  ): Array<{ id: string; included: boolean; tokens: number }> {
    const budget = budgetTokens ?? Math.floor(this.config.maxTokens * 0.3);
    const sorted = [...documents].sort((a, b) => b.relevanceScore - a.relevanceScore);

    let usedBudget = 0;
    const results: Array<{ id: string; included: boolean; tokens: number }> = [];

    for (const doc of sorted) {
      const tokens = estimateTokens(doc.content);
      if (usedBudget + tokens > budget) {
        results.push({ id: doc.id, included: false, tokens });
        continue;
      }

      this.addMessage("system", `[Document ${doc.id}]: ${doc.content}`, { importance: doc.relevanceScore });
      usedBudget += tokens;
      results.push({ id: doc.id, included: true, tokens });
    }

    return results;
  }

  get stats(): ContextStats {
    return {
      messageCount: this.messages.length,
      totalTokens: this.totalTokens,
      usedRatio: this.usedRatio,
      pinnedMessages: this.messages.filter((m) => m.pinned).length,
      compressionCount: this.compressionCount,
    };
  }

  clear(keepSystemMessages = true): void {
    this.messages = keepSystemMessages ? this.messages.filter((m) => m.role === "system") : [];
    this.summaryAccumulator = [];
  }
}

// ─── Conversation Memory ──────────────────────────────────────────────────────
// Separate long-term memory store — persists facts across context resets

export interface MemoryEntry {
  id: string;
  content: string;
  type: "fact" | "preference" | "instruction" | "summary";
  createdAt: number;
  importance: number;
  tags: string[];
}

export class ConversationMemory {
  private entries: Map<string, MemoryEntry> = new Map();
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  store(content: string, type: MemoryEntry["type"], tags: string[] = [], importance = 0.5): MemoryEntry {
    const entry: MemoryEntry = {
      id: crypto.randomUUID(),
      content,
      type,
      createdAt: Date.now(),
      importance,
      tags,
    };

    // Evict lowest-importance entry when at capacity
    if (this.entries.size >= this.maxEntries) {
      let minId = "";
      let minImportance = Infinity;
      for (const [id, e] of this.entries) {
        if (e.importance < minImportance) { minImportance = e.importance; minId = id; }
      }
      if (minId) this.entries.delete(minId);
    }

    this.entries.set(entry.id, entry);
    return entry;
  }

  retrieve(options: { tags?: string[]; type?: MemoryEntry["type"]; topK?: number } = {}): MemoryEntry[] {
    let results = [...this.entries.values()];

    if (options.type)   results = results.filter((e) => e.type === options.type);
    if (options.tags?.length) {
      results = results.filter((e) => options.tags!.some((t) => e.tags.includes(t)));
    }

    return results
      .sort((a, b) => b.importance - a.importance)
      .slice(0, options.topK ?? 20);
  }

  forget(id: string): boolean { return this.entries.delete(id); }
  get size(): number { return this.entries.size; }
}

// ─── Default Summarizer (no-op fallback) ──────────────────────────────────────

async function defaultSummarizer(messages: Message[]): Promise<string> {
  // Default: create a simple transcript summary (replace with real LLM call in production)
  const turns = messages
    .map((m) => `${m.role}: ${m.content.slice(0, 100)}${m.content.length > 100 ? "..." : ""}`)
    .join("\n");
  return `Previous conversation (${messages.length} messages):\n${turns}`;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createContextWindow(config: ContextConfig): ContextWindow {
  return new ContextWindow(config);
}

export function createMemory(maxEntries?: number): ConversationMemory {
  return new ConversationMemory(maxEntries);
}

/*
 * Usage Example:
 *
 * const ctx = createContextWindow({
 *   maxTokens: 8192,
 *   compressionThreshold: 0.85,
 *   summarizer: async (msgs) => callLLM("Summarize these messages concisely", msgs),
 * });
 *
 * ctx.addMessage("system", "You are a helpful coding assistant.", { pinned: true });
 * ctx.addMessage("user", "How do I use TypeScript generics?");
 * ctx.addMessage("assistant", "Generics allow you to write flexible, type-safe code...");
 *
 * if (ctx.needsCompression()) {
 *   await ctx.compress(keepLast = 6); // Summarize all but last 6 messages
 * }
 *
 * const apiMessages = ctx.toApiMessages(); // Ready to send to Claude/GPT
 * console.log(ctx.stats); // { messageCount, totalTokens, usedRatio, compressionCount }
 */
