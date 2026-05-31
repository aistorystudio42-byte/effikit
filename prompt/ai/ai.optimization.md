<!-- @keywords: AI optimization, cost reduction, latency, caching, model selection, batch processing, prompt compression -->
<!-- @domain: AI Cost & Performance Optimization Prompts -->

# AI Performance & Cost Optimization Prompts

## Model Selection Strategy

```
Choose the right Claude model for: [use case]

**Model comparison:**

| Model | Speed | Cost | Context | Best For |
|-------|-------|------|---------|---------|
| claude-haiku-4-5-20251001 | Fastest | Cheapest | 200K | Classification, extraction, simple Q&A |
| claude-sonnet-4-6 | Fast | Mid | 200K | Complex reasoning, coding, analysis |
| claude-opus-4-8 | Slower | Most expensive | 200K | Highest capability, complex judgment |

**Selection framework:**
```
Ask yourself:
1. Does quality critically matter here? (user-facing output vs internal processing)
2. What's the input/output token ratio? (heavy output = cost multiplies)
3. What's the acceptable latency? (<2s user-facing, any for batch)
4. How many requests per day? (cost adds up quickly at scale)
```

**By use case:**
```
Simple classification:        Haiku   — "Is this spam? yes/no"
Structured extraction:        Haiku   — "Extract fields from this form"
Search/retrieval ranking:     Haiku   — "Score these results 1-10"
Summarization (short):        Haiku   — "Summarize in 2 sentences"
Summarization (complex):      Sonnet  — "Summarize a technical paper"
Code generation (simple):     Sonnet  — "Write a React hook"
Code generation (complex):    Sonnet/Opus — "Design an auth system"
Analysis and reasoning:       Sonnet  — "Analyze this PR for issues"
High-stakes judgment:         Opus    — "Evaluate this legal clause"
Creative writing:             Sonnet/Opus — depends on quality bar
```

**Cost optimization rule:**
Start with Haiku. Upgrade to Sonnet only when quality tests fail.
Upgrade to Opus only for the highest-stakes, low-volume use cases.

Recommend model selection for: [your specific features list].
```

---

## Prompt Optimization for Cost

```
Optimize this prompt to reduce token usage while preserving quality.

**Original prompt:**
[paste prompt]

**Current token count:** [N tokens]
**Target token count:** [M tokens — 20-50% reduction]

**Optimization techniques:**

**1. Remove verbose instructions:**
```
Before: "Please carefully analyze the following text and provide me with 
        a detailed and comprehensive summary that covers all the main points..."
After:  "Summarize:"
```

**2. Remove redundant context:**
```
Before: "You are an AI assistant. Your job is to help users. 
        The user has asked you to..."
After:  [just the instruction]
```

**3. Use implicit formatting:**
```
Before: "Please format your response as a bulleted list with each 
        item on a new line preceded by a dash character"
After:  "List:" (model infers bullet format)
```

**4. Compress few-shot examples:**
```
Before: [3 verbose 200-token examples]
After:  [3 compact 50-token examples — same pattern, less prose]
```

**5. Use structured markup:**
```
Before: "First, analyze the input. Then, consider the context. Finally, output..."
After:  [XML tags are parsed efficiently]
<task>analyze, then output</task>
<input>...</input>
```

**Evaluate after optimization:**
- Run [N=20] test cases with original prompt
- Run same test cases with optimized prompt
- Compare: output quality (human or LLM judge) + token count
- Accept if: quality ≥ 95% of original at lower cost

Optimize: [your specific prompt].
```

---

## Latency Optimization

```
Reduce the latency of: [AI feature]

**Current latency:** [X ms P50 / Y ms P99]
**Target:** [A ms P50 / B ms P99]
**Bottleneck hypothesis:** [prompt too long / model too slow / no streaming]

**Optimization techniques:**

**1. Streaming (immediate perceived response):**
```typescript
// Without streaming: user waits full duration
const response = await anthropic.messages.create({ ... });
return response.content[0].text;

// With streaming: user sees text as it's generated
const stream = anthropic.messages.stream({ ... });

// Stream to client via SSE
for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta') {
    res.write(`data: ${chunk.delta.text}\n\n`);
  }
}
```

**2. Smaller model (Haiku is 5-10× faster than Sonnet):**
```
If Sonnet takes 2s → Haiku takes ~0.3s for same prompt length
Trade-off: lower quality — only use where quality is acceptable
```

**3. Reduce input tokens:**
```
Every 1K tokens saved ≈ 0.3-0.5s faster response start
Use RAG to send only relevant context (not whole document)
Compress conversation history
Use prompt caching for repeated large contexts
```

**4. Max tokens limit:**
```typescript
// If you expect a short response, set low max_tokens
// Model stops generating after max_tokens — don't set too high
max_tokens: 200  // for short answers
max_tokens: 1024 // for detailed responses
max_tokens: 4096 // only for very long outputs
```

**5. Prefill the response:**
```typescript
// Force model to start with specific text (skips any preamble)
messages: [
  { role: 'user', content: prompt },
  { role: 'assistant', content: '{"' },  // model continues from here
]
// Useful for JSON output — eliminates "Here is the JSON:" preamble
```

Apply to: [your specific latency problem].
```

---

## Caching Strategy for AI

```
Design a caching strategy for: [AI-powered feature]

**Why cache AI responses:**
- Identical queries → identical responses (can cache)
- Cost: avoid paying for repeated generations
- Latency: cache hit is 10-100× faster than API call

**Cache layers:**

**1. Prompt caching (Anthropic built-in):**
For large, repeated system prompts or document contexts.
```typescript
// Cache stable context (reused across requests)
system: [
  {
    type: 'text',
    text: staticInstructions,
    cache_control: { type: 'ephemeral' },  // 5-minute cache
  },
  {
    type: 'text',
    text: largeDocument,
    cache_control: { type: 'ephemeral' },
  },
],
messages: [{ role: 'user', content: userQuery }],
// Only userQuery is NOT cached — system + document tokens are free
```

**2. Response caching (your infrastructure):**
Cache complete responses for identical inputs.
```typescript
async function cachedGenerate(prompt: string, cacheKey?: string): Promise<string> {
  const key = cacheKey ?? crypto.createHash('sha256').update(prompt).digest('hex');
  
  // Check cache
  const cached = await redis.get(`ai:${key}`);
  if (cached) return cached;
  
  // Generate
  const response = await anthropic.messages.create({
    messages: [{ role: 'user', content: prompt }],
  });
  const text = response.content[0].text;
  
  // Cache (TTL depends on how static the response is)
  await redis.setex(`ai:${key}`, 3600, text); // 1 hour
  
  return text;
}
```

**3. Semantic caching (fuzzy matching):**
Cache responses and retrieve when query is semantically similar.
```typescript
async function semanticCachedGenerate(query: string): Promise<string> {
  const queryEmbedding = await embedText(query);
  
  // Find cached response with similarity > threshold
  const similar = await vectorStore.findSimilar(queryEmbedding, {
    threshold: 0.97,  // high threshold — only cache very similar queries
    limit: 1,
  });
  
  if (similar.length > 0) return similar[0].response;
  
  // Generate and cache
  const response = await generate(query);
  await vectorStore.insert({ text: query, embedding: queryEmbedding, response });
  return response;
}
```

**Cache invalidation:**
- Static content (docs): invalidate when document updates
- User-specific: namespace by userId
- Personalized: never cache (or short TTL + user-ID key)

Design the caching strategy for: [your specific AI feature].
```

---

## Batch Processing for AI

```
Implement batch AI processing for: [high-volume task]

**Task:** [describe what AI does to each item]
**Volume:** [N items per batch / day]
**Latency:** [real-time required / can batch / async is fine]

**Anthropic Batch API (50% cost reduction):**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

async function processBatchWithAI(items: string[]): Promise<Map<string, string>> {
  // Create batch (up to 10,000 requests per batch)
  const batch = await anthropic.messages.batches.create({
    requests: items.map((item, i) => ({
      custom_id: `item-${i}`,
      params: {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: buildPrompt(item) }],
      },
    })),
  });
  
  console.log(`Batch created: ${batch.id}`);
  
  // Poll until complete (or use webhook)
  let batchResult = await anthropic.messages.batches.retrieve(batch.id);
  while (batchResult.processingStatus === 'in_progress') {
    await new Promise(resolve => setTimeout(resolve, 5000)); // poll every 5s
    batchResult = await anthropic.messages.batches.retrieve(batch.id);
  }
  
  // Collect results
  const results = new Map<string, string>();
  for await (const result of await anthropic.messages.batches.results(batch.id)) {
    if (result.result.type === 'succeeded') {
      const text = result.result.message.content[0].text;
      results.set(result.custom_id, text);
    }
  }
  
  return results;
}
```

**When to use batch vs realtime:**
| Scenario | Use |
|---------|-----|
| User waiting for response | Realtime streaming |
| Background enrichment job | Batch API |
| Nightly report generation | Batch API |
| Classification pipeline | Batch API |
| Scheduled content generation | Batch API |

**Batch job architecture:**
```typescript
// Queue items for batch processing
await jobQueue.add('ai-batch', {
  items: pendingItems.map(i => i.id),
  processingType: 'classify',
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
});

// Worker processes batches
async function processBatchJob(job: Job) {
  const items = await db.items.findMany({ where: { id: { in: job.data.items } } });
  const results = await processBatchWithAI(items.map(i => i.content));
  
  // Update database with results
  await Promise.all(items.map(item => 
    db.items.update({
      where: { id: item.id },
      data: { classification: results.get(`item-${item.id}`) },
    })
  ));
}
```

Design batch processing for: [your specific high-volume AI task].
```
