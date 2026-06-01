<!-- @keywords: cognitive biases, debiasing, pre-mortem, red team, confirmation bias, sunk cost, dunning kruger, availability heuristic, software engineering biases, decision quality -->

# Reasoning — Your Brain Lies About Your Code

## Core Philosophy

Cognitive biases are not signs of stupidity — they are evolutionary shortcuts that misfire in complex, low-feedback environments like software engineering. Your brain is optimized for savanna survival, not distributed systems architecture.

The corrective is not willpower. It is process. The same brain that produces the bias produces the override — and it can't tell the difference. Debiasing works by changing the decision process, not by trying to think differently.

---

## When to Activate

- Major architectural decisions
- Estimating time for a complex feature
- Evaluating whether to rewrite vs. refactor
- Post-mortems after incidents
- Performance reviews or hiring decisions

---

## Principles

### 8 Cognitive Biases Dangerous in Software Engineering
### 1. Confirmation Bias
**What it does:** You notice evidence that supports your existing belief and discount evidence that contradicts it.  
**In software:** You test the happy path but not the edge cases. Your code review finds flaws in the approach you argued against but not in your own PR.  
**Debiasing:** Assign someone explicitly to find flaws in your preferred solution. If no one disagrees in an architecture review, something is wrong.

### 2. Sunk Cost Fallacy
**What it does:** You continue investing in something because of past investment, not future value.  
**In software:** "We've spent 6 months on this approach, we can't change now." The 6 months are gone. The question is: what's the best path forward from today?  
**Debiasing:** In every continuation decision, explicitly ask: "If we were starting today with no prior investment, would we choose this path?"

### 3. Planning Fallacy
**What it does:** You systematically underestimate time for your own projects while correctly estimating others'.  
**In software:** Every developer believes their feature will take 2 days. It takes 2 weeks.  
**Debiasing:** Reference class forecasting — find 5 similar past tasks, average their actual time, use that estimate instead of your intuition.

### 4. Dunning-Kruger Effect
**What it does:** Incompetence in a domain prevents you from recognizing your incompetence.  
**In software:** The developer who has used Kubernetes for 3 weeks recommends it confidently; the one with 3 years of experience knows what can go wrong.  
**Debiasing:** Explicitly list what you don't know in any domain before making a decision in it. Unknown unknowns are the risk.

### 5. Availability Heuristic
**What it does:** You overweight recent or vivid events when estimating probability.  
**In software:** You were just bitten by a Redis bug, so you recommend Postgres everywhere. Last week's incident dominates your risk assessment.  
**Debiasing:** Use base rates, not recent events. How often does Redis actually fail in production? Look up the data before deciding.

### 6. Status Quo Bias
**What it does:** You prefer the current state even when change would be beneficial.  
**In software:** "We've always used Jenkins." "The monolith works fine." The current state feels safe because its risks are known.  
**Debiasing:** Explicitly list the costs of the status quo, not just the risks of change. Both options have costs.

### 7. Bandwagon Effect / Social Proof
**What it does:** You adopt beliefs because others hold them, especially respected others.  
**In software:** The tech lead said GraphQL, so everyone agrees it's the right choice. The team consensus feels like a signal when it might just be deference.  
**Debiasing:** Before adopting a group position, write your own independent assessment. Only then compare with the group's.

### 8. Optimism Bias
**What it does:** You believe you are less likely to experience negative events than the base rate.  
**In software:** "Our system won't have race conditions." "We won't need to handle that edge case." "Users won't do X."  
**Debiasing:** Pre-mortem analysis (see below). Force yourself to imagine failure before it happens.

---

### Pre-Mortem Analysis
Before launching a major decision, imagine it is 12 months from now and the decision was a catastrophic failure. Write the story of how it failed.

**Questions to answer:**
1. What was the first sign something was wrong?
2. What assumption turned out to be false?
3. What did we know at the time but discount?
4. What did we not know that we should have investigated?

This reversal forces your brain to use imagination rather than optimism bias to evaluate the decision.

---

## Decision Framework

- Evaluate the complexity of the task.
- Identify structural bottlenecks.
- Choose the simplest abstraction that solves the problem.

## Anti-Patterns

- Over-engineering the solution.
- Ignoring context and copying blindly.
- Mixing concerns unnecessarily.

## Example in Action

Full pre-mortem on a major architectural decision:

**Decision:** Migrate from REST to GraphQL for the API layer. Timeline: 3 months. Team: 4 engineers.

**Pre-mortem — it is now 15 months later and the migration was a disaster:**

*"We shipped GraphQL after 6 months (not 3). The mobile app had performance problems we didn't anticipate — the flexible query structure led to N+1 query patterns that our REST endpoints never had. Three months after the migration, we hired a new backend engineer who had no GraphQL experience — onboarding took 3× longer than expected. Two months after that, we had a security incident: a researcher discovered that an overly permissive schema allowed cross-user data access through nested queries — something our REST permission model never had to handle. We spent 2 months on security hardening. The total cost: 11 months of engineering, 1 security incident, and a team that now feels burned by framework migrations."*

**Bias extraction from the pre-mortem:**

- **Planning fallacy:** 3-month estimate became 6 months. Reference class: how long did the last major API change take?
- **Optimism bias:** "Our permissions model will handle it" — assumed without testing the GraphQL-specific attack surface.
- **Dunning-Kruger:** Team had 3 months of GraphQL experience when they proposed it.
- **Availability heuristic:** Had just watched a conference talk on GraphQL success — weighted that more than the failure stories.

**Decision update based on pre-mortem:**  
Add explicit mitigations: GraphQL security audit before launch, N+1 query testing in CI, documentation so new hires can onboard. Revise timeline to 5 months. Assign one engineer to red-team the schema for permission edge cases before go-live.
