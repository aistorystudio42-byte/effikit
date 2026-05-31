<!-- @keywords: AI integration, Claude API, Anthropic SDK, LLM integration, AI feature, streaming, tool use -->
<!-- @domain: AI Integration Prompts -->

# AI Integration Prompts

## Claude API Integration

```
Implement a Claude AI integration for: [feature]

**Feature:** [describe what the AI-powered feature does]
**Model:** claude-sonnet-4-6 (or claude-haiku-4-5-20251001 for speed/cost)

**Basic implementation:**

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateWithClaude(
  userMessage: string,
  systemPrompt?: string
): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userMessage }
    ],
  });
  
  const textBlock = message.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Unexpected response format from Claude');
  }
  
  return textBlock.text;
}
```

**With prompt caching (reduces cost 90% for repeated system prompts):**
```typescript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  system: [
    {
      type: 'text',
      text: longSystemPrompt,  // large, reused system prompt
      cache_control: { type: 'ephemeral' },  // cache for 5 minutes
    },
  ],
  messages: [{ role: 'user', content: userMessage }],
});
```

**With streaming (for real-time response display):**
```typescript
const stream = await anthropic.messages.stream({
  model: 'claude-sonnet-4-6',
  max_tokens: 2048,
  messages: [{ role: 'user', content: userMessage }],
});

// Server-Sent Events response (Next.js API route)
const readableStream = new ReadableStream({
  async start(controller) {
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && 
          chunk.delta.type === 'text_delta') {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
        );
      }
    }
    controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
    controller.close();
  },
});

return new Response(readableStream, {
  headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
});
```

Implement for: [your specific AI feature].
```

---

## Tool Use / Function Calling

```
Implement tool use for: [AI agent / assistant]

**Tools the AI needs:**

```typescript
import Anthropic from '@anthropic-ai/sdk';

const tools: Anthropic.Tool[] = [
  {
    name: 'search_database',
    description: 'Search the product database for items matching the query',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query string',
        },
        filters: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            price_max: { type: 'number' },
          },
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return (default 10)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_order',
    description: 'Create a new order for specified products',
    input_schema: {
      type: 'object' as const,
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string' },
              quantity: { type: 'number' },
            },
            required: ['productId', 'quantity'],
          },
        },
      },
      required: ['items'],
    },
  },
];

// Tool execution map
const toolHandlers: Record<string, (input: unknown) => Promise<unknown>> = {
  search_database: async (input) => {
    const { query, filters, limit } = input as any;
    return db.products.search(query, filters, limit ?? 10);
  },
  create_order: async (input) => {
    const { items } = input as any;
    return orderService.create(items);
  },
};

// Agentic loop
async function runAgent(userMessage: string) {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage }
  ];
  
  while (true) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools,
      messages,
    });
    
    if (response.stop_reason === 'end_turn') {
      return response.content.find(b => b.type === 'text')?.text;
    }
    
    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content });
      
      const toolResults = await Promise.all(
        response.content
          .filter(b => b.type === 'tool_use')
          .map(async (toolUse) => {
            const result = await toolHandlers[toolUse.name](toolUse.input);
            return {
              type: 'tool_result' as const,
              tool_use_id: toolUse.id,
              content: JSON.stringify(result),
            };
          })
      );
      
      messages.push({ role: 'user', content: toolResults });
    }
  }
}
```

Implement tool use for: [your specific agent scenario].
```

---

## AI-Powered Feature Implementation

```
Implement this AI-powered feature: [feature name]

**Feature:** [describe what the user sees and does]

**AI's role:** [summarize / classify / generate / extract / recommend / answer]

**Implementation checklist:**

**1. Prompt design:**
- System prompt: [role + constraints + output format]
- User message template: [how user input maps to model input]
- Few-shot examples: [include if output format is specific]

**2. Input preparation:**
- Validate: [what inputs are required / optional]
- Sanitize: [remove PII from prompt if logging, truncate long inputs]
- Context: [what additional context helps the model — user history, preferences]

**3. Output processing:**
- Parse: [extract structured data from model response]
- Validate: [verify output meets requirements before showing to user]
- Fallback: [what to show if model output is unusable]

**4. Error handling:**
- Rate limit: [retry with backoff, show "busy" state to user]
- Timeout: [abort and show timeout message after N seconds]
- Model error: [log internally, show generic error to user]
- Content filter: [handle BLOCKED stop reason gracefully]

**5. Cost management:**
- Use cheapest model that meets quality bar (Haiku vs Sonnet vs Opus)
- Add prompt caching for reused context
- Set max_tokens appropriate to expected output size
- Consider batching for non-realtime features

**6. Observability:**
- Log: request ID, model, tokens (input/output), latency, stop reason
- Monitor: cost per request, error rate, latency P95

Implement with full code for: [your specific feature].
```

---

## Retrieval-Augmented Generation (RAG)

```
Implement RAG for: [document / knowledge base / custom data]

**Use case:** [describe what users ask and what data they should get answers from]

**Pipeline:**

**Step 1 — Document ingestion:**
```typescript
import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAIEmbeddings } from '@langchain/openai'; // or use Anthropic + embedding model

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1500,     // characters per chunk
  chunkOverlap: 200,   // overlap for context continuity
  separators: ['\n\n', '\n', '.', ' '],
});

const chunks = await splitter.splitDocuments(documents);
// Each chunk: { pageContent: string, metadata: { source, page, ... } }
```

**Step 2 — Embedding and vector storage (Supabase pgvector):**
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  embedding VECTOR(1536),  -- dimensions match your embedding model
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX document_chunks_embedding_idx 
  ON document_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);  -- tune for dataset size
```

**Step 3 — Similarity search:**
```typescript
async function retrieveContext(query: string, limit = 5): Promise<string> {
  const queryEmbedding = await embedText(query);
  
  const results = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,    // cosine similarity threshold
    match_count: limit,
  });
  
  return results.data
    .map(r => `Source: ${r.metadata.source}\n${r.content}`)
    .join('\n\n---\n\n');
}
```

**Step 4 — Augmented generation:**
```typescript
async function ragQuery(userQuestion: string): Promise<string> {
  const context = await retrieveContext(userQuestion);
  
  return generateWithClaude(userQuestion, `
You are a helpful assistant. Answer the user's question based ONLY on 
the provided context. If the answer is not in the context, say so.

Context:
${context}
  `);
}
```

Implement RAG for: [your specific knowledge base and query patterns].
```

---

## AI Feature Evaluation

```
Design an evaluation system for: [AI feature]

**AI feature:** [describe what the AI does]
**Success criteria:** [what makes an output "good"]

**Evaluation approaches:**

**1. LLM-as-judge (most scalable):**
```typescript
async function judgeOutput(
  input: string,
  output: string,
  criteria: string
): Promise<{ score: number; reasoning: string }> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',  // fast, cheap judge
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Evaluate this AI output on a scale of 1-5.

Criterion: ${criteria}

Input: ${input}

Output: ${output}

Respond with JSON: {"score": <1-5>, "reasoning": "<one sentence>"}`
    }],
  });
  
  return JSON.parse(response.content[0].text);
}
```

**2. Reference-based evaluation:**
- Create golden dataset of [N=50] input→ideal output pairs
- Score: ROUGE / BERTScore / exact match / semantic similarity
- Automate: run on every prompt change

**3. Human evaluation (ground truth):**
- Sample [N=20] outputs per evaluation round
- Rate on: [accuracy / helpfulness / format / safety]
- Calculate inter-rater agreement (Cohen's kappa)

**4. A/B testing in production:**
- Route X% of traffic to new prompt
- Measure: user satisfaction signal (thumbs up/down, edit rate, retry rate)
- Statistical significance before full rollout

**Dashboard metrics:**
- Average score trend over time
- Failure mode distribution (hallucination / format / refusal / off-topic)
- Cost per successful output
- Latency percentiles

Build the evaluation system for: [your specific AI feature].
```
