<!-- @keywords: AI pipeline, LLM workflow, tool use, function calling, agent, chain, orchestration -->

# AI — Pipeline and Agent Orchestration

## Single LLM Call vs Pipeline

A single LLM call handles simple tasks. Complex tasks benefit from pipelines — sequences of calls where each step specializes.

```
Single call: "Summarize this document"
  → One prompt, one response

Pipeline: "Research a topic and write a report"
  1. Decompose: break topic into sub-questions
  2. Search: retrieve relevant information per sub-question
  3. Synthesize: combine findings
  4. Write: generate structured report
  5. Review: check for gaps and inconsistencies
```

---

## Tool Use / Function Calling

Give the LLM tools to interact with the outside world.

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// Define tools
const tools: Anthropic.Tool[] = [
  {
    name: 'get_product',
    description: 'Retrieve product details by ID from the catalog',
    input_schema: {
      type: 'object',
      properties: {
        product_id: {
          type: 'string',
          description: 'The product ID to look up',
        },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'check_inventory',
    description: 'Check current stock level for a product and warehouse',
    input_schema: {
      type: 'object',
      properties: {
        product_id: { type: 'string' },
        warehouse_id: { type: 'string' },
      },
      required: ['product_id'],
    },
  },
];

// Tool execution loop
async function runAgentWithTools(userMessage: string): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ];

  while (true) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools,
      messages,
    });

    // Check if model wants to use tools
    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      // Execute all requested tools
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => {
          const result = await executeTool(block.name, block.input);
          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: JSON.stringify(result),
          };
        })
      );

      // Add assistant response and tool results to history
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });

    } else {
      // End of turn — extract text response
      const textBlock = response.content.find(b => b.type === 'text');
      return textBlock?.type === 'text' ? textBlock.text : '';
    }
  }
}

async function executeTool(name: string, input: unknown): Promise<unknown> {
  switch (name) {
    case 'get_product':
      return productService.getById((input as { product_id: string }).product_id);
    case 'check_inventory':
      return inventoryService.check(input as { product_id: string; warehouse_id?: string });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
```

---

## Parallel Tool Execution

When multiple tools can run simultaneously, execute them in parallel.

```typescript
// Check if any tool calls can be parallelized
function canParallelize(toolCalls: ToolCall[]): boolean {
  // Safe to parallelize if tools are independent (no data dependencies)
  const writeTools = new Set(['create_order', 'update_inventory', 'send_email']);
  const writeCount = toolCalls.filter(tc => writeTools.has(tc.name)).length;
  return writeCount <= 1; // at most one write — reads can always parallelize
}

// Execute tools with parallelism where safe
async function executeToolCalls(toolCalls: ToolCall[]): Promise<ToolResult[]> {
  if (canParallelize(toolCalls)) {
    // All parallel
    return Promise.all(toolCalls.map(tc => executeTool(tc.name, tc.input)));
  } else {
    // Sequential — avoid race conditions on writes
    const results: ToolResult[] = [];
    for (const tc of toolCalls) {
      results.push(await executeTool(tc.name, tc.input));
    }
    return results;
  }
}
```

---

## Multi-Step Pipeline with Specialization

```typescript
class ContentPipeline {
  // Step 1: Extract and structure raw content
  async extract(rawContent: string): Promise<ExtractedContent> {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', // fast model for extraction
      max_tokens: 1000,
      system: 'Extract key information as JSON. Return only valid JSON, no explanation.',
      messages: [{ role: 'user', content: rawContent }],
    });
    return JSON.parse(getTextContent(response));
  }

  // Step 2: Classify extracted content
  async classify(content: ExtractedContent): Promise<Classification> {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: 'Classify content into one category: TECHNICAL, BUSINESS, PERSONAL, OTHER. Output only the category.',
      messages: [{ role: 'user', content: JSON.stringify(content) }],
    });
    return getTextContent(response).trim() as Classification;
  }

  // Step 3: Generate response based on classification
  async respond(content: ExtractedContent, classification: Classification): Promise<string> {
    const systemPrompts: Record<Classification, string> = {
      TECHNICAL: 'You are a technical expert. Provide precise, detailed technical answers.',
      BUSINESS: 'You are a business analyst. Focus on ROI, risk, and strategic implications.',
      PERSONAL: 'You are an empathetic advisor. Be supportive and actionable.',
      OTHER: 'You are a helpful assistant.',
    };

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6', // capable model for generation
      max_tokens: 2000,
      system: systemPrompts[classification],
      messages: [{ role: 'user', content: JSON.stringify(content) }],
    });
    return getTextContent(response);
  }

  async run(rawContent: string): Promise<string> {
    const extracted = await this.extract(rawContent);
    const classification = await this.classify(extracted);
    return this.respond(extracted, classification);
  }
}
```

---

## Error Handling and Retry

```typescript
class ResilientLLMClient {
  async callWithRetry(
    params: Anthropic.MessageCreateParams,
    maxRetries = 3,
  ): Promise<Anthropic.Message> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await client.messages.create(params);
      } catch (error) {
        lastError = error as Error;

        if (error instanceof Anthropic.RateLimitError) {
          // Exponential backoff for rate limits
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(r => setTimeout(r, delay));
        } else if (error instanceof Anthropic.APIError && error.status >= 500) {
          // Server errors — retry
          await new Promise(r => setTimeout(r, 1000 * attempt));
        } else {
          // Client errors — don't retry (bad request, invalid auth)
          throw error;
        }
      }
    }

    throw lastError!;
  }
}
```

---

## Pipeline Checklist

- [ ] Each pipeline step uses the appropriate model (fast/cheap for classification, capable for generation)
- [ ] Tool definitions are precise (clear name, description, parameter types)
- [ ] Tool execution loop has a max iteration limit (prevent infinite loops)
- [ ] Independent tool calls executed in parallel
- [ ] Retry logic with exponential backoff for rate limits and server errors
- [ ] Pipeline outputs validated (structured outputs parsed with schema)
- [ ] Token usage tracked per pipeline step (cost monitoring)
