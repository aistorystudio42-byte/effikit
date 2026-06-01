<!-- @keywords: creativity, constraints, creative problem solving, lateral thinking, reframing, simplicity -->

# Creativity — Constraints as Creative Fuel

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to constraints.

## Principles

### Constraints Enable Creativity
Counterintuitively, constraints don't limit creativity — they focus it. An unlimited canvas produces paralysis. A 280-character limit produced Twitter. A 3-day deadline produces sharper decisions than 3 months.

The key is distinguishing between **real constraints** (can't change) and **assumed constraints** (habits disguised as requirements).

---

### Identifying Assumed Constraints
```
Before accepting a constraint, ask: "Why?"
  "We need to use PostgreSQL" → Why? "Because we always have" → Assumed constraint
  "We need to use PostgreSQL" → Why? "Because our team knows it deeply and we have 5 years of migrations" → Real constraint

Assumed constraints to challenge:
  "This must be built as a full-page feature"
    → Why not a modal? An inline edit? A CLI command?

  "We need to build this from scratch"
    → Why not use an existing library? Buy vs build?

  "Users need to create an account first"
    → Why not a guest checkout? Progressive registration?

  "This needs a database"
    → Could it be localStorage? A file? A third-party service?

  "We need to handle all edge cases"
    → Which edge cases actually occur? What's the 80/20?
```

---

### The Extreme Constraint Challenge
Push a constraint to its extreme — it reveals hidden assumptions.

```
"What if we had to ship this in 1 day?"
  Removes every nice-to-have immediately
  Forces focus on the single most essential feature
  Often reveals: the core user need is much simpler than assumed

"What if we had to build this with zero code?"
  → Zapier/Make automation
  → Airtable/Notion as backend
  → No-code tools (Webflow, Bubble)
  Reveals: is code actually necessary, or habit?

"What if this had to work for 1,000,000 users on day one?"
  Forces pre-thinking about statelessness, caching, async
  Reveals architectural decisions that are hard to change later

"What if the user had no training and no documentation?"
  Forces radical simplicity
  Reveals: what assumptions are baked into the UI?

"What if we could never touch this code again after shipping?"
  Forces: complete tests, zero magic, self-documenting code
  Reveals: what corners are being cut?
```

---

### Analogical Thinking
Solve the problem in a different domain, then translate the solution back.

```
Problem: How do we handle conflicting concurrent edits to a document?

Analogy: How do air traffic controllers handle two planes wanting the same runway?
  → One lands first, the other circles and waits (locking)
  → They're assigned different runways (partitioning)
  → They're coordinated by ground control (central authority)
  → Modern: GPS, automatic separation (distributed coordination)

Translated back to software:
  → Pessimistic locking: lock the document on open
  → Operational transformation (Google Docs approach)
  → CRDT: data structures that merge automatically
  → Event sourcing: all edits as events, merge order defined by timestamp

The aviation analogy revealed solutions that might not have been obvious
from thinking about the software problem directly.
```

---

### Time-Boxing as Creative Constraint
```
Pomodoro for decisions:
  "We'll decide on the database in the next 25 minutes"
  Forces: identify the minimum information needed to decide
  Prevents: analysis paralysis disguised as thoroughness

Time-boxed prototyping:
  "We'll build a throwaway prototype in 4 hours"
  → If something takes more than 4 hours, it's too complex for a prototype
  → Real learnings come from building, not planning

Time-boxed code review:
  "15 minutes per PR"
  → Forces: focus on what actually matters (correctness, security)
  → Eliminates: style debates, preference battles
```

---

Pick one design constraint and optimize everything for it.

```
"This must be usable by a first-time user in under 2 minutes"
  → Every screen evaluated by: "Does this help or hinder the 2-minute goal?"
  → Features that don't serve this get deferred or cut

"This must work with 0 JavaScript"
  → Progressive enhancement baseline
  → Forces: semantic HTML, server-side rendering, form submissions
  → Result: fast, accessible, resilient UI

"This must be operable by a single engineer on-call"
  → Forces: extreme simplicity in operations
  → Eliminates: complex microservices, manual steps in runbook
  → Result: boring, reliable infrastructure

"This must fit in a single file"
  → Forces: ruthless prioritization
  → Often reveals: the real feature is much smaller than planned
```

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

Remove an element that seems essential. What new solution does this force?

```
Remove: the backend
  → Single-page app with local storage
  → Static site with serverless functions
  → Edge computing (Cloudflare Workers)
  → What if the client IS the server? (local-first apps)

Remove: the database
  → Read from files (great for read-heavy, rarely-written config)
  → Git as database (version-controlled content, like CMS)
  → Browser IndexedDB (offline-first)
  → Event sourcing (derive state from event log)

Remove: authentication
  → Read-only public API
  → Magic link (no password, just email)
  → OAuth only (delegate auth entirely)
  → API keys (simple, no UI needed)

Remove: the UI
  → CLI tool
  → API-only product
  → Slack/Discord bot
  → Automated background process
```

---

- [ ] Real constraints identified and distinguished from assumed ones
- [ ] At least one assumed constraint challenged with "Why?"
- [ ] Subtraction exercise done (what can we remove and still solve the problem?)
- [ ] Extreme constraint applied (1-day shipping, no code, 1M users)
- [ ] Analogy from different domain explored
- [ ] Single design constraint identified for this feature/project
