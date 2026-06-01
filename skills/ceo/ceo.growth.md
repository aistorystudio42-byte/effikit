<!-- @keywords: growth equation acquisition activation retention, unit economics, choose north star metric, sustainable growth strategy, growth model from founder view, business growth system -->

# CEO — Sustainable Growth Is a System, Not a Campaign

## Core Philosophy

Campaigns produce spikes. Systems produce compounding. A campaign that drives 1,000 signups evaporates in 2 months. A growth system that increases activation rate by 15% compounds forever because every future user flows through a better activation path.

The growth equation has three variables: acquisition rate, activation rate, and retention rate. Most companies optimize acquisition obsessively while ignoring the denominator — activation and retention determine whether acquired users become business value or just analytics noise.

---

## When to Activate

- Setting the growth strategy for a new product
- Diagnosing why revenue growth has slowed despite consistent acquisition
- Evaluating whether to invest in marketing vs. product improvement
- Building a growth model for investor conversations

---

## Principles

### Growth Equation
```
Business Value = Acquired Users × Activation Rate × Retention Rate × Revenue Per User

Fixing Activation Rate from 20% → 30% = +50% business value
Fixing Retention Rate from 30% → 40% = +33% business value
Doubling Acquisition = +100% cost, +100% value (linear)

Compound the improvements:
(Acquisition × 2) × (Activation +50%) × (Retention +33%) = 4× business value
vs. just doubling acquisition = 2× business value at 2× cost
```

The math always favors activation and retention improvements over acquisition spend until they're optimized.

---

### Activation Moment
The activation moment is the first time the user experiences the core value promise. Everything before it is friction. Everything after it is retention work.

**Identifying it:**
1. Find users who stayed 90 days. What did they all do in their first session?
2. Find users who churned in week 1. What did they NOT do?
3. The delta between these groups IS the activation moment.

**Optimizing it:**
- Reduce time from signup to activation moment — every minute is churn risk
- Remove everything before the activation moment that doesn't directly lead to it
- Make the activation moment repeatable — first value should not be accidental

---

### Unit Economics
**CAC (Customer Acquisition Cost):** Total acquisition spend ÷ new customers acquired in period.

**LTV (Lifetime Value):** Average revenue per user × average customer lifetime.

**Payback period:** CAC ÷ Monthly revenue per user = months to recover acquisition cost.

**Healthy ratios:**
- LTV:CAC > 3:1 (minimum viable)
- LTV:CAC > 5:1 (efficient growth)
- Payback period < 12 months for venture-backed, < 6 months for bootstrapped

---

### North Star Metric Selection
**Requirements for a valid north star metric:**
1. It must predict retention (leading indicator, not lagging)
2. It must be measurable daily or weekly
3. Every team must be able to connect their work to it
4. It must represent actual user value, not company revenue

**Examples by model:**
- SaaS: "weekly active users who completed ≥3 core actions"
- Marketplace: "successful transactions per week"
- Open source: "repos with ≥3 commits using the toolkit in past 30 days"
- Content: "users returning within 7 days of their first session"

---

## Decision Framework

- Evaluate the complexity of the task.
- Identify structural bottlenecks.
- Choose the simplest abstraction that solves the problem.

## Anti-Patterns

- North star metric that's a vanity metric (raw signups, total users)
- Measuring revenue as the north star — it's the output, not the input
- Building growth infrastructure before activation is solved
- Optimizing the funnel at the top (acquisition) while the bottom (retention) leaks
- Growth team separate from product team — growth is a product problem, not a marketing problem
- Confusing activity (users logging in) with engagement (users doing the valuable action)

---

## Example in Action

Complete growth model for open-source developer tool:

**Product:** Effikit

**North Star Metric:**  
"GitHub stars from developers who have starred ≥ 3 files in the repo and returned within 14 days"  
Why: This filters passive discovery from genuine engagement. A developer who returns, explores, and uses multiple files is activated. This predicts long-term community contribution.

**Growth Equation (Year 1 targets):**

```
Acquired (repo visitors): 10,000/month
× Activation rate (star + explore + use): 15%
= Activated users: 1,500/month

× Retention rate (active again in 30 days): 35%
= Retained active users: 525/month

× Referral coefficient (active users who mention Effikit): 0.3 users referred/user
= Organic acquisition from retained users: 157/month additional
```

**Activation funnel for Effikit:**

```
Discover repo → Read README (10 min) → Clone or download
→ Set up CLAUDE.md reference (15 min) → First improved AI output (30 min)
                    ↑
              ACTIVATION MOMENT
```

Target: activation moment within 45 minutes of first visit. Current bottleneck: setup time.

**Activation improvements:**
- One-line CLAUDE.md setup command (reduces setup from 15 min to 2 min)
- Showcase videos showing the before/after output quality (reduces motivation friction)
- Quick-start guide for the 3 most common use cases

**Retention mechanism:**  
Newsletter with 1 new file added per week. Developers who see new content return. Returns increase the probability of contribution, which increases quality, which increases new user acquisition.

**Unit economics (open source):**
- CAC: $0 (organic) → Target: 80% organic, 20% sponsored content
- Contribution value: $0 cash, high community value
- Revenue model: Effikit Pro (optional hosted version) at $12/month after community reaches 5,000 active users

**12-month growth model:**
```
Month 1:  500 visitors, 75 activated
Month 3:  2,000 visitors, 300 activated, K-factor = 0.15
Month 6:  5,000 visitors, 750 activated, compounding organic
Month 12: 15,000 visitors, 2,250 activated, 8,500 total community
```
