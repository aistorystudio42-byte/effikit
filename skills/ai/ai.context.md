<!-- @keywords: AI context, context window, memory, RAG, summarization, context management, embeddings -->

# AI — Context Management

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to context.

## Principles

### The Context Window Problem
LLMs have a finite context window. A long conversation or large codebase can't fit entirely in context. Context management is the discipline of deciding what information the model needs right now.

```
Context budget example (100k token window):
  System prompt:           2,000 tokens
  Conversation history:   10,000 tokens
  Retrieved documents:    20,000 tokens
  Current task/query:      1,000 tokens
  Response space:         67,000 tokens

Reality: retrieved documents often vary from 5k to 80k tokens
→ Need smart truncation, summarization, and retrieval
```

---

### Retrieval-Augmented Generation (RAG)
Don't put everything in context. Retrieve what's relevant.

```typescript
import { OpenAIEmbeddings } from '@langchain/openai';

class VectorStore {
  async embed(text: string): Promise<number[]> {
    const embeddings = new OpenAIEmbeddings({ model: 'text-embedding-3-small' });
    return embeddings.embedQuery(text);
  }

  async upsert(id: string, text: string, metadata: Record<string, unknown>): Promise<void> {
    const vector = await this.embed(text);
    await this.pinecone.upsert([{ id, values: vector, metadata: { text, ...metadata } }]);
  }

  async query(query: string, topK = 5, filter?: Record<string, unknown>): Promise<RetrievedChunk[]> {
    const queryVector = await this.embed(query);
    const results = await this.pinecone.query({
      vector: queryVector,
      topK,
      filter,
      includeMetadata: true,
    });

    return results.matches.map(match => ({
      id: match.id,
      text: match.metadata?.text as string,
      score: match.score,
      metadata: match.metadata,
    }));
  }
}

// RAG pipeline
async function answerWithContext(userQuery: string): Promise<string> {
  // 1. Retrieve relevant chunks
  const chunks = await vectorStore.query(userQuery, 5);

  // 2. Build context from retrieved chunks
  const context = chunks
    .filter(c => c.score > 0.75) // relevance threshold
    .map(c => `[Source: ${c.metadata.source}]\n${c.text}`)
    .join('\n\n---\n\n');

  // 3. Inject into prompt
  const prompt = `
Answer the question using only the provided context.
If the answer is not in the context, say "I don't have information about this."

Context:
${context}

Question: ${userQuery}`;

  return callLLM(prompt);
}
```

---

### Conversation Memory
```typescript
// Short-term: sliding window (keep last N messages)
class ConversationMemory {
  private messages: Message[] = [];

  add(role: 'user' | 'assistant', content: string): void {
    this.messages.push({ role, content, timestamp: new Date() });
  }

  // Sliding window — most recent N tokens
  getContext(maxTokens = 8000): Message[] {
    let tokens = 0;
    const result: Message[] = [];

    // Walk backwards — keep most recent
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const estimated = this.messages[i].content.length / 4;
      if (tokens + estimated > maxTokens) break;
      result.unshift(this.messages[i]);
      tokens += estimated;
    }

    return result;
  }

  // Summarize old messages to compress history
  async compress(threshold = 20): Promise<void> {
    if (this.messages.length < threshold) return;

    const toSummarize = this.messages.slice(0, -10); // keep last 10 intact
    const summary = await callLLM(`
Summarize this conversation history in 3-5 bullet points.
Preserve: key decisions, important facts, user preferences.

${toSummarize.map(m => `${m.role}: ${m.content}`).join('\n')}
`);

    this.messages = [
      { role: 'system', content: `Previous conversation summary:\n${summary}` },
      ...this.messages.slice(-10),
    ];
  }
}
```

---

### Context Window Optimization
```typescript
// Prioritize context by relevance and recency
async function buildOptimalContext(
  query: string,
  conversationHistory: Message[],
  availableDocuments: Document[],
  tokenBudget = 80_000,
): Promise<ContextBundle> {
  let remainingBudget = tokenBudget;

  // 1. System prompt (fixed cost)
  const systemTokens = estimateTokens(systemPrompt);
  remainingBudget -= systemTokens;

  // 2. Recent conversation (high value — always include last 5 turns)
  const recentHistory = conversationHistory.slice(-10);
  const historyTokens = recentHistory.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  remainingBudget -= historyTokens;

  // 3. Retrieved documents (variable — ranked by relevance)
  const retrieved = await vectorStore.query(query, 10);
  const documents: string[] = [];

  for (const chunk of retrieved) {
    const chunkTokens = estimateTokens(chunk.text);
    if (remainingBudget - chunkTokens < 5000) break; // keep buffer for response
    documents.push(chunk.text);
    remainingBudget -= chunkTokens;
  }

  return { systemPrompt, history: recentHistory, documents };
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4); // ~4 chars per token for English
}
```

---

## Decision Framework

How you split documents dramatically affects retrieval quality.

```typescript
class DocumentChunker {
  // Fixed-size chunks with overlap (simple, works for dense text)
  chunkBySize(text: string, chunkSize = 500, overlap = 100): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      chunks.push(text.slice(start, start + chunkSize));
      start += chunkSize - overlap;
    }
    return chunks;
  }

  // Semantic chunks — split at natural boundaries (better for retrieval)
  chunkBySentence(text: string, maxTokens = 400): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
    const chunks: string[] = [];
    let current = '';

    for (const sentence of sentences) {
      const tokenEstimate = (current + sentence).length / 4; // ~4 chars per token
      if (tokenEstimate > maxTokens && current) {
        chunks.push(current.trim());
        current = sentence;
      } else {
        current += ' ' + sentence;
      }
    }

    if (current) chunks.push(current.trim());
    return chunks;
  }

  // Hierarchical: chunk at both paragraph and sentence level
  // Store both — paragraph for broader context, sentence for precision
  async chunkHierarchical(document: Document): Promise<ChunkedDocument> {
    const paragraphChunks = document.text.split('\n\n').filter(Boolean);
    const sentenceChunks = paragraphChunks.flatMap(p => this.chunkBySentence(p));

    return {
      id: document.id,
      paragraphChunks: paragraphChunks.map((text, i) => ({ id: `${document.id}_p${i}`, text })),
      sentenceChunks: sentenceChunks.map((text, i) => ({ id: `${document.id}_s${i}`, text })),
    };
  }
}
```

---

## Anti-Patterns

- Over-engineering the solution.
- Ignoring context and copying blindly.
- Mixing concerns unnecessarily.

## Example in Action

- [ ] Token budget planned (system prompt + history + retrieval + response)
- [ ] Document chunking matches retrieval use case (semantic chunks for FAQ, size chunks for dense docs)
- [ ] Relevance threshold applied to retrieved chunks (filter low scores)
- [ ] Conversation history compressed before hitting context limit
- [ ] Most recent messages always preserved in sliding window
- [ ] Source attribution included in retrieved context (for factual accuracy)
