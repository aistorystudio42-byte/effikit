<!-- @keywords: decision making, tech stack, build vs buy, tradeoff analysis, options comparison, choose technology -->
<!-- @domain: Technical Decision Making Prompts -->

# Technical Decision Making Prompts

## Technology Selection

```
Help me choose between these options for: [decision]

**Context:**
- Team: [N engineers, skill set: ...]
- Timeline: [N months to launch]
- Scale: [expected users / RPS / data volume]
- Longevity: [prototype / product that must last 5+ years]
- Budget: [open source only / can pay / enterprise budget]

**Options:**

**Option A: [name]**
What it is: [brief description]
Pros: [list]
Cons: [list]
Known unknowns: [what we'd need to discover about it]

**Option B: [name]**
What it is: [brief description]
Pros: [list]
Cons: [list]
Known unknowns: [what we'd need to discover]

**Option C: [name] (if applicable)**
...

**Evaluation criteria (weighted):**
| Criterion | Weight | A | B | C |
|-----------|--------|---|---|---|
| Developer experience | 25% | | | |
| Performance at scale | 20% | | | |
| Ecosystem/community | 15% | | | |
| Learning curve | 15% | | | |
| Operational complexity | 15% | | | |
| Cost | 10% | | | |

**Recommendation:** [A or B or C]
**Primary reason:** [one sentence — the decisive factor]
**What would change this recommendation:** [if X is true, choose Y instead]
```

---

## Build vs Buy Analysis

```
Should we build or buy: [capability]

**Capability needed:**
[describe what we need — authentication / payment processing / search / analytics / etc.]

**Build option:**
- Estimated build time: [N weeks for MVP / N months for production-ready]
- Engineering cost: [N engineer-weeks at $Y/week = $Z]
- Ongoing maintenance: [N hours/month]
- What we'd control: [list]
- What we'd have to build from scratch: [list]

**Buy/Use existing option:**
- Solution: [vendor name / open source project]
- Cost: [free / $X/month / usage-based pricing model]
- Integration time: [N days]
- Limitations vs building: [list what we can't customize]
- Vendor risk: [lock-in / pricing changes / going out of business]

**Framework for the decision:**
1. Is this our core competitive advantage? → Build
2. Is this a solved, commodity problem? → Buy
3. Do we have the expertise to build it well? → If no, buy
4. Will maintenance cost exceed buy cost within 2 years? → Buy

**Recommendation:**
[Build / Buy / Build a thin wrapper around a buy]
Because: [reason]
Revisit if: [condition that would change the answer]
```

---

## Tradeoff Analysis

```
Analyze the tradeoffs of this technical decision.

**Decision:** [describe the choice — e.g., "use optimistic updates vs refetch after mutation"]

**Option A — [name]:**
**How it works:** [brief description]
**Gains:**
- [gain 1]: [by how much? concrete if possible]
- [gain 2]
**Costs:**
- [cost 1]: [how much complexity / risk / effort does this add?]
- [cost 2]
**When it breaks:** [scenario where this option fails badly]

**Option B — [name]:**
**How it works:** [brief description]
**Gains:**
- [gain 1]
**Costs:**
- [cost 1]
**When it breaks:** [scenario where this option fails]

**The core tension:**
[Option A] optimizes for [X] at the cost of [Y].
[Option B] optimizes for [Y] at the cost of [X].

**Which matters more for our context?**
[explain your context — user expectations, team capability, scale requirements]

**Recommendation:** [A or B], but only if [condition].
**Revisit when:** [trigger to reconsider — certain scale, team growth, etc.]
```

---

## Premature Optimization Check

```
Is this optimization worth doing now?

**Proposed optimization:**
[describe what you want to optimize]

**Current situation:**
- Is there measured evidence this is slow? [yes/no — paste data if yes]
- Benchmark: [current: X ms/rps/mb → target: Y ms/rps/mb]
- How many users are actually hitting this path? [N users / N times/day]

**Donald Knuth test:**
"Premature optimization is the root of all evil."

Answer these before proceeding:
1. Is there a profiler trace showing this is the bottleneck? [yes/no]
2. Is the problem user-visible? (>100ms latency, visible janks) [yes/no]
3. Will the complexity added be justified by the improvement? [yes/no]
4. Will this path exist long enough to justify the investment? [yes/no]

**Verdict:**
If any answer is "no": defer the optimization. Document why in a TODO comment.
If all are "yes": proceed with a benchmark baseline and target metric.

**If proceeding:**
- Baseline measurement: [how to measure before]
- Implementation plan: [specific change]
- Success measurement: [how to verify improvement]
- Rollback plan: [how to undo if it doesn't help or causes regressions]
```

---

## Scope Creep Defense

```
Help me push back on this scope change.

**Original scope:**
[what was agreed / what's in the ticket / what was spec'd]

**Requested addition:**
[what's being asked to add or change now]

**Analysis:**

**Is this actually new scope?**
Read the original spec carefully:
- Explicitly excluded: [does the spec say "not in scope"?]
- Ambiguous: [could be interpreted either way]
- Implied: [could reasonably be expected given the original intent]

**Cost of adding it now:**
- Implementation: [N additional days]
- Testing: [N additional days]
- Delay to existing commitments: [what gets pushed]
- Complexity added to the codebase: [high/medium/low]

**Risk of adding it now:**
- Does it require rethinking the architecture?
- Does it add dependencies that aren't ready?
- Does it reduce quality of the original scope?

**Response options:**
1. Include it: [only if: trivial + no timeline impact + same scope boundary]
2. New ticket for next sprint: [for: valid need but not urgent]
3. Reject: [for: out of scope, premature, or undermines the original goal]

**Draft response:**
"[acknowledge the need] + [state the cost/impact] + [propose path forward (option 1/2/3)]"
```
