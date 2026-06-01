<!-- @keywords: design a growth loop, viral coefficient math, product-led growth tactics, D1 D7 D30 retention, activation rate optimization, referral loop mechanics -->

# Marketing — Growth Loops, Not Growth Hacks

## Core Philosophy

Growth hacks are one-time tactics that produce a spike followed by a return to baseline. Growth loops are systems where every new user makes it easier to acquire the next one. One is a campaign. The other is compounding infrastructure.

The sequence is fixed: retention first, then activation, then acquisition. Pouring acquisition spend on a product with 20% week-1 retention is filling a leaky bucket — the math never works.

---

**1. Retention is the foundation. Always.** If users don't stay, no acquisition strategy survives. Measure D1, D7, D30 retention before spending a dollar on acquisition. If D7 retention is below 20%, fix the product before marketing it.

**2. Viral coefficient math.** K-factor = invites per user × conversion rate. K > 1 means organic growth. K = 0.5 means you need 2 existing users to net 1 new user — growth requires external input. Design for K > 0.4 minimum; build toward K > 1.

**3. PLG activation moment is the single most important UX investment.** The activation moment is when the user first experiences the core value of the product. Everything before it is overhead. Measure time-to-activation and treat every second as a conversion killer.

**4. North star metric must be a leading indicator of retention.** Revenue is a lagging indicator. "Files processed per week" or "GitHub repos connected" are leading. Choose one metric that, when it goes up, retention follows within 30 days.

**5. Growth loops have three components: trigger → action → reward → re-trigger.** Map the loop before building it. If you can't draw the complete cycle, you don't have a loop — you have a campaign.

---

## When to Activate

- Defining the growth model for a new product
- North star metric selection
- Diagnosing why acquisition isn't converting to retained users
- Designing viral or referral mechanics
- Deciding between PLG and sales-led growth

---

## Principles

## Decision Framework

```
What is the current D7 retention?
├── < 20% → stop all acquisition, fix activation and onboarding first
├── 20-40% → acceptable, optimize activation moment while building loops
└── > 40% → strong foundation, now scale acquisition with loops

What is the viral coefficient?
├── K > 1 → product grows without external input, protect the loop
├── 0.4-1 → good, incremental acquisition needed to sustain
└── K < 0.4 → loop is weak or broken, audit sharing friction

Which growth motion fits the product?
├── PLG → value experienced before paywall/signup, works for dev tools
├── Sales-led → long contract, enterprise buyer, works for B2B SaaS
└── Community-led → content/network is the product, works for OSS

What is the north star metric?
├── Pick one metric that predicts retention
├── Make it measurable daily
└── Every team's roadmap must be able to justify impact on this metric
```

---

## Anti-Patterns

- "We'll go viral" without designing the specific mechanic
- Using acquisition as a substitute for retention — the math always fails
- Multiple north star metrics — you get confusion, not clarity
- Referral programs without first ensuring activated users exist to refer
- Measuring signups instead of activations — signups are vanity metrics
- Building growth loops after launch — design them into the product from day one
- Optimizing viral coefficient before the product is worth sharing

---

## Example in Action

Complete growth loop for open-source developer toolkit:

**Product:** Effikit (open-source AI context system for developers)

**North Star Metric:** "GitHub stars from developers who have starred ≥ 3 files in the repo" — proxy for genuine engagement, not passive discovery.

**Growth Loop Design:**

```
[TRIGGER]
Developer asks AI assistant for help → AI gives generic answer
                    ↓
[ACTION]
Developer discovers Effikit → AI now gives precise, expert answers
Uses Effikit in production for 2 weeks
                    ↓
[REWARD - INTERNAL]
Developer saves 2+ hours/week on boilerplate and context-setting
                    ↓
[REWARD - EXTERNAL]
Developer mentions Effikit in team Slack / Twitter / blog post
"How do you get Claude to write such good code?" → "I use Effikit"
                    ↓
[RE-TRIGGER]
3 new developers discover Effikit through word-of-mouth
                    ↓
[Loop restarts]
```

**Activation moment:** First time the developer copies a utility from `craft/` into a production file and it works without modification. Time-to-activation target: under 10 minutes from first visit.

**Viral mechanics built into the product:**
- `CLAUDE.md` setup references Effikit — every project that uses it is a word-of-mouth signal
- `navigation.md` is designed to be shared — developers send it to teammates
- Skill files are shareable prompts — "Here's the prompt I use for code review"

**K-factor estimate:**
- 1 active user mentions Effikit to ~2 developers over 90 days
- 40% of those visit the repo
- 60% of visitors star and explore
- 25% become active users
- K = 2 × 0.40 × 0.60 × 0.25 = 0.12 per referral cycle

**Improvement levers:**
- Make sharing frictionless: one-line `CLAUDE.md` setup that's obvious to copy
- Create GitHub topics and awesome-list submissions for discoverability
- Build a showcase of what users built with Effikit — social proof + inspiration
