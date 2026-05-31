<!-- @keywords: context management, context window, conversation history, summarization, memory, token limit -->
<!-- @domain: AI Context Management Prompts -->

# Context Management Prompts

## Context Window Strategy

```
Design a context window management strategy for: [AI feature]

**Context window:** claude-sonnet-4-6 has 200K tokens input
**When does context become a problem:**
- Long conversations (100+ turns)
- Large documents attached to every message
- Many tool call results accumulating
- Per-token cost adds up at scale

**Strategy 1 — Sliding window (simplest):**
```typescript
function trimConversation(
  messages: Message[],
  maxTokens: number,
  preserveFirst: number = 1  // always keep system message
): Message[] {
  let tokenCount = countTokens(messages);
  
  while (tokenCount > maxTokens && messages.length > preserveFirst + 2) {
    // Remove oldest non-system messages
    messages.splice(preserveFirst, 1);
    tokenCount = countTokens(messages);
  }
  
  return messages;
}
```

**Strategy 2 — Summarization (better quality):**
```typescript
async function summarizeOldMessages(
  messages: Message[],
  keepRecent: number = 10
): Promise<Message[]> {
  if (messages.length <= keepRecent) return messages;
  
  const toSummarize = messages.slice(0, -keepRecent);
  const recent = messages.slice(-keepRecent);
  
  const summary = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',  // use cheaper model for summarization
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Summarize these conversation messages into a brief paragraph 
                preserving key decisions, facts learned, and context needed 
                for future messages:
                
                ${JSON.stringify(toSummarize)}`,
    }],
  });
  
  return [
    { role: 'user', content: `[Previous conversation summary]: ${summary.content[0].text}` },
    { role: 'assistant', content: 'Understood. I have context from our previous discussion.' },
    ...recent,
  ];
}
```

**Strategy 3 — RAG for document context:**
Instead of including full documents in context:
1. Chunk and embed documents
2. On each user message, retrieve relevant chunks
3. Include only relevant chunks in context window

**Strategy 4 — Prompt caching for stable context:**
```typescript
// If system prompt / context is large and repeated, use caching
const response = await anthropic.messages.create({
  system: [
    {
      type: 'text',
      text: largeSystemContext,
      cache_control: { type: 'ephemeral' },  // cached for 5 minutes
    },
  ],
  messages: recentMessages,  // only recent conversation (not full history)
});
```

Design for: [your specific conversation length and context requirements].
```

---

## Conversation History Management

```
Implement conversation history management for: [chatbot / AI assistant]

**Requirements:**
- Max conversation turns: [N turns before compression]
- Persistence: [Redis / database / session storage]
- Multi-session: [does history persist across sessions?]
- User control: [can user clear history / see history?]

**Data model:**
```typescript
interface Conversation {
  id: string;
  userId: string;
  messages: ConversationMessage[];
  metadata: {
    createdAt: Date;
    lastMessageAt: Date;
    messageCount: number;
    tokenCount: number;
  };
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool_result';
  content: string;
  toolCallId?: string;
  timestamp: Date;
  tokenCount: number;
}
```

**Conversation management:**
```typescript
class ConversationManager {
  private readonly maxMessages = 50;
  private readonly maxTokens = 150000; // leave room for new messages
  
  async addMessage(conversationId: string, message: ConversationMessage) {
    await db.conversationMessages.create({ data: { conversationId, ...message } });
    await this.maybeCompress(conversationId);
  }
  
  async getHistory(conversationId: string): Promise<Message[]> {
    const messages = await db.conversationMessages.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' },
      take: this.maxMessages,
    });
    
    return messages.map(m => ({ role: m.role, content: m.content }));
  }
  
  private async maybeCompress(conversationId: string) {
    const count = await db.conversationMessages.count({ where: { conversationId } });
    
    if (count > this.maxMessages * 1.5) {
      // Summarize old half, keep recent half
      await this.compressHistory(conversationId);
    }
  }
}
```

**UI for conversation history:**
```tsx
function ConversationSidebar({ userId }: { userId: string }) {
  const { data: conversations } = useQuery(['conversations', userId], 
    () => api.conversations.list(userId));
  
  return (
    <aside>
      {conversations?.map(conv => (
        <button key={conv.id} onClick={() => selectConversation(conv.id)}>
          <span className="truncate">{conv.title ?? 'New conversation'}</span>
          <span className="text-xs text-muted">{formatRelative(conv.lastMessageAt)}</span>
        </button>
      ))}
    </aside>
  );
}
```

Implement for: [your specific conversation management needs].
```

---

## Document Context Injection

```
Design document context injection for: [AI feature that processes documents]

**Document types:** [PDFs / markdown / HTML / code files / spreadsheets]
**User workflow:** [upload document → ask questions / process automatically / analyze on command]

**Document processing pipeline:**

**Step 1 — Extract text:**
```typescript
import { extractTextFromPDF } from 'pdf-parse';

async function extractText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  
  switch (file.type) {
    case 'application/pdf':
      const pdf = await extractTextFromPDF(Buffer.from(buffer));
      return pdf.text;
      
    case 'text/markdown':
    case 'text/plain':
      return new TextDecoder().decode(buffer);
      
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      // Use mammoth for DOCX
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
      return result.value;
      
    default:
      throw new UnsupportedFileTypeError(file.type);
  }
}
```

**Step 2 — Choose injection strategy based on size:**
```typescript
async function injectDocumentContext(
  document: string,
  userQuery: string,
  maxContextTokens: number = 50000
): Promise<string> {
  const docTokens = countTokens(document);
  
  if (docTokens < maxContextTokens) {
    // Small doc: include in full
    return `Document content:\n${document}\n\nUser question: ${userQuery}`;
  } else {
    // Large doc: RAG — retrieve relevant sections only
    const relevantChunks = await retrieveRelevantChunks(document, userQuery, 5);
    return `Relevant sections from document:\n${relevantChunks.join('\n---\n')}\n\nUser question: ${userQuery}`;
  }
}
```

**Step 3 — Structured extraction:**
```typescript
async function extractStructuredData(
  document: string,
  schema: z.ZodObject<any>
): Promise<z.infer<typeof schema>> {
  const schemaDescription = JSON.stringify(schema._def.shape(), null, 2);
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Extract the following information from this document.
Return ONLY a JSON object matching this schema (no other text):
${schemaDescription}

Document:
${document}`,
    }],
  });
  
  const json = JSON.parse(response.content[0].text);
  return schema.parse(json); // validates and types the output
}
```

Implement for: [your specific document type and extraction requirements].
```

---

## Token Counting & Cost Estimation

```
Implement token counting and cost estimation for: [AI application]

**Why this matters:**
- Avoid unexpected API costs
- Enforce per-user token limits
- Estimate cost before running expensive operations

**Token counting:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

async function countTokens(
  messages: Anthropic.MessageParam[],
  system?: string
): Promise<number> {
  const response = await anthropic.messages.countTokens({
    model: 'claude-sonnet-4-6',
    system,
    messages,
  });
  return response.input_tokens;
}

// Synchronous approximation (not exact — use for pre-flight checks)
function estimateTokens(text: string): number {
  // ~4 characters per token is a reasonable approximation
  return Math.ceil(text.length / 4);
}
```

**Cost calculation:**
```typescript
const PRICING = {
  'claude-sonnet-4-6': {
    input: 3 / 1_000_000,          // $3 per 1M input tokens
    output: 15 / 1_000_000,        // $15 per 1M output tokens
    cacheWrite: 3.75 / 1_000_000,  // $3.75 per 1M tokens written to cache
    cacheRead: 0.30 / 1_000_000,   // $0.30 per 1M tokens read from cache
  },
  'claude-haiku-4-5-20251001': {
    input: 0.80 / 1_000_000,
    output: 4 / 1_000_000,
    cacheWrite: 1 / 1_000_000,
    cacheRead: 0.08 / 1_000_000,
  },
} as const;

function calculateCost(
  model: keyof typeof PRICING,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens = 0,
  cacheWriteTokens = 0
): number {
  const pricing = PRICING[model];
  return (
    inputTokens * pricing.input +
    outputTokens * pricing.output +
    cacheReadTokens * pricing.cacheRead +
    cacheWriteTokens * pricing.cacheWrite
  );
}
```

**Per-user budget enforcement:**
```typescript
const USER_MONTHLY_TOKEN_LIMIT = 1_000_000; // 1M tokens/month

async function checkBudget(userId: string, estimatedTokens: number): Promise<void> {
  const used = await db.tokenUsage.sum({ where: { userId, month: currentMonth() } });
  
  if (used + estimatedTokens > USER_MONTHLY_TOKEN_LIMIT) {
    throw new BudgetExceededError(
      `You've used ${formatTokens(used)} of your ${formatTokens(USER_MONTHLY_TOKEN_LIMIT)} monthly limit`
    );
  }
}

async function trackUsage(userId: string, response: Anthropic.Message) {
  await db.tokenUsage.create({
    data: {
      userId,
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
      month: currentMonth(),
    },
  });
}
```

Implement for: [your specific cost management requirements].
```

---

## Multi-Modal Context

```
Implement multi-modal context handling for: [AI feature with images/files]

**Modalities to support:**
- [Text: always]
- [Images: user uploads / screenshots / generated]
- [Documents: PDFs, spreadsheets]
- [Code: with syntax context]

**Image context injection:**
```typescript
async function buildMultiModalMessage(
  text: string,
  images?: File[]
): Promise<Anthropic.MessageParam> {
  const content: Anthropic.ContentBlockParam[] = [];
  
  // Add images first (model reads them before the question)
  if (images) {
    for (const image of images) {
      const buffer = await image.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mediaType = image.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
      
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64,
        },
      });
    }
  }
  
  // Add text question
  content.push({ type: 'text', text });
  
  return { role: 'user', content };
}
```

**Image limitations:**
- Max image size: 5MB per image
- Max images per request: 20
- Supported: JPEG, PNG, GIF, WebP
- For large images: resize before sending (reduces cost + latency)

**Image pre-processing:**
```typescript
import sharp from 'sharp';

async function optimizeImageForLLM(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
}
```

Implement for: [your specific multi-modal use case].
```
