<!-- @keywords: AI agent, autonomous agent, agentic loop, multi-step AI, workflow automation, agent design -->
<!-- @domain: AI Agent Design Prompts -->

# AI Agent Design Prompts

## Autonomous Agent Design

```
Design an autonomous AI agent for: [task]

**Agent purpose:**
[describe what the agent does autonomously — what tasks it completes without 
step-by-step human guidance]

**Agent capabilities (tools it needs):**
- [Tool1]: [what it does, input, output]
- [Tool2]: [what it does, input, output]
- [Tool3]: [what it does, input, output]

**Agent boundaries (what it should NOT do):**
- [ ] Take irreversible actions without confirmation
- [ ] Access data it doesn't need for the task
- [ ] Run indefinitely without a termination condition
- [ ] Make decisions beyond its defined scope

**Agent architecture:**

```typescript
interface AgentState {
  task: string;
  messages: Message[];
  toolCallHistory: ToolCall[];
  maxIterations: number;
  iterationCount: number;
}

class Agent {
  private readonly maxIterations = 20; // prevent infinite loops
  
  async run(task: string): Promise<AgentResult> {
    const state: AgentState = {
      task,
      messages: [{ role: 'user', content: task }],
      toolCallHistory: [],
      maxIterations: this.maxIterations,
      iterationCount: 0,
    };
    
    while (state.iterationCount < state.maxIterations) {
      state.iterationCount++;
      
      const response = await this.think(state);
      
      if (response.stopReason === 'end_turn') {
        return { success: true, result: response.text, state };
      }
      
      if (response.stopReason === 'tool_use') {
        const toolResults = await this.executeTools(response.toolCalls);
        state.messages.push(
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults },
        );
        state.toolCallHistory.push(...response.toolCalls);
      }
    }
    
    return { success: false, error: 'Max iterations reached', state };
  }
}
```

Design the agent for: [your specific task and tools].
```

---

## Multi-Agent Workflow

```
Design a multi-agent workflow for: [complex task]

**Why multiple agents:**
[the task requires parallel processing / specialization / verification / 
different expertise domains]

**Agent roles:**

**Orchestrator agent:**
- Receives the high-level task
- Breaks it into subtasks
- Assigns to specialist agents
- Synthesizes results

**Specialist agent A — [domain]:**
- Responsibility: [specific subtask]
- Tools: [list]
- Output: [what it produces]

**Specialist agent B — [domain]:**
- Responsibility: [specific subtask]
- Tools: [list]
- Output: [what it produces]

**Critic/Verifier agent:**
- Reviews outputs of other agents
- Flags issues or inconsistencies
- Requests revisions if needed

**Communication pattern:**

```
User Task
    ↓
Orchestrator
  ├─→ Agent A (parallel)
  │       └─→ Result A
  └─→ Agent B (parallel)
          └─→ Result B
          ↓
     Critic Agent
          ↓ (if revision needed, loop back)
     Final Synthesis
          ↓
     User Response
```

**Implementation:**
```typescript
async function runMultiAgentWorkflow(task: string) {
  // Step 1: Orchestrator decomposes task
  const subtasks = await orchestratorAgent.decompose(task);
  
  // Step 2: Run specialist agents in parallel
  const results = await Promise.all(
    subtasks.map(subtask => specialistAgents[subtask.domain].run(subtask))
  );
  
  // Step 3: Critic validates
  const critiqued = await criticAgent.review(results);
  if (critiqued.needsRevision) {
    // Request specific revisions (not full redo)
  }
  
  // Step 4: Synthesize
  return orchestratorAgent.synthesize(critiqued.results, task);
}
```

Design for: [your specific complex workflow].
```

---

## Agent Memory Systems

```
Design a memory system for: [persistent AI agent]

**Memory types needed:**

**1. Working memory (within session):**
- The current conversation + tool call history
- Automatically maintained in the messages array
- Limit: [N tokens / summarize when approaching limit]

**2. Episodic memory (past conversations):**
Store summaries of past interactions:
```typescript
interface Episode {
  sessionId: string;
  userId: string;
  summary: string;           // 2-3 sentence summary of what happened
  keyFacts: string[];        // important facts learned during session
  createdAt: Date;
}

// Retrieve relevant past episodes for current context
async function getRelevantEpisodes(userId: string, currentQuery: string) {
  const embedding = await embedText(currentQuery);
  return episodeStore.semanticSearch(userId, embedding, { limit: 3 });
}
```

**3. Semantic memory (facts about user/world):**
```typescript
interface UserFact {
  userId: string;
  fact: string;              // "User prefers TypeScript over JavaScript"
  confidence: number;        // 0-1
  lastUpdated: Date;
  source: string;            // which conversation this came from
}

// Agent updates facts after each session
async function extractAndStoreFacts(session: Session) {
  const facts = await anthropic.messages.create({
    messages: [{ role: 'user', content: 
      `Extract new facts about the user from this conversation. 
       Focus on: preferences, constraints, goals, context.
       
       Conversation: ${JSON.stringify(session.messages)}`
    }],
  });
  await userFactStore.upsertFacts(session.userId, parsedFacts);
}
```

**4. Procedural memory (learned patterns):**
```typescript
// "How to do X" — learned from successful past task completions
interface ProcedureMemory {
  taskType: string;
  successfulApproach: string;  // what worked last time
  toolSequence: string[];      // which tools in which order
  pitfalls: string[];          // what didn't work
}
```

**Memory injection at conversation start:**
```typescript
async function buildContextForUser(userId: string, query: string) {
  const [facts, episodes, procedures] = await Promise.all([
    userFactStore.getAll(userId),
    getRelevantEpisodes(userId, query),
    getProcedureMemory(query),
  ]);
  
  return `
User facts: ${facts.map(f => f.fact).join('; ')}
Relevant past conversations: ${episodes.map(e => e.summary).join('\n')}
Useful approaches for this type of task: ${procedures.map(p => p.successfulApproach).join('\n')}
  `.trim();
}
```

Design the memory system for: [your specific agent and persistence requirements].
```

---

## Agent Safety & Guardrails

```
Design safety guardrails for: [AI agent]

**Why guardrails matter:**
Autonomous agents make multiple tool calls with real-world effects.
A single wrong decision can: [describe worst-case scenario for your agent]

**Guardrail layers:**

**Layer 1 — Pre-execution checks:**
```typescript
async function preExecutionCheck(toolCall: ToolCall): Promise<CheckResult> {
  // Irreversibility check
  if (IRREVERSIBLE_TOOLS.includes(toolCall.name)) {
    if (!await confirmWithUser(`This will permanently [action]. Confirm?`)) {
      return { blocked: true, reason: 'User declined irreversible action' };
    }
  }
  
  // Scope check — is this tool call related to the original task?
  const inScope = await checkTaskRelevance(toolCall, currentTask);
  if (!inScope) {
    return { blocked: true, reason: 'Tool call outside task scope' };
  }
  
  // Rate limit check — prevent runaway loops
  if (toolCallCount > MAX_CALLS_PER_TASK) {
    return { blocked: true, reason: 'Maximum tool calls reached' };
  }
  
  return { blocked: false };
}
```

**Layer 2 — Output validation:**
```typescript
async function validateOutput(toolCall: ToolCall, result: unknown): Promise<boolean> {
  // Verify result matches expected shape
  const schema = TOOL_OUTPUT_SCHEMAS[toolCall.name];
  return schema.safeParse(result).success;
}
```

**Layer 3 — Sensitive data detection:**
```typescript
function containsSensitiveData(text: string): boolean {
  // Detect PII, credentials, financial data before logging or passing to model
  const patterns = [
    /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/,  // credit card
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,  // email
    /sk_[a-zA-Z0-9]{20,}/,  // API keys
  ];
  return patterns.some(p => p.test(text));
}
```

**Layer 4 — Human-in-the-loop for high-stakes actions:**
```
Low stakes (auto-approved): read operations, search, compute
Medium stakes (log + notify): writes, sends
High stakes (require explicit approval): deletes, payments, external communications
```

**Audit log:**
Every tool call: tool name, input (sanitized), output summary, duration, approved/blocked.

Design guardrails for: [your specific agent and risk profile].
```

---

## AI Pipeline Design

```
Design an AI processing pipeline for: [data transformation / enrichment / analysis]

**Input:** [describe what enters the pipeline]
**Output:** [describe what exits the pipeline]
**Volume:** [N items per day / hour / minute]
**Latency:** [real-time / batch / near-real-time]

**Pipeline stages:**

```
Input → [Stage 1] → [Stage 2] → [Stage 3] → Output
              ↓           ↓           ↓
          [Validation] [Validation] [Validation]
              ↓           ↓           ↓
          [Error DLQ]  [Error DLQ] [Error DLQ]
```

**Stage design for each step:**

```typescript
interface PipelineStage<TInput, TOutput> {
  name: string;
  process: (input: TInput) => Promise<TOutput>;
  validate: (output: TOutput) => boolean;
  onError: (input: TInput, error: Error) => void;
}

class Pipeline<TInput, TFinal> {
  private stages: PipelineStage<unknown, unknown>[] = [];
  
  addStage<TIn, TOut>(stage: PipelineStage<TIn, TOut>): this {
    this.stages.push(stage as any);
    return this;
  }
  
  async run(input: TInput): Promise<TFinal> {
    let result: unknown = input;
    
    for (const stage of this.stages) {
      try {
        result = await stage.process(result);
        if (!stage.validate(result)) {
          throw new ValidationError(`Stage ${stage.name} produced invalid output`);
        }
      } catch (error) {
        stage.onError(result, error as Error);
        throw error;
      }
    }
    
    return result as TFinal;
  }
}
```

**For Anthropic Batch API (cost-efficient for large volumes):**
```typescript
// Use batch API for non-realtime processing (50% cost reduction)
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

// Poll until complete (or use webhook)
const results = await anthropic.messages.batches.results(batch.id);
```

Design the pipeline for: [your specific processing workflow].
```
