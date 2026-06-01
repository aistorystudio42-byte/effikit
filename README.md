# Effikit

> A personal developer toolkit built for AI-assisted development. Instead of asking your AI to generate code from scratch every time, Effikit gives it a library of proven TypeScript implementations, advanced algorithms, expert behavior directives, and ready-to-use prompt templates to read from, adapt, and apply.

```
effikit/
├── craft/        TypeScript libraries       8 domains · 24 files
├── mind/         Algorithm library         12 domains · 36 files
├── skills/       AI behavior directives    26 domains · 104 files
├── bridge/       MCP & service guides       9 services · 27 files
├── prompt/       Prompt templates          10 domains · 50 files
│
├── mcp/          MCP server (discovery engine)
├── cli/          Terminal interface
├── navigation.md AI's internal map
├── keywords.md   Keyword → file index
└── sync.ts       Auto-regenerates keywords.md
```

---

## Table of Contents

- [Why Effikit](#why-effikit)
- [How It Works](#how-it-works)
- [What's Inside](#whats-inside)
  - [craft/ — TypeScript Libraries](#craft--typescript-libraries)
  - [mind/ — Algorithm Library](#mind--algorithm-library)
  - [skills/ — AI Behavior Directives](#skills--ai-behavior-directives)
  - [bridge/ — MCP & Service Guides](#bridge--mcp--service-guides)
  - [prompt/ — Prompt Templates](#prompt--prompt-templates)
- [Installation](#installation)
  - [MCP Setup (Claude Code — recommended)](#mcp-setup-claude-code--recommended)
  - [CLI Setup](#cli-setup)
  - [Other AI Tools](#other-ai-tools)
- [MCP Tools Reference](#mcp-tools-reference)
- [CLI Reference](#cli-reference)
- [The Workflow](#the-workflow)
- [File Tag Standard](#file-tag-standard)
- [Adding New Files](#adding-new-files)
- [Contributing](#contributing)

---

## Why Effikit

When you ask an AI assistant to write code, it starts from zero every time. The debounce hook it writes today and the one it writes next week won't share the same edge case handling. The JWT implementation in Project A and the one in Project B will have subtle differences in refresh logic. You end up reviewing the same code repeatedly, catching the same gaps, building no compounding foundation.

Effikit is the foundation. It is a curated library that your AI reads from before it writes anything. The floor is always a real, type-safe, edge-case-aware implementation — not a first attempt.

**What Effikit is:**
- A repository your AI reads, not a package it installs
- A source of proven implementations your AI adapts to your project's exact types and constraints
- A set of behavior directives that tell your AI how to think, not just what to write

**What Effikit is not:**
- Not an npm package — there is no `npm install effikit`
- Not a framework — no runtime dependency, no build step, no lock-in
- Not a snippet dump — every file is complete, typed, and handles failure cases

---

## How It Works

Effikit connects to your AI through its MCP server. When you describe a task, the server searches the library and returns the most relevant files — scored by how well they match — before your AI writes a single line.

```
You: "I need infinite scroll for my product feed."

effikit_navigate("infinite scroll product feed")
  → craft/hooks/hooks.lifecycle.ts    (useIntersection — 94%)
  → mind/discovery/discovery.feed.ts  (feed pagination — 81%)

AI reads both files, adapts them to your Product type and API,
writes the result into src/hooks/useProductFeed.ts in your project.
```

Without Effikit, your AI invents IntersectionObserver cleanup from memory. With Effikit, it starts from an SSR-safe implementation that already handles disconnection, threshold configuration, and root margin — and adapts it to your exact interface.

The search is not keyword matching. The MCP server uses a multi-signal scoring engine: exact keyword hits, TR↔EN bridging, fuzzy matching (Levenshtein-based), IDF weighting, and body token overlap. A query for "recomendation engin" still finds `mind/recommendation/recommendation.engine.ts`.

---

## What's Inside

### craft/ — TypeScript Libraries

Ready-to-use TypeScript implementations for common frontend and backend concerns. Every file: zero `any`, all exports public, SSR-safe where relevant, comments explain *why* not *what*.

| Domain | Files | What you get |
|--------|-------|-------------|
| `craft/ui/` | ui.components.ts · ui.layout.ts · ui.tokens.ts | Card, modal, input, dropdown components; grid and responsive layout system; color, typography, and spacing tokens |
| `craft/ux/` | ux.interaction.ts · ux.feedback.ts · ux.accessibility.ts | Gesture, drag-drop, and touch systems; loading, skeleton, error, and success state management; ARIA, keyboard navigation, and screen reader support |
| `craft/hooks/` | hooks.state.ts · hooks.async.ts · hooks.lifecycle.ts | Advanced state patterns (state machines, undo/redo, shared atoms); fetch, loading, error, and retry hooks; mount, unmount, resize, and IntersectionObserver hooks |
| `craft/api/` | api.request.ts · api.error.ts · api.cache.ts | Request management with headers, timeout, and interceptors; error classification and recovery; stale-while-revalidate caching |
| `craft/db/` | db.query.ts · db.schema.ts · db.migration.ts | Type-safe query builders; schema and model definitions; migration versioning and rollback |
| `craft/auth/` | auth.session.ts · auth.token.ts · auth.permission.ts | Session management with refresh and expiry; JWT operations, signing, and verification; role-based access control and policy engine |
| `craft/animation/` | animation.transition.ts · animation.micro.ts · animation.scroll.ts | Page and component transition system; hover, click, and focus micro-interactions; scroll-driven animation and parallax |
| `craft/media/` | media.audio.ts · (and more) | Audio playback, waveform processing, and media pipeline utilities |

**Example — `craft/hooks/hooks.state.ts`:**

```typescript
// @keywords    useState, useReducer, state machine, context, global state, atom, undo
// @use-when    You need advanced state patterns: state machines, undo/redo, derived state
// @not-when    Simple boolean toggles or single-field forms — plain useState handles those

export function useToggle(initial = false): [boolean, () => void, Dispatch<boolean>]
export function useCounter(initial: number, opts: CounterOptions): CounterControls
export function useStateMachine<S, E>(config: MachineConfig<S, E>): MachineState<S, E>
export function useUndoRedo<T>(initial: T): UndoRedoState<T>
// ... and more
```

---

### mind/ — Algorithm Library

Advanced algorithms written in TypeScript for real-world systems. These are not textbook exercises — they are implementations ready to be dropped into production search engines, recommendation systems, and data pipelines.

| Domain | Files | What you get |
|--------|-------|-------------|
| `mind/recommendation/` | engine.ts · scoring.ts · filter.ts | Collaborative filtering and content-based recommendation; weighted multi-criteria scoring; rule engine and diversity balancing |
| `mind/discovery/` | feed.ts · ranking.ts · diversity.ts | Feed management with ordering and pagination; multi-factor ranking; deduplication and content diversity |
| `mind/search/` | query.ts · fuzzy.ts · index.ts | Query parsing, tokenization, and normalization; Levenshtein, Jaro-Winkler, and n-gram matching; inverted index construction and fast lookup |
| `mind/ranking/` | score.ts · decay.ts · boost.ts | ELO, TrueSkill, and Bayesian average scoring; time-based score decay; priority boost rules |
| `mind/personalization/` | profile.ts · behavior.ts · adapt.ts | User profile building and updates; behavioral pattern tracking; dynamic content adaptation |
| `mind/decision/` | tree.ts · weight.ts · fallback.ts | Decision tree traversal; weighted multi-criteria decision making; fallback path management |
| `mind/optimization/` | algorithm.ts · cache.ts · benchmark.ts | Genetic algorithm, simulated annealing, gradient descent; memoization strategies; performance benchmarking |
| `mind/graph/` | relation.ts · traverse.ts · cluster.ts | Directed/undirected graph structures; BFS, DFS, Dijkstra path finding; community detection and clustering |
| `mind/caching/` | strategy.ts · invalidation.ts · layer.ts | LRU, LFU, and TTL caching; dependency-based invalidation; multi-layer cache architecture |
| `mind/security/` | encrypt.ts · validate.ts · audit.ts | AES and RSA encryption; input validation and sanitization; audit logging and anomaly detection |
| `mind/realtime/` | sync.ts · queue.ts · conflict.ts | WebSocket-based synchronization; priority queue with retry; conflict detection and merge strategies |
| `mind/ai/` | prompt.ts · context.ts · pipeline.ts | Prompt engineering and chain management; context window management and summarization; parallel AI workflow orchestration |

**Example — `mind/search/search.fuzzy.ts`:**

```typescript
// @keywords    fuzzy search, Levenshtein, Jaro-Winkler, edit distance, typo tolerance
// @use-when    Searching with typo tolerance, autocorrect, or approximate string matching
// @not-when    Exact string matching — plain includes() or indexOf() is faster

export function levenshtein(a: string, b: string): number
export function jaroWinkler(a: string, b: string, p?: number): number
export function fuzzySearch<T>(query: string, items: T[], opts: FuzzyOptions): FuzzyMatch<T>[]
export function buildNgramIndex(corpus: string[]): NgramIndex
```

---

### skills/ — AI Behavior Directives

Markdown files that tell your AI *how to think* in a specific domain before it writes any code. When you activate a skill, your AI adopts the reasoning patterns, priorities, and tradeoffs of an expert in that field.

26 domains, 104 files:

```
skills/
├── frontend/        React components, styling, state, performance
├── backend/         Architecture, business logic, scalability patterns
├── api/             Endpoint design, validation, versioning, docs
├── database/        Modeling, queries, migrations, optimization
├── debugging/       Diagnostic strategies, log analysis, reproduction
├── security/        Auth, input security, vulnerability scanning, audits
├── testing/         Unit, integration, e2e, coverage strategies
├── refactoring/     Restructuring, pattern application, naming
├── design/          Design systems, typography, color, responsive
├── ai/              Prompt writing, context management, evaluation
├── devops/          CI/CD, Docker, monitoring, deployment
├── code-review/     Review checklists, feedback standards, security
├── documentation/   Code comments, README, API docs, changelogs
├── architecture/    Patterns, decision frameworks, diagrams
├── performance/     Frontend, backend, database optimization
├── accessibility/   Semantic HTML, ARIA, keyboard, a11y testing
├── creativity/      Edison, Disney, Shakespeare, Dali personas
├── art/             Da Vinci, Beethoven, Picasso, Michelangelo personas
├── science/         Einstein, Newton, Feynman, Tesla personas
├── performance-boost/ Speed, focus, quality, workflow optimization
├── ceo/             Strategic thinking and product decision-making
├── marketing/       Copywriting, positioning, growth frameworks
├── media/           Audio/video processing guidance
├── reasoning/       Structured thinking and problem decomposition
├── typescript-expert/ TypeScript-first patterns and type-level tricks
└── code-critic/     Adversarial review and quality enforcement
```

**How to activate a skill via MCP:**

```
effikit_skill("security")     → loads skills/security/*.md
effikit_skill("feynman")      → loads skills/science/science.feynman.md
effikit_skill("refactoring")  → loads skills/refactoring/*.md
```

---

### bridge/ — MCP & Service Guides

Integration guides for external services and MCP servers. Each folder contains setup instructions, real usage examples, and best practices for using that service effectively from an AI client.

| Service | Files | What's covered |
|---------|-------|---------------|
| `bridge/github/` | setup · workflows · bestpractices | Repo management, branch strategy, PR automation, issue workflows |
| `bridge/vercel/` | setup · workflows · bestpractices | Deployment, environment variables, domain management, preview URLs |
| `bridge/supabase/` | setup · workflows · bestpractices | Database, auth, storage, and realtime subscription patterns |
| `bridge/figma/` | setup · workflows · bestpractices | Design file reading, token extraction, component handoff |
| `bridge/threjs/` | setup · workflows · bestpractices | 3D scene setup, physics simulation, WebGL integration |
| `bridge/framermotion/` | setup · workflows · bestpractices | Animation, gesture handling, page transitions |
| `bridge/wolframalpha/` | setup · workflows · bestpractices | Math, physics, scientific queries and computation |
| `bridge/shadcn/` | setup · workflows · bestpractices | Component installation, customization, theme management |
| `bridge/gsap/` | setup · workflows · bestpractices | Timeline, ScrollTrigger, advanced animation sequences |

---

### prompt/ — Prompt Templates

Tested, reusable prompt templates for recurring tasks. Each file contains multiple ready-to-use prompts with context slots you fill in for your specific situation.

| Domain | Files |
|--------|-------|
| `prompt/code/` | generate · refactor · typescript · patterns · testing |
| `prompt/debug/` | diagnose · logs · reproduce · memory · network |
| `prompt/review/` | code · architecture · database · ux · security |
| `prompt/architecture/` | design · diagram · patterns · scalability · migration |
| `prompt/planning/` | project · breakdown · decisions · release · communication |
| `prompt/database/` | design · query · migration · optimization · search |
| `prompt/security/` | auth · audit · encryption · pentest · monitoring |
| `prompt/performance/` | frontend · backend · analysis · database · monitoring |
| `prompt/design/` | system · ux · animation · copywriting · component |
| `prompt/ai/` | prompting · integration · agents · context · optimization |

---

## Installation

Effikit is not installed into your app. It lives alongside your project and your AI reads from it.

### MCP Setup (Claude Code — recommended)

The MCP server gives your AI a real-time discovery engine with 8 tools. Instead of reading static markdown files, your AI calls tools that search, score, and return the most relevant Effikit files for any task.

**Step 1 — Clone Effikit into your project:**

```bash
git clone https://github.com/aistorystudio42-byte/effikit.git .effikit
```

**Step 2 — Install MCP server dependencies:**

```bash
cd .effikit/mcp && npm install
```

**Step 3 — Register the MCP server.**

Create or update `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "effikit": {
      "command": "npx",
      "args": ["tsx", ".effikit/mcp/server.ts"]
    }
  }
}
```

Or add to your global `~/.claude/mcp.json` to use Effikit across all projects:

```json
{
  "mcpServers": {
    "effikit": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/.effikit/mcp/server.ts"]
    }
  }
}
```

**Step 4 — Tell Claude to use it.**

Add to your global `~/.claude/CLAUDE.md`:

```markdown
## Effikit — Primary Toolkit

Before any coding task, call effikit_navigate with a short description of what you want to build.
For full-feature work, call effikit_blueprint instead.
After getting results, use effikit_read to load the file content, then adapt it into the project.
Never modify files inside .effikit — read from them, adapt, write into your project.
```

That's it. From now on, every task starts with an Effikit lookup before your AI writes anything.

**Verify the connection:**

Start a new conversation and ask: *"Using Effikit, build me a debounce hook."*

You should see Claude call `effikit_navigate("debounce hook")`, get back `craft/hooks/hooks.lifecycle.ts`, read it with `effikit_read`, and adapt the real implementation to your project — not generate one from scratch.

---

### CLI Setup

The CLI gives you terminal access to Effikit without an AI client. It uses the same scoring engine as the MCP server.

**Install dev dependencies from the Effikit root:**

```bash
cd .effikit && npm install
```

**Commands:**

```bash
# Find the best match and copy it into your current working directory
npx tsx .effikit/cli/index.ts add "infinite scroll"
npx tsx .effikit/cli/index.ts add "jwt token refresh"
npx tsx .effikit/cli/index.ts add "fuzzy search"

# Search without copying — see scored candidates first
npx tsx .effikit/cli/index.ts search "recommendation engine"
npx tsx .effikit/cli/index.ts search "websocket sync"

# Browse the full catalogue organized by section
npx tsx .effikit/cli/index.ts list
```

**Example output of `add`:**

```
effikit add — "fuzzy search"

Best match:
  mind/search/search.fuzzy.ts
  Search Fuzzy — approximate string matching with multiple algorithms
  Relevance: ████████████████░░░░ 89%
  Use when: Searching with typo tolerance, autocorrect, or approximate string matching
  Not when: Exact string matching — plain includes() or indexOf() is faster

Other candidates:
  2. mind/search/search.index.ts   71%
  3. mind/search/search.query.ts   58%

✓ search.fuzzy.ts copied to current directory.

Tip: Adapt this file to your project. Never modify the Effikit original.
```

---

### Other AI Tools

Clone Effikit and point your assistant at the folder. Tell it to read `navigation.md` first to understand the structure, then `keywords.md` to find the right file, then open and adapt the file. The MCP server is not required — it just makes the process faster and more accurate.

---

## MCP Tools Reference

The Effikit MCP server exposes 8 tools. They are designed to work in sequence: navigate or blueprint first, read second, adapt third.

### `effikit_navigate`

The entry point. Call this before every coding task. Describe what you want to build in plain language — the engine scores every Effikit file against your description and returns the top matches.

```
Input:  task (string)  — "a retry hook with exponential backoff"
        limit (number) — max results to return, default 6

Output: scored list of matching files with relevance percentages and reasons
```

**When to call:** Before writing any new code. This is the first tool to reach for.

### `effikit_blueprint`

For building a complete feature, not just a single utility. Returns a layered plan: which expert mindset to adopt (skill), which code to adapt (craft/mind), which prompt to use for validation (prompt).

```
Input:  task (string) — "real-time collaborative text editor"

Output: layered recipe
        1. Skill: skills/realtime/* — adopt this expert mindset
        2. Code:  mind/realtime/realtime.sync.ts — adapt this for WebSocket sync
                  mind/realtime/realtime.conflict.ts — adapt this for conflict resolution
        3. Prompt: prompt/architecture/architecture.design.md — use for design review
```

**When to call:** When building a full feature with multiple moving parts.

### `effikit_search`

Free-form search across the entire library or a specific section. Useful when you know what you're looking for but aren't describing a task.

```
Input:  query (string)   — "levenshtein" or "rate limiting" or "ELO score"
        section (string) — optional: craft | mind | skills | bridge | prompt
        limit (number)   — default 8

Output: scored matches with relevance reasons
```

### `effikit_read`

Load the full content of a specific file. Always call this after `effikit_navigate` or `effikit_search` identifies the file you want.

```
Input:  path (string) — "craft/auth/auth.token.ts"

Output: full file content + adaptation directive
        ("Read this, adapt to your project's types, write to your project — do not modify this file")
```

### `effikit_skill`

Activate an expert mindset for a domain. The AI adopts the reasoning patterns, priorities, and tradeoffs of a specialist before writing code.

```
Input:  domain (string) — "security", "refactoring", "feynman", "typescript-expert"

Output: relevant skill files from skills/
```

### `effikit_manifest`

View the complete map of all Effikit files, organized by section and group. Useful when you're not sure what exists or want an overview before starting.

```
Input:  (none)
Output: full tree of sections → groups → files
```

### `effikit_stats`

Coverage statistics: total files, total unique keywords, and per-section breakdown.

```
Output: totalFiles: 241
        totalKeywords: 1,847
        sections: craft(24) mind(36) skills(104) bridge(27) prompt(50)
```

### `effikit_audit`

Health check for the entire library. Detects missing `@keywords` tags (files the AI can never find), empty tag bodies, thin keyword sets, and folders approaching the cohesion budget limit. Run this after adding new files.

```
Output: tag health report — healthy: N, unindexable: N, warnings: N
        cohesion budget report — healthy: N, warn: N, violations: N
```

---

## CLI Reference

```
effikit add <keyword...>     Find best match → copy to current directory
effikit search <keyword...>  Find matches → show scored list (no copy)
effikit list                 Show full catalogue by section
```

The CLI and MCP server share the same scoring engine. Results are identical.

---

## The Workflow

**For a single utility:**

```
1. effikit_navigate("what I need")       → see top matches + relevance scores
2. effikit_read("path/to/best/match")    → load full file content
3. Adapt the implementation              → fit your types, naming, and constraints
4. Write into your project               → never into .effikit
```

**For a complete feature:**

```
1. effikit_blueprint("full feature description")
   → get: skill to adopt + code files to adapt + prompt for validation

2. effikit_skill("domain")               → adopt the expert mindset
3. effikit_read("craft/...") × N        → load each code file
4. Adapt and integrate                   → wire everything together in your project
5. Use the suggested prompt template     → for review or next steps
```

**Real example — JWT authentication system:**

```
You: "Build a JWT auth system with refresh tokens."

effikit_blueprint("JWT authentication system with refresh tokens")
  Skill:  skills/security/ — adopt security expert mindset
          skills/backend/  — adopt backend architecture mindset
  Code:   craft/auth/auth.token.ts      — JWT signing, verification, blacklisting
          craft/auth/auth.session.ts    — session lifecycle, refresh logic
          craft/auth/auth.permission.ts — role-based access control
  Prompt: prompt/security/security.auth.md — use for auth design review

effikit_read("craft/auth/auth.token.ts")
  → full TypeScript implementation with:
     signToken(payload, opts) — HS256/RS256, configurable expiry
     verifyToken(token)       — validates signature, expiry, and claims
     refreshToken(token)      — sliding window refresh with rotation
     blacklistToken(jti)      — Redis-backed revocation

Adapt → replace generic User type with your UserPayload interface,
         wire to your database session table,
         write to src/lib/auth/ in your project.
```

---

## File Tag Standard

Every file in `craft/` and `mind/` must carry four tags at the top. These tags are how the MCP server finds and scores files — without them, a file is invisible to the discovery engine.

**TypeScript files (`craft/`, `mind/`):**

```typescript
/**
 * @keywords    comma, separated, terms, that, describe, what, this, does
 * @domain      Short name for the area this belongs to
 * @use-when    The exact scenario where this is the right choice
 * @not-when    When to look elsewhere — what this does NOT cover
 */
```

Rules for good tags:
- `@keywords`: 5–15 terms. Include synonyms, related concepts, and common misspellings. Think: what would someone type when they need this?
- `@domain`: one short phrase, not a sentence
- `@use-when`: specific scenario. "When you need X and Y is a constraint" is better than "when you need state management"
- `@not-when`: honest about limitations. This prevents misuse more than any documentation

**Markdown files (`skills/`, `bridge/`, `prompt/`):**

```markdown
<!-- @keywords: comma, separated, terms -->
<!-- @domain: short description -->
```

The indexer reads these tags on startup and builds the keyword map in memory. The MCP server never reads tags at query time — only the prebuilt index.

---

## Adding New Files

**1. Create the file in the right location:**

- TypeScript code → `craft/<domain>/` or `mind/<domain>/`
- AI behavior → `skills/<domain>/`
- Service guide → `bridge/<service>/`
- Prompt template → `prompt/<domain>/`

**Folder size limits** (enforced by the cohesion budget system):
- `craft/` and `mind/` folders: 3 files each
- `skills/` folders: 4 files each
- `prompt/` folders: 5 files each

If a folder is full, split the domain rather than overfilling it.

**2. Write the tags at the top of the file** (see [File Tag Standard](#file-tag-standard) above).

**3. Regenerate the keyword index:**

```bash
# Manual
npx tsx sync.ts

# Automatic (if you installed dev deps with npm install in .effikit root)
# The Husky pre-commit hook runs sync.ts automatically when craft/ or mind/ changes
# and stages the updated keywords.md as part of your commit.
```

**4. Audit the result:**

```bash
# Via MCP — call effikit_audit from your AI client
# Via CLI
npx tsx cli/index.ts list   # verify your file appears
```

The audit catches:
- `missing-keywords` — file has no `@keywords` tag; the AI can never find it
- `empty-keywords` — `@keywords` tag exists but is blank
- `thin-keywords` — only one keyword; probably a copy-paste artifact
- `missing-domain` — no `@domain` tag (craft/mind only)
- `missing-use-when` — no `@use-when` tag (craft/mind only)

The cohesion budget check flags folders growing beyond their limits before they silently degrade search quality.

---

## Contributing

**What gets accepted:**
- Generic, reusable implementations that work across projects
- Genuinely better than what an AI generates cold
- Full type safety, zero `any`, edge cases handled
- Decisive — takes a position, doesn't say "it depends" without specifics

**What gets rejected:**
- Project-specific glue code
- Untyped or partially typed implementations
- Near-duplicates of existing files
- Vague guidance without concrete examples

**Process:**
1. Fork the repo, create a branch
2. Add your file(s) following the tag standard
3. Run `npx tsx sync.ts` to regenerate `keywords.md`
4. Open a PR — the `effikit-audit` GitHub Action runs automatically and verifies tag health and cohesion budget
5. PR description: what does the file do, when should it be used, what does it not cover

See [rules.md](rules.md) for the complete quality control specification.

---

## License

[MIT](LICENSE) © 2026 aistorystudio42-byte
