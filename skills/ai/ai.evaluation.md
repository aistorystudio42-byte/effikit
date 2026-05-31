<!-- @keywords: AI evaluation, LLM testing, evals, accuracy, hallucination, benchmark, quality metrics -->

# AI — Evaluation and Quality Assurance

## Why Evaluation Is Non-Negotiable

LLMs are probabilistic. The same prompt can produce different outputs. Without systematic evaluation, you don't know if your prompt changes improved or degraded quality. You're flying blind.

---

## Evaluation Types

```
Automated Evals (fast, scalable):
  - Exact match: output matches expected exactly
  - Regex match: output contains expected pattern
  - JSON schema validation: structured output is valid
  - LLM-as-judge: another LLM grades the output

Human Evals (slow, expensive, ground truth):
  - Blind comparison: A/B test between versions
  - Rating: 1-5 scale on specific dimensions
  - Error annotation: identify what went wrong

Behavioral Evals:
  - Adversarial inputs: does it handle edge cases?
  - Consistency: same input → same output class
  - Refusal testing: does it refuse harmful requests correctly?
```

---

## Building an Eval Suite

```typescript
interface EvalCase {
  id: string;
  input: string;
  expected: string | string[] | RegExp;
  metadata?: Record<string, unknown>;
}

interface EvalResult {
  caseId: string;
  passed: boolean;
  actual: string;
  expected: string | string[] | RegExp;
  latencyMs: number;
  tokenUsage: { input: number; output: number };
}

class EvalRunner {
  async run(
    cases: EvalCase[],
    promptFn: (input: string) => Promise<string>,
  ): Promise<EvalReport> {
    const results: EvalResult[] = [];

    for (const evalCase of cases) {
      const start = Date.now();
      const actual = await promptFn(evalCase.input);
      const latencyMs = Date.now() - start;

      const passed = this.checkExpected(actual, evalCase.expected);
      results.push({ caseId: evalCase.id, passed, actual, expected: evalCase.expected, latencyMs, tokenUsage: { input: 0, output: 0 } });
    }

    return this.generateReport(results);
  }

  private checkExpected(actual: string, expected: string | string[] | RegExp): boolean {
    if (expected instanceof RegExp) return expected.test(actual);
    if (Array.isArray(expected)) return expected.some(e => actual.includes(e));
    return actual.includes(expected);
  }

  private generateReport(results: EvalResult[]): EvalReport {
    const passed = results.filter(r => r.passed).length;
    return {
      total: results.length,
      passed,
      failed: results.length - passed,
      accuracy: passed / results.length,
      avgLatencyMs: results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length,
      failedCases: results.filter(r => !r.passed),
    };
  }
}
```

---

## LLM-as-Judge

Use a capable model to evaluate another model's output.

```typescript
async function judgeOutput(
  question: string,
  answer: string,
  criteria: string[],
): Promise<JudgementResult> {
  const judgePrompt = `
You are evaluating the quality of an AI assistant's response.

Question asked: ${question}

Response to evaluate:
${answer}

Evaluate on these criteria. For each, provide a score from 1-5 and a brief justification.

Criteria:
${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Output format (JSON only):
{
  "scores": {
    "${criteria[0]}": { "score": number, "justification": "string" },
    ...
  },
  "overall_score": number,
  "overall_justification": "string",
  "contains_hallucination": boolean,
  "hallucination_details": "string | null"
}`;

  const response = await client.messages.create({
    model: 'claude-opus-4-8', // use the most capable model as judge
    max_tokens: 1000,
    temperature: 0,
    messages: [{ role: 'user', content: judgePrompt }],
  });

  return JSON.parse(getTextContent(response));
}

// Usage
const judgement = await judgeOutput(
  'What are the SOLID principles?',
  modelResponse,
  [
    'Accuracy: Does it correctly explain all 5 SOLID principles?',
    'Completeness: Are all principles covered?',
    'Clarity: Is the explanation clear to a junior developer?',
    'Conciseness: Is it appropriately brief without omitting key points?',
  ]
);
```

---

## Hallucination Detection

```typescript
class HallucinationDetector {
  // Check if model's factual claims are grounded in provided context
  async detectGroundedness(
    context: string,
    question: string,
    answer: string,
  ): Promise<GroundednessResult> {
    const prompt = `
You are verifying whether an AI response is grounded in the provided context.

Context:
${context}

Question: ${question}

AI Response: ${answer}

For each factual claim in the response:
1. Identify the claim
2. Check if it's supported by the context
3. Mark as SUPPORTED, UNSUPPORTED, or NOT_VERIFIABLE

Return JSON:
{
  "claims": [
    {
      "claim": "string",
      "status": "SUPPORTED" | "UNSUPPORTED" | "NOT_VERIFIABLE",
      "evidence": "string | null"
    }
  ],
  "overall_grounded": boolean,
  "ungrounded_claims_count": number
}`;

    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1000,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });

    return JSON.parse(getTextContent(response));
  }
}
```

---

## Regression Testing

```typescript
// Lock in known-good outputs — alert if quality degrades
class PromptRegressionTest {
  async compare(
    promptV1: string,
    promptV2: string,
    testCases: EvalCase[],
  ): Promise<ComparisonReport> {
    const [v1Results, v2Results] = await Promise.all([
      evalRunner.run(testCases, input => callPrompt(promptV1, input)),
      evalRunner.run(testCases, input => callPrompt(promptV2, input)),
    ]);

    return {
      v1Accuracy: v1Results.accuracy,
      v2Accuracy: v2Results.accuracy,
      improvement: v2Results.accuracy - v1Results.accuracy,
      regressions: v2Results.failedCases.filter(
        fc => v1Results.failedCases.every(v1fc => v1fc.caseId !== fc.caseId)
      ),
    };
  }
}
```

---

## Evaluation Checklist

- [ ] Eval suite covers happy path AND edge cases
- [ ] Minimum 50 test cases for core functionality
- [ ] Adversarial cases included (attempts to break the prompt)
- [ ] LLM-as-judge used for subjective quality dimensions
- [ ] Hallucination detection run on factual answering pipelines
- [ ] Regression suite run before every prompt change to production
- [ ] Latency tracked alongside accuracy (cost/performance tradeoff)
- [ ] Failed cases analyzed to identify prompt improvement opportunities
