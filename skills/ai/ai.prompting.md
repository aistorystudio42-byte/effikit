<!-- @keywords: prompt engineering, system prompt, few-shot, chain of thought, Claude, GPT, LLM prompting -->

# AI — Prompt Engineering

## The Prompt as a Contract

A prompt is a contract between you and the model. Vague contracts produce unpredictable results. Precise contracts produce consistent, high-quality outputs. Every element of a prompt serves a purpose.

---

## Prompt Anatomy

```
[Role / Persona]         → Who is the model playing?
[Context / Background]   → What does the model need to know?
[Task]                   → What exactly should it do?
[Constraints]            → What rules must it follow?
[Output format]          → How should the response be structured?
[Examples]               → What does "good" look like?
```

```typescript
const systemPrompt = `
You are a senior TypeScript engineer performing code review.
Your role is to identify bugs, security vulnerabilities, and code quality issues.

Context:
  - This is a production Node.js API serving ~50k users
  - Security and correctness are the highest priorities
  - Performance matters, but readability is preferred over micro-optimizations

Task:
  Review the provided code and identify issues in these categories:
  1. Security vulnerabilities (highest priority)
  2. Correctness bugs (logic errors, edge cases)
  3. Performance issues (only if significant)
  4. Code quality issues (naming, complexity, duplication)

Output format:
  For each issue, provide:
  - Severity: [CRITICAL | HIGH | MEDIUM | LOW]
  - Category: [SECURITY | BUG | PERFORMANCE | QUALITY]
  - Location: file:line
  - Issue: what is wrong
  - Fix: concrete suggestion with code example

Rules:
  - Do not flag issues you're uncertain about
  - Do not suggest stylistic changes (only correctness/security/performance)
  - If code is good, say so — don't invent issues
`;
```

---

## Few-Shot Examples

The most powerful prompting technique. Examples communicate intent better than description.

```typescript
const classificationPrompt = `
Classify customer support tickets into categories.

Categories:
  BILLING    → payment, invoice, refund, subscription, charge
  TECHNICAL  → bug, error, not working, crash, slow
  ACCOUNT    → password, login, access, permissions, profile
  FEATURE    → request, suggestion, wish, would be nice
  OTHER      → anything that doesn't fit above

Examples:

Input: "I was charged twice for my subscription this month"
Output: BILLING

Input: "The dashboard keeps crashing when I filter by date"
Output: TECHNICAL

Input: "Can you add dark mode to the app?"
Output: FEATURE

Input: "I can't log in, my password reset email never arrived"
Output: ACCOUNT

Now classify:
Input: "{{ticket_body}}"
Output:`;
```

---

## Chain of Thought

For complex reasoning, ask the model to think step by step before answering.

```typescript
const analysisPrompt = `
Analyze this SQL query for performance issues.

Think through this step by step:
1. What tables are being accessed?
2. What indexes exist or might be needed?
3. Is there an N+1 pattern?
4. Are there any unnecessary computations in the WHERE clause?
5. What is the estimated row count at each step?
6. What would EXPLAIN ANALYZE likely show?

Only after completing your analysis, provide your recommendations.

Query:
\`\`\`sql
{{query}}
\`\`\``;
```

---

## Temperature and Sampling Parameters

```typescript
// Creative tasks — higher temperature, more variation
const creativeConfig = {
  model: 'claude-sonnet-4-6',
  max_tokens: 2000,
  temperature: 0.9,   // more creative, less predictable
};

// Analytical tasks — lower temperature, more deterministic
const analyticalConfig = {
  model: 'claude-sonnet-4-6',
  max_tokens: 4000,
  temperature: 0.2,   // more focused, consistent
};

// Classification / extraction — lowest temperature
const extractionConfig = {
  model: 'claude-sonnet-4-6',
  max_tokens: 500,
  temperature: 0.0,   // fully deterministic (same input = same output)
};
```

---

## Structured Output

Force the model to output structured data.

```typescript
const extractionPrompt = `
Extract the following information from the job posting.
Return ONLY valid JSON matching this exact schema — no explanation, no markdown:

{
  "title": "string",
  "company": "string",
  "location": "string | null",
  "remote": boolean,
  "salary": {
    "min": "number | null",
    "max": "number | null",
    "currency": "string | null"
  },
  "experience_years_min": "number | null",
  "skills_required": "string[]",
  "skills_preferred": "string[]"
}

Job posting:
{{job_posting_text}}`;

// Post-process: parse and validate
const response = await callLLM(extractionPrompt);
const data = JobPostingSchema.parse(JSON.parse(response));
```

---

## Prompt Versioning and Testing

```typescript
// Treat prompts like code — version them, test them
const PROMPT_VERSIONS = {
  'ticket-classifier-v1': {
    system: '...',
    testCases: [
      { input: 'charged twice', expected: 'BILLING' },
      { input: 'app is crashing', expected: 'TECHNICAL' },
    ],
  },
};

async function evaluatePrompt(version: string, testCases: TestCase[]) {
  let passed = 0;
  for (const tc of testCases) {
    const output = await callLLM(PROMPT_VERSIONS[version].system, tc.input);
    if (output.trim() === tc.expected) passed++;
  }
  return { passed, total: testCases.length, accuracy: passed / testCases.length };
}
```

---

## Prompt Engineering Checklist

- [ ] Role/persona defined (who the model is)
- [ ] Context provided (what the model needs to know)
- [ ] Task is specific and unambiguous
- [ ] Constraints are explicit (format, length, what to avoid)
- [ ] 2-5 few-shot examples provided for complex tasks
- [ ] Output format precisely specified (especially for structured data)
- [ ] Temperature matches task type (low for extraction, higher for generation)
- [ ] Prompt tested against edge cases before production deployment
