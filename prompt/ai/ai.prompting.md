<!-- @keywords: prompt engineering, prompt design, few-shot, chain of thought, system prompt, LLM, Claude -->
<!-- @domain: Prompt Engineering Prompts -->

# Prompt Engineering Prompts

## System Prompt Design

```
Design a system prompt for an AI assistant that: [describe purpose]

**Assistant role:**
[what the assistant does, who it helps, what tone it takes]

**System prompt template:**

```
You are [Name], [one-sentence description of role].

## Your primary tasks
- [Task 1]
- [Task 2]
- [Task 3]

## How you communicate
- [Tone: direct / friendly / formal]
- [Response length: brief unless asked / comprehensive / always concise]
- [Format: plain text / markdown / structured]
- [Language: [English / Turkish / match user's language]]

## What you know
- You have access to: [describe context — user's data / tools / documents]
- Your knowledge cutoff is: [date]
- You do NOT have access to: [internet / real-time data / external services]

## What you will not do
- [Hard limit 1]
- [Hard limit 2]
- [Hard limit 3]

## When you're uncertain
[Describe how to handle uncertainty — ask for clarification / state confidence / 
cite sources]
```

**Anti-patterns to avoid in system prompts:**
- "Never say I don't know" → creates hallucination pressure
- "Always be positive" → blocks honest feedback
- Contradictory instructions → confuses the model
- Overly long system prompts → reduces attention on relevant parts

Design the system prompt for: [your specific assistant use case].
```

---

## Few-Shot Prompt Design

```
Create a few-shot prompt for: [task]

**Task description:**
[what the model should learn to do from the examples]

**Why few-shot:**
[the task has a specific output format / style / reasoning pattern that's 
hard to describe but easy to demonstrate]

**Example structure:**

```
You are an expert at [task].

Below are examples of inputs and their correct outputs.

---
Input: [example 1 input]
Output: [example 1 output]

---
Input: [example 2 input]
Output: [example 2 output]

---
Input: [example 3 input]
Output: [example 3 output]

---
Now complete this:
Input: [actual input]
Output:
```

**Guidelines for choosing examples:**
- Use real inputs, not synthetic ones
- Cover the range of input complexity (easy + hard)
- Include edge cases you want the model to handle
- 3-5 examples is usually optimal — more can hurt if they're repetitive
- The last example before the actual input sets the strongest prior

**Write 5 examples for:** [your specific task]
```

---

## Chain-of-Thought Prompt

```
Design a chain-of-thought prompt for: [reasoning task]

**Task:** [describe the complex reasoning or analysis task]

**Why chain-of-thought:**
The task requires: [multi-step reasoning / complex inference / nuanced judgment]
Without explicit reasoning, the model tends to: [describe failure mode]

**Prompt with CoT:**

```
[Task description and context]

Before providing your answer, think through the problem step by step:

Step 1 — [what to analyze first]
Step 2 — [what to consider next]
Step 3 — [what to evaluate]
Step 4 — [how to synthesize]

Then provide your final answer.

---
[Actual input]

Let me think through this step by step:
```

**Zero-shot CoT (simpler):**
Just append: "Let's think step by step." to the prompt.
This alone significantly improves complex reasoning performance.

**Self-consistency (more robust):**
Run the CoT prompt N times (temperature > 0), take the majority answer.
Use when correctness matters more than cost.

Design the CoT prompt for: [your specific reasoning task].
```

---

## Structured Output Prompt

```
Design a prompt that reliably produces structured output.

**Output format needed:**
[JSON / Markdown table / numbered list / specific schema]

**Reliability problem:**
Without structure instructions, the model produces: [inconsistent format]

**Solution — explicit schema in prompt:**

```
Analyze [input] and return your response ONLY as a valid JSON object 
matching this exact schema. No text before or after the JSON.

Schema:
{
  "summary": string,           // 1-2 sentences
  "sentiment": "positive" | "negative" | "neutral",
  "confidence": number,        // 0.0 to 1.0
  "key_points": string[],      // array of 3-5 items
  "action_required": boolean
}

If you cannot determine a field, use null (not omit it).

Input: [input]
```

**For Claude API — use structured output:**
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const ResponseSchema = z.object({
  summary: z.string(),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  confidence: z.number().min(0).max(1),
  keyPoints: z.array(z.string()).min(1).max(5),
  actionRequired: z.boolean(),
});

const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  messages: [{ role: 'user', content: prompt }],
});

const parsed = ResponseSchema.parse(JSON.parse(response.content[0].text));
```

Design the structured output prompt for: [your specific use case].
```

---

## Prompt Testing & Evaluation

```
Design a prompt evaluation framework for: [AI feature]

**What we're evaluating:**
[summarization / classification / extraction / generation / QA]

**Evaluation dimensions:**

**1. Correctness:**
Does the output contain the right information?
- Create a test set of [N=50] input→expected output pairs
- Measure: exact match / F1 score / human-judged accuracy

**2. Format compliance:**
Does the output follow the required format?
- Automated check: JSON parse success / regex match / schema validation
- Target: >99% format compliance

**3. Hallucination rate:**
Does the model make up facts not in the input?
- Test: inputs with deliberate knowledge gaps
- Count: how often model invents vs says "I don't know"

**4. Instruction following:**
Does it obey all constraints (length, tone, language)?
- Create test cases that exercise each constraint separately

**Eval setup:**
```typescript
interface EvalCase {
  input: string;
  expectedOutput: string;
  expectedFields?: string[];  // for partial match
}

async function evaluatePrompt(
  prompt: string,
  testCases: EvalCase[],
  judge: (expected: string, actual: string) => number  // 0-1 score
) {
  const results = await Promise.all(testCases.map(async (tc) => {
    const actual = await runPrompt(prompt, tc.input);
    return {
      input: tc.input,
      expected: tc.expectedOutput,
      actual,
      score: judge(tc.expectedOutput, actual),
    };
  }));
  
  return {
    meanScore: results.reduce((s, r) => s + r.score, 0) / results.length,
    failures: results.filter(r => r.score < 0.8),
  };
}
```

Design the evaluation framework for: [your specific AI feature].
```
