<!-- @keywords: first principles, decomposition, assumption inventory, why ladder, analogy rejection, constraint-based reasoning, Elon Musk, Feynman technique, mental models, problem solving -->

# Reasoning — Decompose to Truth, Rebuild from Atoms

## Core Philosophy

First principles reasoning is not about being contrarian. It is about refusing to accept inherited assumptions as facts. Every "best practice" is someone's conclusion based on their constraints — your constraints may be different. Rebuild from what you can verify, not from what you've been told.

The enemy of first principles is the analogy: "We should do it like Netflix." Netflix has 1000 engineers. You have 3. Their solutions are built for their constraints.

---

**Assumptions have a half-life.** The assumption that was correct 2 years ago may be incorrect today. Re-examine decisions when constraints change, not just when problems arise.

**Physics is the floor.** When the why ladder hits physical limits (network latency exists, RAM has cost, CPUs have a clock rate), you've reached atoms. Stop there.

**Simplicity is the default.** The first-principles answer is almost always simpler than the inherited pattern. Complexity is often just accumulated assumption-debt.

---

## When to Activate

- A technical decision feels like it has an obvious answer but you're not sure why
- You're about to copy a pattern from a larger company without understanding why they use it
- The team is stuck in a debate about the "right way" without examining underlying assumptions
- A requirement seems impossible — first principles often reveals it's not

---

## Principles

### 5-Step Decomposition
**Step 1 — State the problem in one sentence.**  
Not the solution. Not the constraint. The actual problem. "We need microservices" is not a problem. "Our deployment takes 40 minutes and blocks the team" is.

**Step 2 — List every assumption embedded in the current approach.**  
Write them all down. "We assumed we need a separate database per service." "We assumed horizontal scaling was necessary." Don't evaluate yet — just inventory.

**Step 3 — Ask "why" until you hit physics or math.**  
The why ladder: Why do we need separate databases? → Because services must be independent. → Why must they be independent? → Because we have 4 teams deploying simultaneously. → Why do 4 teams deploying cause problems? → Because our monolith has no deployment isolation. 

You've found the real problem: deployment isolation, not microservices.

**Step 4 — Reject all analogies.**  
"Amazon uses microservices" is not evidence for your situation. What are your actual constraints? 3 developers. 10k users. Single region. Rebuild from those facts, not from analogies to companies with different facts.

**Step 5 — Rebuild from constraints.**  
Given your real constraints, what is the minimum solution that addresses the root cause? Often it's simpler than what you inherited.

---

## Decision Framework

- Evaluate the complexity of the task.
- Identify structural bottlenecks.
- Choose the simplest abstraction that solves the problem.

## Anti-Patterns

- Stopping the why ladder too early — "because that's best practice" is not a first principle
- Using first principles to justify ignoring proven solutions without understanding them first
- Applying first principles to problems that genuinely don't warrant it — use it for decisions, not for every implementation detail
- First principles as a solo exercise — the best decompositions happen in pairs where each person can challenge the other's assumptions

---

## Example in Action

First principles applied to monolith vs microservices:

**Initial assumption:** "We need microservices because we're scaling."

**Step 1 — Real problem:**  
"Our backend deploys take 45 minutes. Bugs in one module cause full system rollbacks. Teams block each other."

**Step 2 — Assumption inventory:**
- Microservices is the only way to achieve deployment independence
- We need deployment independence now
- Our team can operate multiple services
- Network calls between services are acceptable latency
- We have infrastructure to manage service discovery

**Step 3 — Why ladder:**  
Why do we need deployment independence? → Because one bad deploy breaks everything.  
Why does one deploy break everything? → Because the monolith is one deployable unit.  
Why can't we deploy parts independently? → Because we have no module boundary enforcement.  
Why not? → Because we never separated concerns at the module level.  

**Root cause: lack of module boundaries, not lack of microservices.**

**Step 4 — Reject the Netflix analogy:**  
Netflix has 2000+ engineers and services that must scale independently to millions of users. You have 5 engineers and 50k users. Their constraints don't apply.

**Step 5 — First principles solution:**  
Enforce internal module boundaries in the monolith. Use barrel exports to enforce public APIs between modules. Add CI gates that fail if module A imports from module B's internals. This gives deployment-safe isolation without the operational complexity of 15 services.

**Result:** Same deployment independence. Zero infrastructure overhead. Migration path to microservices later if load actually requires it — with clean boundaries already in place.
