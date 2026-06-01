<!-- @keywords: strategy, Porter's five forces, strategic narrative, moat, competitive advantage, software strategy, what to say no to, developer tool strategy, long-term thinking, strategic planning -->

# CEO — Strategy Is What You Say NO to

## Core Philosophy

Strategy is not a vision statement. It is a set of explicit decisions about what you will not do. Every company that tries to do everything does nothing exceptionally well. The power of strategy is in its exclusions — the markets you don't enter, the customers you don't serve, the features you don't build.

The test of a real strategy: would a rational competitor disagree with your choices? If not, you don't have a strategy — you have tactics that every rational actor would pursue.

---

## When to Activate

- Evaluating which features to build vs. cut
- Responding to a competitor's move
- Deciding which customer segment to prioritize
- Writing the company's strategic narrative for investors or team

---

## Principles

### Porter's 5 Forces for Software
**1. Threat of new entrants:** How easy is it to build what we built? (Low barrier = commoditization pressure)

**2. Supplier power:** How dependent are we on specific technologies or APIs? (OpenAI as a supplier with pricing power is a real risk)

**3. Buyer power:** Can our customers easily switch to a competitor? (Low switching cost = pricing power destroyed)

**4. Substitute threat:** What do customers use if our product doesn't exist? (For developer tools: "I just write it myself")

**5. Competitive rivalry:** How intense is direct competition? (Winner-take-all vs. fragmented market)

---

### Moat Identification
A moat is what makes your position hard to replicate. In software:

- **Data moat:** The data you accumulate makes the product better in ways competitors can't replicate without the data
- **Network effect:** Each user makes the product more valuable for others
- **Switching cost:** Users who've integrated deeply find switching expensive (migrations, retraining, data loss)
- **Ecosystem:** Plugins, integrations, and ecosystem partners create stickiness
- **Brand:** Trust built over time that cannot be quickly bought

**Moats that don't work:** "Better product" (copyable), "faster" (copyable), "cheaper" (race to zero).

---

## Decision Framework

**1. Corporate strategy:** Which markets do we compete in? (This is where you say NO to entire categories)

**2. Competitive strategy:** How do we win within our chosen market? (Porter's three: cost leadership, differentiation, focus)

**3. Operational strategy:** How do we execute better? (This is where most companies spend all their time and call it "strategy")

Most strategy conversations in early-stage companies are actually operational — they debate execution without having decided on competitive positioning. Fix the higher level first.

---

```
Is this opportunity consistent with our competitive strategy?
├── YES → does it strengthen our moat?
│   ├── YES → high priority
│   └── NO  → deprioritize unless it blocks competition
└── NO  → say no, even if it seems profitable short-term

Is this decision reversible in 12 months?
├── YES → decide quickly, learn, adjust
└── NO  → this is a level 2 decision, apply Porter's analysis fully

Does saying yes to this prevent us from doing X better?
└── If X is core, say no to this.
```

---

## Anti-Patterns

- "Strategic" decisions made without competitive analysis
- Strategy that doesn't differentiate from what any rational actor would do
- Calling roadmap prioritization "strategy"
- Moats that depend on "being first" — sustainable moats have structural advantages
- Pivoting strategy in response to every competitor move

---

## Example in Action

Complete strategic narrative for developer productivity tool:

**Company:** Effikit  
**Category:** Developer Context Systems  
**Competitive strategy:** Differentiation + Focus (not cost leadership, not broad market)

---

**Porter's Analysis:**

- **New entrants:** High threat. Any developer can fork a CLAUDE.md repo. The moat is not the files — it is the curation, the community, and the integrated system design.
- **Supplier power:** Medium. Depends on Claude/AI APIs. Mitigated by format being model-agnostic (works with any AI that reads files).
- **Buyer power:** Low switching cost today. Must build switching cost through deep project integration (CLAUDE.md files become project infrastructure, not just tools).
- **Substitutes:** Developers write their own prompts. Substitute is "do it yourself." Win: better quality + faster than DIY for any developer who isn't a prompt engineer.
- **Rivalry:** Low today. Growing. Window of 12-18 months before well-funded competitors appear.

**Strategic choices (what we say NO to):**

- ❌ No SaaS model — open source is the moat strategy (distribution + trust)
- ❌ No generalist use cases — focus exclusively on software development
- ❌ No IDE plugin or CLI — file-based approach works with every tool
- ❌ No prompt templates — positioning is above prompts, at the knowledge layer

**Strategic choices (what we say YES to):**

- ✅ Open source — maximizes distribution, builds trust, creates community moat
- ✅ TypeScript-first — highest leverage for the developer segment that buys tools
- ✅ Depth over breadth — 4 excellent files per folder beats 20 mediocre ones
- ✅ Standard format — any contributor can follow the same pattern

**Narrative:**
> "The developer AI market is splitting into two tiers: tools that generate code and the knowledge layer that makes generated code production-quality. We are building the knowledge layer. Every AI tool reads context files. We provide the best context files in existence. This is infrastructure — it doesn't compete with Cursor or Copilot, it makes them better. Our moat: the community of developers who contribute, validate, and improve the system."
