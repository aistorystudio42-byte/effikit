<!-- @keywords: logical fallacies, deductive reasoning, inductive reasoning, abductive reasoning, steelmanning, argument mapping, tech debates, logical structure, sound argument, valid argument -->

# Reasoning — Build Airtight Arguments, Detect Broken Ones

## Core Philosophy

Most technical debates are not won by the correct position — they are won by whoever argues most confidently. Logical reasoning tools let you evaluate arguments independent of who's making them, identify where an argument breaks, and construct positions that are genuinely hard to refute.

An argument can be valid (the conclusion follows from the premises) but unsound (the premises are false). Detecting which failure mode is happening changes how you respond.

---

## When to Activate

- Technical debates in team settings where consensus seems impossible
- Evaluating vendor pitches or technology recommendations
- Reviewing architectural proposals from teammates
- Constructing your own argument for a decision that will face scrutiny

---

## Principles

### Three Modes of Reasoning in Software
**Deductive:** If A is true and B is true, C must be true.  
*"Our system must handle 10k concurrent users. This architecture handles 8k. Therefore this architecture fails the requirement."*  
Use when you have verified premises and need guaranteed conclusions.

**Inductive:** We've observed A, B, and C. Probably D too.  
*"All three team members who tried Redux said it slowed them down. Probably Redux is wrong for this team."*  
Use for patterns and generalizations. Never certain — always probabilistic.

**Abductive:** The simplest explanation that accounts for all the evidence.  
*"The service slows down every day at 14:00. Batch jobs run at 14:00. The batch job is probably the cause."*  
Use for debugging and root cause analysis. Best guess, not proven.

---

### 12 Logical Fallacies in Tech Debates
**1. Appeal to Authority:** "Google uses it so we should."  
Google's constraints ≠ your constraints.

**2. False Dichotomy:** "We either rewrite it or live with the bugs."  
Third options almost always exist.

**3. Slippery Slope:** "If we allow any tech debt, the whole codebase will decay."  
Requires proof that each step follows necessarily from the last.

**4. Ad Hominem:** "Of course the backend engineer thinks we need more backend complexity."  
The person's role doesn't make their argument wrong or right.

**5. Straw Man:** Misrepresenting the opposing position to make it easier to defeat.  
Always steelman before refuting.

**6. Bandwagon:** "Everyone is moving to microservices."  
Popularity is not correctness.

**7. Correlation as Causation:** "We added Redis and performance improved."  
What else changed that week?

**8. Hasty Generalization:** "I tried Rust once, it was slow to write, Rust is slow."  
One instance is not a pattern.

**9. Circular Reasoning:** "This is the best approach because it's the best practice."  
The premise restates the conclusion.

**10. Appeal to Tradition:** "We've always done it this way."  
Age is not validity.

**11. Appeal to Novelty:** "This new framework is better because it's newer."  
New is not automatically improved.

**12. False Cause (Post Hoc):** "After we hired a new CTO, deployments got better."  
Temporal sequence is not causation.

---

### Steelmanning
Before refuting any position, construct the strongest possible version of it — stronger than the person arguing it stated. If you can't construct this, you don't understand the position well enough to refute it.

**Process:**
1. State their position accurately.
2. Add the best evidence that supports it (even if they didn't mention it).
3. Acknowledge what conditions would make their position correct.
4. Only then present your counter-argument.

---

## Decision Framework

- Evaluate the complexity of the task.
- Identify structural bottlenecks.
- Choose the simplest abstraction that solves the problem.

## Anti-Patterns

- Winning an argument through rhetoric instead of logic — damages long-term trust
- Using fallacy labels as debate weapons rather than genuine reasoning tools
- Building a logically valid argument on false premises — wrong conclusions, undetectable
- Refusing to update when shown a valid counterargument — intellectual dishonesty

---

## Example in Action

Analyze "we should use microservices because Netflix does":

**Argument structure:**
1. Netflix uses microservices. (Premise — true)
2. Netflix is successful. (Premise — true)
3. Microservices caused Netflix's success. (Hidden premise — unverified)
4. We should use microservices. (Conclusion)

**Fallacies present:**

*Appeal to Authority:* Netflix's practices are cited as justification. Netflix's constraints (40M concurrent users, 1000+ engineers, global distribution) are not ours.

*Post Hoc Fallacy:* Netflix's success may be due to their content, their recommendation engine, their pricing, or dozens of other factors. Attributing it to microservices assumes causation from correlation.

*Bandwagon:* The argument could be restated as "everyone successful uses microservices." Popularity is not correctness.

*False Cause:* The hidden premise (microservices caused success) is never proven. Netflix had to manage enormous operational complexity to make microservices work — complexity that is causally related to their scale, not their success per se.

**Steelman of the argument:**
The strongest version: "Netflix's microservices architecture allowed independent team scaling, independent deployment cadences, and fault isolation at a scale that a monolith would have made impossible. If we expect similar scale challenges, the upfront investment in microservices is justified by the later flexibility it enables."

**Counter-argument:**
We have 5 engineers and 20k users. Netflix's microservices solved problems we don't have yet. The operational overhead of 15 services (networking, service discovery, distributed tracing, deployment coordination) costs more than the deployment independence gains us at this scale. The argument proves microservices work at Netflix's scale, not at ours.

**Verdict:** Argument is logically invalid. Premise 3 is unverified and the conclusion doesn't follow from the verified premises alone.
