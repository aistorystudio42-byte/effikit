/**
 * @keywords    prompt engineering, template, chain, few-shot, system prompt, instruction, Claude, GPT
 * @domain      AI Prompt
 * @use-when    Building reusable, composable prompt templates with variable interpolation and chain management
 * @not-when    One-off prompts — this is for systematic prompt management across a product
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type PromptRole = "system" | "user" | "assistant";

export interface PromptMessage {
  role: PromptRole;
  content: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;          // Handlebars-style: {{ variable }}
  requiredVars: string[];
  optionalVars: string[];
  role: PromptRole;
  examples?: Array<{ vars: Record<string, string>; expectedOutput?: string }>;
}

export interface ChainStep {
  templateId: string;
  vars?: Record<string, string>;
  outputVar?: string;        // Save this step's output as a variable for next steps
}

export interface RenderedPrompt {
  messages: PromptMessage[];
  tokensEstimate: number;
  variables: Record<string, string>;
}

// ─── Template Engine ──────────────────────────────────────────────────────────

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z_]\w*)\s*\}\}/g, (match, key) => {
    if (key in vars) return vars[key];
    return match; // Keep unreplaced variables as-is (they might be optional)
  });
}

function extractVars(template: string): string[] {
  const matches = template.matchAll(/\{\{\s*([a-zA-Z_]\w*)\s*\}\}/g);
  return [...new Set([...matches].map((m) => m[1]))];
}

function estimateTokens(text: string): number {
  // Rough approximation: ~4 chars per token for English text
  return Math.ceil(text.length / 4);
}

// ─── PromptLibrary ────────────────────────────────────────────────────────────

export class PromptLibrary {
  private templates: Map<string, PromptTemplate> = new Map();

  register(template: Omit<PromptTemplate, "requiredVars" | "optionalVars"> & { requiredVars?: string[] }): this {
    const allVars = extractVars(template.template);
    const required = template.requiredVars ?? allVars;
    const optional = allVars.filter((v) => !required.includes(v));

    this.templates.set(template.id, {
      ...template,
      requiredVars: required,
      optionalVars: optional,
    });

    return this;
  }

  get(id: string): PromptTemplate | undefined { return this.templates.get(id); }

  render(id: string, vars: Record<string, string>): string {
    const template = this.templates.get(id);
    if (!template) throw new Error(`Prompt template "${id}" not found`);

    // Check required vars
    const missing = template.requiredVars.filter((v) => !(v in vars));
    if (missing.length > 0) {
      throw new Error(`Missing required variables for template "${id}": ${missing.join(", ")}`);
    }

    return renderTemplate(template.template, vars);
  }

  validate(id: string, vars: Record<string, string>): { valid: boolean; missing: string[]; extra: string[] } {
    const template = this.templates.get(id);
    if (!template) throw new Error(`Template "${id}" not found`);

    const allVars = [...template.requiredVars, ...template.optionalVars];
    const missing = template.requiredVars.filter((v) => !(v in vars));
    const extra   = Object.keys(vars).filter((v) => !allVars.includes(v));

    return { valid: missing.length === 0, missing, extra };
  }

  list(): PromptTemplate[] { return [...this.templates.values()]; }
}

// ─── PromptBuilder — Fluent API ───────────────────────────────────────────────

export class PromptBuilder {
  private messages: PromptMessage[] = [];
  private globalVars: Record<string, string> = {};

  system(content: string, vars?: Record<string, string>): this {
    this.messages.push({ role: "system", content: renderTemplate(content, { ...this.globalVars, ...vars }) });
    return this;
  }

  user(content: string, vars?: Record<string, string>): this {
    this.messages.push({ role: "user", content: renderTemplate(content, { ...this.globalVars, ...vars }) });
    return this;
  }

  assistant(content: string): this {
    this.messages.push({ role: "assistant", content });
    return this;
  }

  withVars(vars: Record<string, string>): this {
    this.globalVars = { ...this.globalVars, ...vars };
    return this;
  }

  fewShot(examples: Array<{ input: string; output: string }>): this {
    for (const { input, output } of examples) {
      this.messages.push({ role: "user", content: input });
      this.messages.push({ role: "assistant", content: output });
    }
    return this;
  }

  build(): RenderedPrompt {
    const fullText = this.messages.map((m) => m.content).join("\n");
    return {
      messages: [...this.messages],
      tokensEstimate: estimateTokens(fullText),
      variables: { ...this.globalVars },
    };
  }

  reset(): this { this.messages = []; this.globalVars = {}; return this; }
}

// ─── Prompt Chain ─────────────────────────────────────────────────────────────

export class PromptChain {
  private steps: ChainStep[];
  private library: PromptLibrary;

  constructor(library: PromptLibrary, steps: ChainStep[]) {
    this.library = library;
    this.steps = steps;
  }

  /** Build all messages in the chain, optionally carrying output vars between steps */
  build(initialVars: Record<string, string> = {}): PromptMessage[][] {
    const vars = { ...initialVars };
    const chainMessages: PromptMessage[][] = [];

    for (const step of this.steps) {
      const template = this.library.get(step.templateId);
      if (!template) throw new Error(`Template "${step.templateId}" not found`);

      const stepVars = { ...vars, ...(step.vars ?? {}) };
      const content = this.library.render(step.templateId, stepVars);

      chainMessages.push([{ role: template.role, content }]);

      // If this step has an outputVar, simulate its value (for testing/dry-run)
      if (step.outputVar) vars[step.outputVar] = `[Output of ${step.templateId}]`;
    }

    return chainMessages;
  }

  /** Execute chain against a model function */
  async execute(
    initialVars: Record<string, string>,
    model: (messages: PromptMessage[]) => Promise<string>
  ): Promise<{ results: string[]; finalVars: Record<string, string> }> {
    const vars = { ...initialVars };
    const results: string[] = [];
    const conversationHistory: PromptMessage[] = [];

    for (const step of this.steps) {
      const template = this.library.get(step.templateId);
      if (!template) throw new Error(`Template "${step.templateId}" not found`);

      const stepVars = { ...vars, ...(step.vars ?? {}) };
      const content = this.library.render(step.templateId, stepVars);
      conversationHistory.push({ role: template.role, content });

      const output = await model([...conversationHistory]);
      results.push(output);
      conversationHistory.push({ role: "assistant", content: output });

      if (step.outputVar) vars[step.outputVar] = output;
    }

    return { results, finalVars: vars };
  }
}

// ─── Built-in Common Templates ────────────────────────────────────────────────

export const CommonTemplates = {
  codeReview: (): Omit<PromptTemplate, "requiredVars" | "optionalVars"> => ({
    id: "code-review",
    name: "Code Review",
    description: "Reviews a code snippet for correctness, style, and potential issues",
    role: "user",
    template: `Review the following {{ language }} code for correctness, security, and best practices.
Focus on: {{ focus }}

\`\`\`{{ language }}
{{ code }}
\`\`\`

Provide specific, actionable feedback. Be concise.`,
  }),

  summarize: (): Omit<PromptTemplate, "requiredVars" | "optionalVars"> => ({
    id: "summarize",
    name: "Summarize",
    description: "Summarizes content to a target length",
    role: "user",
    template: `Summarize the following {{ contentType }} in {{ targetLength }}:

{{ content }}

Summary:`,
  }),

  translate: (): Omit<PromptTemplate, "requiredVars" | "optionalVars"> => ({
    id: "translate",
    name: "Translate",
    description: "Translates text between languages",
    role: "user",
    template: `Translate the following text from {{ sourceLanguage }} to {{ targetLanguage }}.
Maintain the original tone and style.

{{ text }}

Translation:`,
  }),
};

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createLibrary(): PromptLibrary { return new PromptLibrary(); }
export function createBuilder(): PromptBuilder { return new PromptBuilder(); }
export function createChain(library: PromptLibrary, steps: ChainStep[]): PromptChain {
  return new PromptChain(library, steps);
}

/*
 * Usage Example:
 *
 * const lib = createLibrary();
 * lib.register(CommonTemplates.codeReview());
 * lib.register(CommonTemplates.summarize());
 *
 * // Render a single template
 * const prompt = lib.render("code-review", {
 *   language: "TypeScript",
 *   focus: "type safety and edge cases",
 *   code: "function add(a, b) { return a + b; }",
 * });
 *
 * // Fluent builder
 * const { messages } = createBuilder()
 *   .system("You are an expert TypeScript developer.")
 *   .fewShot([{ input: "What is a union type?", output: "A union type allows a value to be one of several types." }])
 *   .user("Explain generics in TypeScript.")
 *   .build();
 *
 * // Chain: summarize then translate
 * const chain = createChain(lib, [
 *   { templateId: "summarize", vars: { contentType: "article", targetLength: "2 sentences" }, outputVar: "summary" },
 *   { templateId: "translate", vars: { sourceLanguage: "English", targetLanguage: "Turkish" }, },
 * ]);
 */
