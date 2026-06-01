# Effikit Navigation Guide
> Internal map for Claude Code. Read this first before every task.

---

## What is Effikit?

Effikit is a personal developer toolkit — a library of ready-to-use TypeScript code, algorithms, AI behavior directives, MCP bridge guides, and prompt templates. Before writing anything from scratch, always check if Effikit already has it.

---

## Two Ways to Use Effikit

**1. MCP Server (preferred — works in any AI tool).** If the Effikit MCP server is
connected, you have these tools available and should reach for them FIRST:

| Tool | Call it when… |
|------|---------------|
| `effikit_navigate` | Starting ANY coding task. Describe the task → get the most relevant files. |
| `effikit_blueprint` | Building a whole feature → get a layered, multi-file recipe. |
| `effikit_search` | Looking for a specific keyword/concept. |
| `effikit_read` | Reading the full content of a suggested file. |
| `effikit_skill` | Needing an expert mindset for a domain (security, refactoring, a persona…). |
| `effikit_manifest` / `effikit_stats` | Getting the full map / coverage overview. |

Reflex: **task → `effikit_navigate` → `effikit_read` → adapt into the project.**
Setup for 10 tools (Cursor, VS Code, Windsurf, Antigravity, Zed, Cline…) lives in
[mcp/install.md](mcp/install.md).

**2. Manual file reading (fallback).** If the MCP server is NOT connected, read this
file and `keywords.md` directly, locate the file by keyword, then open and adapt it.
Same destination, one extra step.

---

## Directory Map

```
effikit/
  navigation.md     ← You are here. Read first.
  keywords.md       ← Keyword → file mapping engine. Use to locate files fast.
  rules.md          ← Usage rules and quality control. Always respect these.
  sync.ts           ← Auto-updates keywords.md from @keywords tags in source files.
  README.md         ← GitHub landing page.
  LICENSE           ← MIT license.
  │
  ├── mcp/          ← MCP server: turns Effikit into a discovery engine any AI can query
  ├── craft/        ← Ready TypeScript libraries (UI, UX, hooks, API, DB, auth, animation, media)
  ├── mind/         ← Advanced algorithm libraries (recommendation, search, AI, graph...)
  ├── skills/       ← AI behavior directives for Claude (how to act in each domain)
  ├── bridge/       ← MCP server and external service integration guides
  └── prompt/       ← Ready-to-use prompt templates for common tasks
```

---

## Decision Tree — Where to Look?

`keywords.md` is a 3-layer funnel. Walk the layers in order — each one narrows the target.

```
User asks for something
        │
        ▼
LAYER 1 · INTENT   → "What are they TRYING to do?"  → narrows to an area (craft/api, mind/ranking…)
        │
        ▼
LAYER 2 · SCENARIO → match the concrete trigger      → lands on the EXACT file
        │            ("user types in search box" → mind/search/search.query.ts)
        ▼
LAYER 3 · DISAMBIG → two files still feel close?      → tie-breaker table decides
        │            ("cache": HTTP→api.cache / eviction→caching.strategy)
        ▼
   Found it ─────────► Read the file, adapt to the project, write into the project
        │
   Nothing fits ─────► Browse the category tables below → still nothing → write from scratch
```

**The generic-term rule:** if your search word is broad (`cache`, `retry`, `score`,
`validation`, `prompt`, `animation`), do NOT expect a direct hit — those are intentionally
not lookup keys. Drop to Layer 3, or qualify the term ("HTTP response cache", "job retry").

**The four-area rule:** the same word can appear in `craft/`, `mind/`, `skills/`, `bridge/`, `prompt/`.
Decide which you want first: **code to adapt** (craft/mind), **how Claude should think** (skills),
**external tool usage** (bridge), or **text to paste** (prompt).

---

## Craft — Code Libraries

**When to use:** You need a working TypeScript implementation, not just a concept.

| Folder | Contains | Go here when... |
|--------|----------|-----------------|
| `craft/ui/` | React components, layout, design tokens | Building UI, need a card/modal/grid |
| `craft/ux/` | Interactions, feedback states, accessibility | Need drag-drop, loading states, ARIA |
| `craft/hooks/` | React hooks (state, async, lifecycle) | Need custom hooks for fetch/resize/mount |
| `craft/api/` | Request handling, error management, caching | Building API client layer |
| `craft/db/` | Query builder, schema, migrations | Working with database layer |
| `craft/auth/` | Session, JWT tokens, permissions | Implementing auth or RBAC |
| `craft/animation/` | Transitions, micro-interactions, scroll effects | Adding motion to UI |
| `craft/media/` | Image, video, audio performance libraries | Lazy loading, video autoplay, audio API |

**Files in each folder:**
- `craft/ui/` → `ui.components.ts`, `ui.layout.ts`, `ui.tokens.ts`
- `craft/ux/` → `ux.interaction.ts`, `ux.feedback.ts`, `ux.accessibility.ts`
- `craft/hooks/` → `hooks.state.ts`, `hooks.async.ts`, `hooks.lifecycle.ts`
- `craft/api/` → `api.request.ts`, `api.error.ts`, `api.cache.ts`
- `craft/db/` → `db.query.ts`, `db.schema.ts`, `db.migration.ts`
- `craft/auth/` → `auth.session.ts`, `auth.token.ts`, `auth.permission.ts`
- `craft/animation/` → `animation.transition.ts`, `animation.micro.ts`, `animation.scroll.ts`
- `craft/media/` → `media.image.ts`, `media.video.ts`, `media.audio.ts`

---

## Mind — Algorithm Libraries

**When to use:** You need a smart, non-trivial algorithm — ranking, scoring, search, AI integration.

| Folder | Contains | Go here when... |
|--------|----------|-----------------|
| `mind/recommendation/` | Collaborative filtering, scoring, filtering | Building "you might also like" |
| `mind/discovery/` | Feed management, ranking, diversity | Building content discovery feeds |
| `mind/decision/` | Decision trees, weighted choices, fallbacks | Need multi-criteria decision logic |
| `mind/optimization/` | Genetic algorithms, memoization, benchmarks | Need performance-critical algorithms |
| `mind/ranking/` | ELO, TrueSkill, decay, boost systems | Ranking users, items, content |
| `mind/search/` | Query parsing, fuzzy matching, inverted index | Building search functionality |
| `mind/personalization/` | User profiles, behavior tracking, adaptation | Personalizing content per user |
| `mind/realtime/` | WebSocket sync, queues, conflict resolution | Real-time collaborative features |
| `mind/graph/` | Relation graphs, traversal, clustering | Social graphs, dependency trees |
| `mind/caching/` | LRU/LFU/TTL strategies, invalidation, layers | Advanced caching architecture |
| `mind/security/` | Encryption, validation, audit logging | Security-critical implementations |
| `mind/ai/` | Prompt engineering, context management, pipelines | AI feature integration |

---

## Skills — AI Behavior Directives

**When to use:** You need Claude to behave in a specific, expert way for a domain task.

| Folder | Use when you're working on... |
|--------|-------------------------------|
| `skills/frontend/` | React components, styling, state, performance |
| `skills/backend/` | Server architecture, business logic, patterns |
| `skills/api/` | REST/GraphQL endpoints, validation, versioning |
| `skills/database/` | Schema design, query optimization, migrations |
| `skills/debugging/` | Diagnosing bugs, reading logs, reproducing issues |
| `skills/security/` | Auth flows, input security, vulnerability scanning |
| `skills/testing/` | Unit, integration, e2e test strategies |
| `skills/refactoring/` | Code cleanup, pattern application, naming |
| `skills/design/` | Design systems, typography, responsive layout |
| `skills/ai/` | Prompt writing, context management, AI pipelines |
| `skills/devops/` | CI/CD, Docker, deployment, monitoring |
| `skills/code-review/` | PR review checklists, feedback standards |
| `skills/documentation/` | Code comments, README, API docs, changelogs |
| `skills/architecture/` | System design, patterns, architectural decisions |
| `skills/performance/` | Frontend/backend/DB optimization and profiling |
| `skills/accessibility/` | ARIA, keyboard nav, screen reader support |
| `skills/creativity/` | Edison, Disney, Shakespeare, Dali personas |
| `skills/art/` | Da Vinci, Beethoven, Picasso, Michelangelo personas |
| `skills/science/` | Einstein, Newton, Feynman, Tesla personas |
| `skills/performance-boost/` | Speed, focus, quality, workflow optimization |
| `skills/media/` | Image/video/audio performance and optimization |
| `skills/marketing/` | Copywriting, positioning, growth, storytelling |
| `skills/code-critic/` | Code review, antipatterns, refactoring, standards |
| `skills/reasoning/` | First principles, Socratic, logic, debiasing |
| `skills/typescript-expert/` | Advanced TS types, patterns, compiler, performance |
| `skills/ceo/` | Strategy, network effects, growth, positioning |

Each skills folder contains 4 `.md` files — read the one closest to your current task.

---

## Bridge — External Service Guides

**When to use:** You're integrating with an external tool or MCP server.

| Folder | Service | Use for... |
|--------|---------|------------|
| `bridge/github/` | GitHub | Repo management, PRs, issues, branch strategy |
| `bridge/vercel/` | Vercel | Deployments, environment variables, previews |
| `bridge/supabase/` | Supabase | DB, auth, storage, realtime subscriptions |
| `bridge/figma/` | Figma | Design tokens, component extraction |
| `bridge/threjs/` | Three.js | 3D scenes, physics, WebGL |
| `bridge/framermotion/` | Framer Motion | Animations, gestures, page transitions |
| `bridge/wolframalpha/` | Wolfram Alpha | Math, physics, scientific queries |
| `bridge/shadcn/` | shadcn/ui | Component setup, theming, customization |
| `bridge/gsap/` | GSAP | Timeline animations, ScrollTrigger |

---

## Prompt — Ready Prompt Templates

**When to use:** You need a well-crafted prompt for a specific task type.

| Folder | Templates for... |
|--------|-----------------|
| `prompt/code/` | Code generation, completion, improvement |
| `prompt/debug/` | Error analysis, root cause finding |
| `prompt/review/` | Code review, quality and security analysis |
| `prompt/architecture/` | System design, architecture decisions |
| `prompt/planning/` | Project planning, sprint management |
| `prompt/database/` | Schema design, query writing, optimization |
| `prompt/security/` | Security audits, vulnerability scanning |
| `prompt/performance/` | Performance analysis and optimization |
| `prompt/design/` | UI/UX design, component systems |
| `prompt/ai/` | AI integration, prompt engineering, pipelines |

Each prompt folder contains 5 `.md` template files.

---

## Quick Reference — Most Used Paths

```
UI component needed     → craft/ui/ui.components.ts
Custom React hook       → craft/hooks/hooks.async.ts
API error handling      → craft/api/api.error.ts
JWT / auth              → craft/auth/auth.token.ts
Search algorithm        → mind/search/search.fuzzy.ts
Ranking system          → mind/ranking/ranking.score.ts
AI prompt pipeline      → mind/ai/ai.pipeline.ts
How to do code review   → skills/code-review/
Deploy to Vercel        → bridge/vercel/
Debug a bug             → skills/debugging/ + prompt/debug/
```

---

## Maintenance

- Run `npx ts-node sync.ts` after adding new files to auto-update `keywords.md`
- Never modify files inside Effikit directly — copy to project, adapt, write to project
- Keep `keywords.md` accurate — it's the fast-lookup layer
