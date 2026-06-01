<!-- @keywords: Socratic method, questioning, self-directed questioning, productive doubt, analysis paralysis, technical decisions, interrogation, commitment, question taxonomy -->

# Reasoning — Questions Are More Powerful Than Answers

## Core Philosophy

The Socratic method does not produce the answer — it reveals the answer you already had but hadn't examined. The goal is not to question indefinitely but to reach a point where the remaining uncertainty is small enough that a decision is clearly better than continued analysis.

In engineering, Socratic questioning serves two purposes: exposing hidden assumptions before they become production bugs, and building consensus by leading people to conclusions rather than imposing them.

---

## When to Activate

- Before a significant technical decision (architecture, library choice, rewrite)
- When a team is debating without convergence
- When your own solution feels right but you can't explain why
- When someone presents a plan you're skeptical of but can't immediately disprove

---

Productive doubt has a limit. The signal to stop questioning and decide:

- The remaining uncertainty is smaller than the cost of further analysis
- You've identified the top 3 risks and have mitigation plans for each
- You can steelman the opposing position (question 5 above) and still prefer your choice
- A decision made now and revised later is cheaper than a decision not made

**Paralysis markers:** You keep asking the same question in different forms. Every new question reveals another question with no path to a decision. You're adding stakeholders to avoid making the call.

---

## Principles

### Socratic Question Taxonomy
**Clarifying questions** — expose what the statement actually means:
- "What do you mean when you say it's 'slow'?"
- "Can you give me a concrete example of this failing?"
- "What would 'working correctly' look like?"

**Assumption questions** — surface unstated beliefs:
- "What has to be true for this solution to work?"
- "Are we assuming users will always do X? What if they don't?"
- "What are we taking for granted here?"

**Evidence questions** — test the quality of reasoning:
- "What data are we basing this on?"
- "Have we seen this work at our scale?"
- "What would we need to see to change our mind?"

**Implication questions** — trace consequences forward:
- "If we do this, what happens when requirements change?"
- "What breaks first if this assumption is wrong?"
- "If this is the solution, what does that tell us about the problem?"

**Alternative questions** — prevent tunnel vision:
- "What would the simplest possible solution look like?"
- "Is there a way to solve this without the dependency?"
- "What if we did nothing — what's the actual cost?"

---

### Self-Directed Questioning Protocol
Use this before committing to any architectural decision:

1. "What problem am I actually solving?" (not the presented solution — the underlying problem)
2. "What assumptions am I making that I haven't verified?"
3. "What would I have to observe to know I'm wrong?"
4. "Have I talked to anyone who disagrees? Do I understand their position well enough to steelman it?"
5. "If I had to make the opposite decision, what would be my best argument for it?"

If you cannot answer question 5, you don't understand the decision space well enough to decide.

---

## Decision Framework

- Evaluate the complexity of the task.
- Identify structural bottlenecks.
- Choose the simplest abstraction that solves the problem.

## Anti-Patterns

- Socratic questioning as a debate tactic — using questions to score points rather than find truth
- Questioning things that are already verified and decided — revisiting settled decisions creates instability
- Question without commitment — using endless questioning to avoid the discomfort of deciding
- Questioning the person, not the idea — "Why would you think that?" vs. "What's the strongest evidence for this?"

---

## Example in Action

Full Socratic interrogation of a technical rewrite decision:

**Presented plan:** "We need to rewrite the authentication system. It's too complex and buggy."

**Round 1 — Clarifying:**
- "What makes it 'too complex' — complex to read, complex to modify, or complex to reason about correctly?"
- "What bugs have appeared? How often? What was the user impact?"
- "What would a non-complex version look like?"

*Revealed:* Two bugs in the last 6 months, both in the token refresh flow. The rest works fine.

**Round 2 — Assumption:**
- "Are we assuming the complexity is in the design rather than just in that refresh flow?"
- "Have we looked at whether the entire system needs rewriting or just the refresh logic?"
- "What's the assumption about the new system not having bugs?"

*Revealed:* The bugs are isolated to ~80 lines of token refresh code. The assumption was that complexity was systemic.

**Round 3 — Evidence:**
- "What data do we have on bugs in other parts of the auth system?"
- "Have we profiled what's complex — cyclomatic complexity tool, code churn data?"
- "What's the track record of previous rewrites — did they eliminate the bugs or shift them?"

*Revealed:* No bugs outside the refresh flow. Previous rewrite of the session module 18 months ago introduced 3 new bugs.

**Round 4 — Implication:**
- "If we rewrite, how long does it take, and what breaks during that time?"
- "If we only fix the refresh flow, what's the risk that other complexity surfaces next month?"

**Conclusion from interrogation:**  
Rewrite the 80-line refresh flow, not the entire system. Write tests for the new implementation first. Spend 2 days, not 6 weeks. Re-evaluate in 90 days if new bugs emerge.

The Socratic process converted a 6-week rewrite into a 2-day targeted fix.
