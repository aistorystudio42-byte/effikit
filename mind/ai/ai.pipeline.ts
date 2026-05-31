/**
 * @keywords    AI pipeline, workflow, parallel, sequential, map-reduce, agent, tool use, orchestration
 * @domain      AI Pipeline
 * @use-when    Orchestrating multi-step AI workflows: parallel calls, sequential chains, map-reduce over documents
 * @not-when    Simple single API calls — pipeline overhead only worth it for multi-step, multi-model workflows
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface PipelineStep<I = unknown, O = unknown> {
  id: string;
  name: string;
  run: (input: I, context: PipelineContext) => Promise<O>;
  condition?: (input: I, context: PipelineContext) => boolean; // Skip step if false
  retries?: number;
  retryDelayMs?: number;
  timeout?: number;
}

export interface PipelineContext {
  pipelineId: string;
  stepResults: Record<string, unknown>;   // Previous step outputs by step ID
  metadata: Record<string, unknown>;      // Arbitrary metadata passed through pipeline
  abortSignal?: AbortSignal;
}

export interface PipelineResult<O = unknown> {
  pipelineId: string;
  output: O;
  stepResults: Record<string, { status: StepStatus; output?: unknown; error?: string; durationMs: number }>;
  totalDurationMs: number;
  succeeded: boolean;
}

// ─── Step Execution ───────────────────────────────────────────────────────────

async function runWithRetry<I, O>(
  step: PipelineStep<I, O>,
  input: I,
  ctx: PipelineContext
): Promise<O> {
  const maxAttempts = 1 + (step.retries ?? 0);
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      if (step.timeout) {
        return await withTimeout(step.run(input, ctx), step.timeout);
      }
      return await step.run(input, ctx);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxAttempts - 1 && step.retryDelayMs) {
        await sleep(Math.min(step.retryDelayMs * Math.pow(2, attempt), 30_000)); // Exponential backoff capped at 30s
      }
    }
  }

  throw lastError ?? new Error(`Step "${step.id}" failed`);
}

// ─── Sequential Pipeline ──────────────────────────────────────────────────────

export class SequentialPipeline<TInput = unknown, TOutput = unknown> {
  private steps: PipelineStep[];
  private pipelineId: string;

  constructor(steps: PipelineStep[], id?: string) {
    this.steps = steps;
    this.pipelineId = id ?? crypto.randomUUID();
  }

  async run(input: TInput, metadata: Record<string, unknown> = {}): Promise<PipelineResult<TOutput>> {
    const start = Date.now();
    const ctx: PipelineContext = {
      pipelineId: this.pipelineId,
      stepResults: {},
      metadata,
    };

    const stepResults: PipelineResult["stepResults"] = {};
    let current: unknown = input;

    for (const step of this.steps) {
      const stepStart = Date.now();

      // Skip step if condition not met
      if (step.condition && !step.condition(current, ctx)) {
        stepResults[step.id] = { status: "skipped", durationMs: 0 };
        continue;
      }

      try {
        stepResults[step.id] = { status: "running", durationMs: 0 };
        const output = await runWithRetry(step, current, ctx);
        ctx.stepResults[step.id] = output;
        stepResults[step.id] = { status: "completed", output, durationMs: Date.now() - stepStart };
        current = output;
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        stepResults[step.id] = { status: "failed", error, durationMs: Date.now() - stepStart };
        return {
          pipelineId: this.pipelineId,
          output: current as TOutput,
          stepResults,
          totalDurationMs: Date.now() - start,
          succeeded: false,
        };
      }
    }

    return {
      pipelineId: this.pipelineId,
      output: current as TOutput,
      stepResults,
      totalDurationMs: Date.now() - start,
      succeeded: true,
    };
  }
}

// ─── Parallel Pipeline ────────────────────────────────────────────────────────

export class ParallelPipeline<TInput = unknown> {
  private steps: PipelineStep[];
  private concurrency: number;

  constructor(steps: PipelineStep[], concurrency = Infinity) {
    this.steps = steps;
    this.concurrency = concurrency;
  }

  async run(
    input: TInput,
    metadata: Record<string, unknown> = {}
  ): Promise<PipelineResult<Record<string, unknown>>> {
    const start = Date.now();
    const pipelineId = crypto.randomUUID();
    const ctx: PipelineContext = { pipelineId, stepResults: {}, metadata };
    const stepResults: PipelineResult["stepResults"] = {};

    // Process in batches for concurrency control
    const chunks = chunkArray(this.steps, this.concurrency);

    for (const chunk of chunks) {
      const settled = await Promise.allSettled(
        chunk.map(async (step) => {
          const stepStart = Date.now();
          if (step.condition && !step.condition(input, ctx)) {
            stepResults[step.id] = { status: "skipped", durationMs: 0 };
            return { stepId: step.id, output: undefined };
          }

          const output = await runWithRetry(step, input, ctx);
          ctx.stepResults[step.id] = output;
          stepResults[step.id] = { status: "completed", output, durationMs: Date.now() - stepStart };
          return { stepId: step.id, output };
        })
      );

      settled.forEach((result, i) => {
        if (result.status === "rejected") {
          const step = chunk[i];
          stepResults[step.id] = { status: "failed", error: String(result.reason), durationMs: 0 };
        }
      });
    }

    const succeeded = Object.values(stepResults).every((r) => r.status !== "failed");

    return {
      pipelineId,
      output: ctx.stepResults,
      stepResults,
      totalDurationMs: Date.now() - start,
      succeeded,
    };
  }
}

// ─── MapReduce Pipeline ───────────────────────────────────────────────────────
// Process a list of items in parallel (map), then combine results (reduce)

export class MapReducePipeline<TItem, TMapped, TReduced> {
  private mapFn: (item: TItem, index: number) => Promise<TMapped>;
  private reduceFn: (results: TMapped[]) => TReduced;
  private concurrency: number;
  private filter?: (item: TItem) => boolean;

  constructor(options: {
    map: (item: TItem, index: number) => Promise<TMapped>;
    reduce: (results: TMapped[]) => TReduced;
    concurrency?: number;
    filter?: (item: TItem) => boolean;
  }) {
    this.mapFn = options.map;
    this.reduceFn = options.reduce;
    this.concurrency = options.concurrency ?? 5;
    this.filter = options.filter;
  }

  async run(items: TItem[]): Promise<{ result: TReduced; mapped: TMapped[]; failedCount: number }> {
    const filtered = this.filter ? items.filter(this.filter) : items;
    const mapped: TMapped[] = [];
    let failedCount = 0;

    // Process in concurrency-limited batches
    const chunks = chunkArray(filtered, this.concurrency);

    for (const chunk of chunks) {
      const settled = await Promise.allSettled(
        chunk.map((item, i) => this.mapFn(item, i + mapped.length + failedCount))
      );

      for (const result of settled) {
        if (result.status === "fulfilled") mapped.push(result.value);
        else failedCount++;
      }
    }

    const result = this.reduceFn(mapped);
    return { result, mapped, failedCount };
  }
}

// ─── Agent Tool Dispatcher ────────────────────────────────────────────────────
// Routes tool calls from an AI model to registered handler functions

export interface Tool<TArgs = Record<string, unknown>, TReturn = unknown> {
  name: string;
  description: string;
  schema: Record<string, { type: string; description?: string; required?: boolean }>;
  handler: (args: TArgs) => Promise<TReturn>;
}

export class ToolDispatcher {
  private tools: Map<string, Tool> = new Map();

  register<TArgs, TReturn>(tool: Tool<TArgs, TReturn>): this {
    this.tools.set(tool.name, tool as Tool);
    return this;
  }

  async dispatch(name: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unknown tool: "${name}"`);
    return tool.handler(args);
  }

  getToolSchemas(): Array<{ name: string; description: string; schema: unknown }> {
    return [...this.tools.values()].map((t) => ({
      name: t.name,
      description: t.description,
      schema: t.schema,
    }));
  }

  hasTool(name: string): boolean { return this.tools.has(name); }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function sequential<I, O>(steps: PipelineStep[], id?: string): SequentialPipeline<I, O> {
  return new SequentialPipeline(steps, id);
}

export function parallel<I>(steps: PipelineStep[], concurrency?: number): ParallelPipeline<I> {
  return new ParallelPipeline(steps, concurrency);
}

export function mapReduce<TItem, TMapped, TReduced>(options: {
  map: (item: TItem, index: number) => Promise<TMapped>;
  reduce: (results: TMapped[]) => TReduced;
  concurrency?: number;
  filter?: (item: TItem) => boolean;
}): MapReducePipeline<TItem, TMapped, TReduced> {
  return new MapReducePipeline(options);
}

export function createDispatcher(): ToolDispatcher { return new ToolDispatcher(); }

/*
 * Usage Example:
 *
 * // Sequential AI pipeline: extract → analyze → format
 * const pipeline = sequential<string, Report>([
 *   { id: "extract",  name: "Extract entities", run: async (text) => extractEntities(text) },
 *   { id: "analyze",  name: "Analyze sentiment", run: async (entities, ctx) => analyzeSentiment(entities, ctx.stepResults.extract) },
 *   { id: "format",   name: "Format report",    run: async (analysis) => formatReport(analysis) },
 * ]);
 * const { output, succeeded } = await pipeline.run(userText);
 *
 * // Map-reduce: summarize 100 documents in parallel, then combine
 * const mr = mapReduce({
 *   map:    async (doc) => callLLM(`Summarize: ${doc.content}`),
 *   reduce: (summaries) => callLLM(`Combine these summaries: ${summaries.join("\n")}`),
 *   concurrency: 10,
 * });
 * const { result } = await mr.run(documents);
 *
 * // Tool dispatcher for Claude tool use
 * const dispatcher = createDispatcher()
 *   .register({ name: "search_web", description: "Search the web", schema: { query: { type: "string" } }, handler: searchWeb })
 *   .register({ name: "read_file",  description: "Read a file",    schema: { path:  { type: "string" } }, handler: readFile });
 */
