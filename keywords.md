# Effikit Keywords Index
> Precision targeting engine. Read ONE keyword → land on the EXACT file.
>
> **How to use this file (in order):**
> 1. **Layer 1 — Intent.** Start here. What is the user TRYING to do? → narrows to a section.
> 2. **Layer 2 — Scenario.** Match the concrete situation → lands on the exact file.
> 3. **Layer 3 — Disambiguation.** If two files feel close, this table breaks the tie.
> 4. **Per-file keyword tables** (auto-generated, bottom) → confirm with the file's own `@keywords`.
>
> Rule of this index: **one keyword maps to at most 2 files.** If a term feels generic
> (e.g. "cache", "retry", "validation", "score"), it is intentionally NOT a lookup key —
> use the qualified scenario phrase instead ("HTTP response cache", "job retry", "sanitize user input").

---

## LAYER 1 — Intent Router
> "What am I trying to do right now?" Pick the row, jump to the area.

| If the user is trying to… | Go to area |
|---------------------------|------------|
| Build/visualize something on screen (components, layout, motion, media) | `craft/ui`, `craft/animation`, `craft/media` |
| Wire up React behavior (state, data fetching, lifecycle, gestures, feedback) | `craft/hooks`, `craft/ux` |
| Talk to a backend / handle data transport (HTTP, errors, response cache) | `craft/api` |
| Persist or model data (queries, schema, migrations) | `craft/db` |
| Authenticate or authorize users | `craft/auth` |
| Rank, recommend, score, or personalize items | `mind/recommendation`, `mind/ranking`, `mind/discovery`, `mind/personalization` |
| Search or match text | `mind/search` |
| Make a programmatic decision / stay resilient | `mind/decision` |
| Move data in real time / handle concurrency | `mind/realtime` |
| Model relationships or traverse a network | `mind/graph` |
| Cache or memoize for performance | `mind/optimization`, `mind/caching` |
| Run heavy math / optimize / benchmark | `mind/optimization` |
| Encrypt, validate input, or audit security (in code) | `mind/security` |
| Build an AI feature in code (prompts, context, pipelines) | `mind/ai` |
| **Change how Claude behaves** for a domain (guidance, not code) | `skills/*` |
| Integrate an external service / MCP | `bridge/*` |
| Get a ready-made prompt to paste | `prompt/*` |

---

## LAYER 2 — Scenario Router
> Concrete trigger → exact file. These are the fast path; they win over generic terms.

### "The user is on a page and…"
| Scenario | File |
|----------|------|
| …types into a search box → parse/normalize the raw string | `mind/search/search.query.ts` |
| …searches and we must tolerate typos | `mind/search/search.fuzzy.ts` |
| …searches a large text corpus, need an index | `mind/search/search.index.ts` |
| …scrolls and elements should reveal/parallax | `craft/animation/animation.scroll.ts` |
| …scrolls a feed that loads more (pagination/cursor) | `mind/discovery/discovery.feed.ts` |
| …scrolls past a video that should autoplay | `craft/media/media.video.ts` |
| …an image enters viewport and should lazy-load with blur-up | `craft/media/media.image.ts` |
| …hovers/clicks a button and it should feel tactile | `craft/animation/animation.micro.ts` |
| …drags an item or swipes | `craft/ux/ux.interaction.ts` |
| …is waiting on async work (spinner/skeleton/toast) | `craft/ux/ux.feedback.ts` |
| …navigates between pages/routes (enter/exit motion) | `craft/animation/animation.transition.ts` |

### "I'm fetching / transporting data and…"
| Scenario | File |
|----------|------|
| …need a typed HTTP client with interceptors + timeout | `craft/api/api.request.ts` |
| …need to cache HTTP responses (stale-while-revalidate) | `craft/api/api.cache.ts` |
| …need to normalize/classify HTTP errors | `craft/api/api.error.ts` |
| …need a React hook for loading/error/retry around a fetch | `craft/hooks/hooks.async.ts` |

### "I'm working with stored data and…"
| Scenario | File |
|----------|------|
| …building dynamic SQL safely | `craft/db/db.query.ts` |
| …defining typed models + runtime schema | `craft/db/db.schema.ts` |
| …versioning the schema (migrate/rollback) | `craft/db/db.migration.ts` |

### "I need to rank / recommend and…"
| Scenario | File |
|----------|------|
| …suggest items from user behavior (collaborative/content) | `mind/recommendation/recommendation.engine.ts` |
| …blend many signals into ONE score | `mind/recommendation/recommendation.scoring.ts` |
| …filter/dedup/blacklist the result list | `mind/recommendation/recommendation.filter.ts` |
| …rank a feed by freshness + engagement | `mind/discovery/discovery.ranking.ts` |
| …stop one category from flooding the feed (MMR) | `mind/discovery/discovery.diversity.ts` |
| …give players/items a competitive rating (ELO/TrueSkill) | `mind/ranking/ranking.score.ts` |
| …make scores fade over time (trending/hot) | `mind/ranking/ranking.decay.ts` |
| …pin/promote/sponsor an item to the top | `mind/ranking/ranking.boost.ts` |

### "I need performance / caching and…"
| Scenario | File |
|----------|------|
| …memoize an expensive pure function | `mind/optimization/optimization.cache.ts` |
| …build a bounded in-memory cache (LRU/LFU/TTL) | `mind/caching/caching.strategy.ts` |
| …invalidate related cache entries when data changes | `mind/caching/caching.invalidation.ts` |
| …coordinate L1+L2 (memory + Redis) tiers | `mind/caching/caching.layer.ts` |
| …cache HTTP responses on the client | `craft/api/api.cache.ts` |

### "I'm doing security (in code) and…"
| Scenario | File |
|----------|------|
| …encrypt/decrypt data (AES/RSA, Web Crypto) | `mind/security/security.encrypt.ts` |
| …sanitize/validate untrusted input at a boundary | `mind/security/security.validate.ts` |
| …log and detect anomalous security events | `mind/security/security.audit.ts` |

### "I'm building an AI feature (in code) and…"
| Scenario | File |
|----------|------|
| …assemble prompt templates programmatically | `mind/ai/ai.prompt.ts` |
| …manage token budget / conversation memory / RAG context | `mind/ai/ai.context.ts` |
| …orchestrate multi-step (parallel/sequential) AI calls | `mind/ai/ai.pipeline.ts` |

---

## LAYER 3 — Disambiguation
> When two files share a fuzzy concept, this is the tie-breaker.
> Format: ambiguous term → **pick this** when… / **pick that** when…

| Fuzzy term | Pick A when… | Pick B when… |
|------------|--------------|--------------|
| **cache** | client HTTP responses → `craft/api/api.cache.ts` | algorithm/in-memory eviction → `mind/caching/caching.strategy.ts` (or memoize a fn → `mind/optimization/optimization.cache.ts`) |
| **retry** | inside a React fetch hook → `craft/hooks/hooks.async.ts` | a job in a queue → `mind/realtime/realtime.queue.ts` (or resilience/fallback chain → `mind/decision/decision.fallback.ts`) |
| **score / scoring** | blend signals for a recommendation → `mind/recommendation/recommendation.scoring.ts` | competitive rating (ELO) → `mind/ranking/ranking.score.ts` (or weighted decision → `mind/decision/decision.weight.ts`) |
| **boost / decay / freshness** | one ranking concern in a feed pipeline → `mind/discovery/discovery.ranking.ts` | a dedicated decay curve → `mind/ranking/ranking.decay.ts` / a manual pin → `mind/ranking/ranking.boost.ts` |
| **diversity / dedup** | feed novelty algorithm (MMR) → `mind/discovery/discovery.diversity.ts` | post-process a recommendation list → `mind/recommendation/recommendation.filter.ts` |
| **multi-criteria** | choosing among options (AHP/pairwise) → `mind/decision/decision.weight.ts` | scoring recommendation items → `mind/recommendation/recommendation.scoring.ts` |
| **intersection observer** | generic React lifecycle hook → `craft/hooks/hooks.lifecycle.ts` | image/video viewport loading → `craft/media/*` / scroll reveal → `craft/animation/animation.scroll.ts` |
| **validation** | runtime DB model/schema shape → `craft/db/db.schema.ts` | untrusted input / injection defense → `mind/security/security.validate.ts` |
| **queue** | in-process job queue (code) → `mind/realtime/realtime.queue.ts` | distributed (Redis/SQS) → use `bridge/*`, not Effikit |
| **prompt** | programmatic template engine (code) → `mind/ai/ai.prompt.ts` | how-to write prompts (guidance) → `skills/ai/` | 
| **prompt (ready text)** | paste-ready prompt template → `prompt/ai/` | — |
| **refactor** | mechanical how-to (extract/rename) → `skills/refactoring/` | judgment on what's wrong + antipatterns → `skills/code-critic/` |
| **positioning** | strategic decision (founder view) → `skills/ceo/` | the actual message/copy wording → `skills/marketing/` |
| **growth** | growth equation + unit economics (founder) → `skills/ceo/` | growth loops + viral/retention tactics → `skills/marketing/` |
| **scalability** | app-level (queue/worker/rate-limit) → `skills/backend/` | system-level (capacity/load balancing) → `skills/architecture/` |
| **performance** | frontend Core Web Vitals → `skills/performance/performance.frontend.md` | DB query tuning → `skills/performance/performance.database.md` / backend throughput → `skills/performance/performance.backend.md` |
| **encryption** | working code (Web Crypto) → `mind/security/security.encrypt.ts` | guidance/decisions → `skills/security/` / a ready prompt → `prompt/security/` |
| **animation** | working React code → `craft/animation/*` | Framer Motion API → `bridge/framermotion/` / GSAP timelines → `bridge/gsap/` |

> **Cross-layer rule:** `craft/` and `mind/` = **code you adapt**. `skills/` = **how Claude should think**.
> `bridge/` = **external tool usage**. `prompt/` = **text you paste**. Same word can live in all four —
> the layer you're in decides which one you want.

---

## SKILLS — AI Behavior Directives
> Guidance for how Claude should act. Not code. (sync.ts does not scan skills/ — keep this table current by hand.)

| Keywords | Folder |
|----------|--------|
| react component guidance, jsx, styling decisions, frontend state, frontend performance | `skills/frontend/` |
| backend architecture, service layering, repository pattern, backend scalability patterns | `skills/backend/` |
| REST endpoint design, API versioning, API auth, API documentation, request validation guidance | `skills/api/` |
| schema design guidance, query optimization advice, normalization, indexing strategy | `skills/database/` |
| how to debug, bug finding strategy, read logs, reproduce bug, production debugging, async race conditions | `skills/debugging/` |
| security guidance, OWASP, auth security, input security advice, encryption decisions, security audit checklist | `skills/security/` |
| testing strategy, unit test, integration test, e2e, coverage thresholds | `skills/testing/` |
| how to refactor, extract method, rename, code smells, mechanical cleanup | `skills/refactoring/` |
| design system thinking, typography, color, responsive, UX guidance | `skills/design/` |
| how to write prompts, AI context guidance, AI pipeline design, AI evaluation/evals | `skills/ai/` |
| CI/CD, Docker, infrastructure, monitoring/observability guidance | `skills/devops/` |
| code review checklist, review feedback, review standards, perf/security review lens | `skills/code-review/` |
| README, code comments, API docs, changelog writing | `skills/documentation/` |
| architecture patterns, architecture decisions, diagrams, system-level scalability | `skills/architecture/` |
| frontend/backend/database performance tuning, monitoring, profiling lens | `skills/performance/` |
| semantic HTML, ARIA guidance, keyboard nav, color contrast, a11y testing | `skills/accessibility/` |
| brainstorm/ideate persona — Edison, Disney, Shakespeare, constraints | `skills/creativity/` |
| artistic persona — Da Vinci, Beethoven, Picasso, Michelangelo | `skills/art/` |
| scientist persona — Einstein, Newton, Feynman, Tesla | `skills/science/` |
| focus, deep work, developer velocity, quality mindset, workflow | `skills/performance-boost/` |
| media perf guidance — image/video/audio optimization, Core Web Vitals lens | `skills/media/` |
| copywriting, AIDA headline/CTA, positioning MESSAGE, growth LOOP tactics, storytelling | `skills/marketing/` |
| code critique — antipatterns, strangler-fig refactor judgment, what's wrong + standards | `skills/code-critic/` |
| first principles, Socratic questioning, logical fallacies, debiasing/pre-mortem | `skills/reasoning/` |
| advanced TS types, TS design patterns, ts-morph compiler, tsc performance | `skills/typescript-expert/` |
| business STRATEGY, Porter's forces, network effects, growth EQUATION, positioning DECISION | `skills/ceo/` |

> **marketing vs ceo:** `skills/ceo/` = the strategic *decision* (where to compete, the growth equation).
> `skills/marketing/` = the *expression* of it (the message, the loop, the copy). See Layer 3.

---

## BRIDGE — External Service Guides
> Each folder has setup / workflows / bestpractices. Match the service name.

| Keywords | Folder |
|----------|--------|
| github, repo, branch, pull request, issue, git actions | `bridge/github/` |
| vercel, deploy, preview deployment, domain, env var, serverless | `bridge/vercel/` |
| supabase, postgres + rls, supabase storage/realtime/auth | `bridge/supabase/` |
| figma, design tokens, component export, design handoff | `bridge/figma/` |
| three.js, threjs, 3d, webgl, scene, mesh, r3f | `bridge/threjs/` |
| framer motion, motion component, spring, layout animation | `bridge/framermotion/` |
| wolfram, wolframalpha, computational math/physics query | `bridge/wolframalpha/` |
| shadcn, shadcn/ui, radix, component library theming | `bridge/shadcn/` |
| gsap, greensock, timeline, scrolltrigger, tween | `bridge/gsap/` |

---

## PROMPT — Ready-to-Paste Templates
> Text you hand to an LLM. Not code, not guidance. Match the task.

| Keywords | Folder |
|----------|--------|
| generate code prompt, implement feature prompt, refactor/test/typescript prompt | `prompt/code/` |
| diagnose bug prompt, log analysis prompt, memory leak prompt, network debug prompt | `prompt/debug/` |
| code review prompt, architecture/security/database/UX review prompt | `prompt/review/` |
| system design prompt, diagram prompt, ADR prompt, migration/patterns/scalability prompt | `prompt/architecture/` |
| task breakdown prompt, project/release planning prompt, decision/comms prompt | `prompt/planning/` |
| DB design prompt, query/migration/optimization/search prompt | `prompt/database/` |
| security audit prompt, pentest prompt, auth/encryption/monitoring prompt | `prompt/security/` |
| performance analysis prompt, frontend/backend/database/monitoring perf prompt | `prompt/performance/` |
| UI component design prompt, design system/UX/animation/copywriting prompt | `prompt/design/` |
| prompt engineering prompt, AI integration/agents/context/optimization prompt | `prompt/ai/` |

---

<!-- AUTO-GENERATED: sync.ts -->

## CRAFT — Auto-Generated Index

> Generated by sync.ts on 2026-06-01

### craft/animation

| Keywords | File | Use When |
|----------|------|----------|
| hover, micro interaction, button animation, focus animation, ripple, spring, bounce, magnetic | `craft/animation/animation.micro.ts` | Adding tactile feel to buttons, inputs, cards — hover lifts, click feedback, focus rings, ripples |
| scroll animation, parallax effect, reveal on scroll, sticky header animation, scroll progress bar, scroll-driven animation, animate when element scrolls into view | `craft/animation/animation.scroll.ts` | Animating elements based on scroll position: reveals, parallax, progress indicators, sticky headers |
| page transition, route animation, enter, exit, fade, slide, mount animation, framer, css transition | `craft/animation/animation.transition.ts` | Animating page changes, component mount/unmount, modal open/close, or route transitions |

### craft/api

| Keywords | File | Use When |
|----------|------|----------|
| HTTP response cache, stale-while-revalidate, swr cache, revalidate fetch, cache-first, network-first, request deduplication, client-side fetch cache, offline-first data | `craft/api/api.cache.ts` | Caching API responses to reduce network requests, implementing stale-while-revalidate, or offline-first patterns |
| error handling, api error, 4xx, 5xx, error boundary, classify, catch, normalize, error map | `craft/api/api.error.ts` | Normalizing and classifying HTTP errors, mapping status codes to user messages, building error boundaries |
| http client, axios alternative, request interceptor, auth header injection, request timeout, base url config, typed api client, fetch wrapper, request middleware | `craft/api/api.request.ts` | Building a typed HTTP client layer with interceptors, timeout, auth headers, and retry logic |

### craft/auth

| Keywords | File | Use When |
|----------|------|----------|
| rbac, role, permission, policy, can, cannot, guard, acl, access control, authorization | `craft/auth/auth.permission.ts` | Implementing role-based access control, feature flags per role, or resource-level authorization |
| user session lifecycle, session cookie, session expiry, auto refresh session, logout clear session, next-auth session, persist auth state, idle timeout | `craft/auth/auth.session.ts` | Managing user sessions: storing, refreshing, validating, and clearing authentication state |
| jwt sign, jwt verify, jwt decode, jwt payload claims, bearer token, token signing secret, encode token, token rotation, parse jwt | `craft/auth/auth.token.ts` | Creating, signing, verifying, and decoding JWT tokens; managing token rotation |

### craft/db

| Keywords | File | Use When |
|----------|------|----------|
| migration, seed, rollback, version, alter, up, down, changelog, database version | `craft/db/db.migration.ts` | Running schema migrations in order, tracking applied migrations, and rolling back failed ones |
| sql query builder, dynamic sql, prepared statement, parameter binding, where clause builder, join builder, query composition, sql injection-safe params | `craft/db/db.query.ts` | Building dynamic SQL queries with type safety, parameter binding, and query composition |
| database schema, typed model, table definition, zod schema, column types, model relations, runtime schema validation, prisma drizzle alternative | `craft/db/db.schema.ts` | Defining typed database models, runtime validation schemas, and table column definitions |

### craft/hooks

| Keywords | File | Use When |
|----------|------|----------|
| useFetch hook, useAsync, useQuery hook, data fetching hook, loading error state, request retry hook, abort on unmount, polling hook, optimistic mutation, react async | `craft/hooks/hooks.async.ts` | Fetching data from APIs with loading/error/retry states, polling, or optimistic mutations |
| useMount hook, useUnmount, useResizeObserver hook, useIntersectionObserver hook, useEventListener, useDebounce hook, useThrottle hook, useScrollPosition, effect cleanup, react lifecycle | `craft/hooks/hooks.lifecycle.ts` | Responding to DOM events, viewport changes, element visibility, or managing effect cleanup |
| useState, useReducer, state machine, zustand, context, global state, atom, immer, history, undo | `craft/hooks/hooks.state.ts` | You need advanced state patterns: state machines, undo/redo, derived state, shared atoms |

### craft/media

| Keywords | File | Use When |
|----------|------|----------|
| Web Audio API, AudioContext, audio player, audio visualizer, AnalyserNode, spatial audio, PannerNode, AudioWorklet, MediaRecorder, audio recorder, microphone, crossfade, waveform, frequency data, SoundBoard, mobile audio | `craft/media/media.audio.ts` | Web Audio API: visualizers, players with crossfade, spatial audio, real-time microphone processing, audio worklets, or multi-sound boards |
| lazy load image, progressive image, blur hash placeholder, responsive image srcset, WebP AVIF detection, image CLS prevention, aspect ratio box, image preloader, bandwidth-aware images, image fade-in on load | `craft/media/media.image.ts` | Loading images with performance constraints: lazy load, blur-up placeholders, responsive srcset, format detection, CLS prevention |
| video player hook, autoplay on scroll, video bandwidth detection, picture-in-picture toggle, video buffered progress, NetworkInformation API, iOS Safari inline video, mobile video autoplay, video preload strategy, hero video | `craft/media/media.video.ts` | Any video that needs autoplay on scroll, bandwidth-aware quality, PiP toggle, buffered progress, or iOS inline playback |

### craft/ui

| Keywords | File | Use When |
|----------|------|----------|
| card, modal, dialog, input, dropdown, button, badge, avatar, tooltip, popover, react component, ui | `craft/ui/ui.components.ts` | You need ready-made, accessible React components: cards, modals, inputs, dropdowns, badges |
| grid, flex, layout, container, responsive, breakpoint, column, row, sidebar, wrapper, stack | `craft/ui/ui.layout.ts` | Building page structure, responsive grids, container widths, or flex/stack layouts |
| design token values, color palette tokens, spacing scale, typography scale, border radius tokens, shadow tokens, theme variables, design system constants | `craft/ui/ui.tokens.ts` | You need consistent design values across the app: colors, spacing scale, font sizes, shadows |

### craft/ux

| Keywords | File | Use When |
|----------|------|----------|
| aria, keyboard nav, screen reader, focus trap, tab order, accessibility, a11y, wcag, focus management | `craft/ux/ux.accessibility.ts` | Building accessible modals, menus, comboboxes, or any interactive UI that must work for keyboard/screen reader users |
| loading indicator, skeleton screen, spinner, toast notification, error state ui, empty state ui, success feedback, progress indicator | `craft/ux/ux.feedback.ts` | Communicating async state to users: loading indicators, skeletons, toasts, empty states |
| drag, drop, gesture, swipe, click, touch, pointer, interaction, dnd, long press, pan | `craft/ux/ux.interaction.ts` | Building drag-and-drop lists, swipe gestures, long-press actions, or touch-friendly interactions |


## MIND — Auto-Generated Index

> Generated by sync.ts on 2026-06-01

### mind/ai

| Keywords | File | Use When |
|----------|------|----------|
| context window, token budget, conversation memory, summarization, sliding window, RAG context | `mind/ai/ai.context.ts` | Managing AI conversation context: token budgeting, memory compression, RAG document injection |
| AI pipeline, workflow, parallel, sequential, map-reduce, agent, tool use, orchestration | `mind/ai/ai.pipeline.ts` | Orchestrating multi-step AI workflows: parallel calls, sequential chains, map-reduce over documents |
| prompt template engine, programmatic prompt builder, variable interpolation in prompts, compose prompt chains in code, reusable prompt objects, few-shot template assembly | `mind/ai/ai.prompt.ts` | Building reusable, composable prompt templates with variable interpolation and chain management |

### mind/caching

| Keywords | File | Use When |
|----------|------|----------|
| event-driven cache invalidation, tag-based purge, invalidate related entries on data change, cache dependency graph, versioned cache bust | `mind/caching/caching.invalidation.ts` | Invalidating related cache entries when underlying data changes, using tags or dependencies |
| multi-tier cache, L1 L2 cache hierarchy, in-memory plus Redis cache, write-through write-back policy, read-through cache, tiered cache coordination | `mind/caching/caching.layer.ts` | Building a multi-tier cache (L1 in-memory + L2 Redis/file) with consistent read/write policies |
| LRU cache, LFU cache, cache eviction policy, in-memory key-value cache, FIFO eviction, ARC policy, bounded cache with max size | `mind/caching/caching.strategy.ts` | Implementing in-memory caches with eviction policies: LRU, LFU, TTL, or hybrid |

### mind/decision

| Keywords | File | Use When |
|----------|------|----------|
| circuit breaker, graceful degradation, multi-level fallback chain, degraded mode, resilience pattern, backup strategy when primary fails, retry with fallback | `mind/decision/decision.fallback.ts` | Building resilient systems that need graceful degradation when primary paths fail |
| decision tree, traversal, rule tree, branching logic, if-else tree, classification | `mind/decision/decision.tree.ts` | Building configurable branching logic trees for routing, classification, or rule evaluation |
| AHP analytic hierarchy process, pairwise comparison matrix, weighted decision criteria, choose among alternatives, priority weighting, multi-criteria decision analysis | `mind/decision/decision.weight.ts` | Ranking or selecting among alternatives using weighted criteria and priority scoring |

### mind/discovery

| Keywords | File | Use When |
|----------|------|----------|
| MMR maximal marginal relevance, feed diversity algorithm, prevent category flooding, echo chamber prevention, inject novelty, serendipity in ranked list | `mind/discovery/discovery.diversity.ts` | Preventing echo chambers and category flooding in feeds; injecting novelty into ranked lists |
| feed, content stream, pagination, cursor, infinite scroll, timeline, content ordering | `mind/discovery/discovery.feed.ts` | Building a paginated or cursor-based content feed with sorting and filtering |
| feed ranking pipeline, multi-factor content ranking, combine freshness and engagement, wilson score ranking, rank feed items, engagement-based ordering | `mind/discovery/discovery.ranking.ts` | Building a multi-factor content ranking system with freshness decay, engagement signals and boosts |

### mind/graph

| Keywords | File | Use When |
|----------|------|----------|
| clustering, community detection, Louvain, connected components, k-means graph, modularity | `mind/graph/graph.cluster.ts` | Finding communities, groups, or clusters within a graph: social groups, topic clusters |
| graph, relation, edge, node, directed, undirected, adjacency, relationship, knowledge graph | `mind/graph/graph.relation.ts` | Modeling relationships between entities: social networks, dependency graphs, knowledge bases |
| BFS, DFS, Dijkstra, shortest path, graph traversal, topological sort, cycle detection | `mind/graph/graph.traverse.ts` | Traversing graphs: shortest paths, reachability, topological ordering, cycle detection |

### mind/optimization

| Keywords | File | Use When |
|----------|------|----------|
| genetic algorithm, simulated annealing, gradient descent, optimization, metaheuristic, evolution | `mind/optimization/optimization.algorithm.ts` | Solving combinatorial or continuous optimization problems without closed-form solutions |
| benchmark, profiling, performance measurement, throughput, latency, percentile, flamegraph | `mind/optimization/optimization.benchmark.ts` | Measuring and comparing function performance: latency, throughput, memory, CPU cycles |
| function memoization, memoize pure function, computation cache, lazy evaluation, trie-based memo, cache expensive calculation, dynamic programming memo | `mind/optimization/optimization.cache.ts` | Caching expensive pure function results to avoid redundant computation |

### mind/personalization

| Keywords | File | Use When |
|----------|------|----------|
| adaptive content, dynamic adaptation, layout personalization, contextual rendering, user-driven UI | `mind/personalization/personalization.adapt.ts` | Dynamically adapting content, layout, or feature visibility based on user profile and context |
| behavior tracking, user pattern, session analysis, engagement sequence, behavioral signal | `mind/personalization/personalization.behavior.ts` | Tracking and analyzing user behavior patterns: sessions, sequences, engagement rhythm |
| user profile, interest model, preference learning, taste graph, user representation | `mind/personalization/personalization.profile.ts` | Building and maintaining a dynamic user interest profile from interaction signals |

### mind/ranking

| Keywords | File | Use When |
|----------|------|----------|
| pin item to top, promote content, sponsored placement, editorial boost, manual rank override, A/B test boost, force item position | `mind/ranking/ranking.boost.ts` | Applying business rules, editorial picks, sponsored content, or A/B test boosts to a ranked list |
| time-based score decay, exponential half-life decay, trending hot score, freshness decay over time, gravity ranking, age-based score reduction | `mind/ranking/ranking.decay.ts` | Scores need to decrease over time: trending content, hot posts, activity scores |
| ELO rating, TrueSkill, Bayesian average rating, competitive skill rating, leaderboard rating, matchmaking score, player skill estimation | `mind/ranking/ranking.score.ts` | Building competitive ranking systems: leaderboards, matchmaking, content quality rating |

### mind/realtime

| Keywords | File | Use When |
|----------|------|----------|
| conflict resolution, CRDT, operational transform, merge, concurrent edit, last-write-wins | `mind/realtime/realtime.conflict.ts` | Resolving concurrent edits in collaborative systems: shared documents, forms, state |
| in-process job queue, priority job queue, job retry with backoff, dead letter queue, task scheduling, concurrency-limited worker pool | `mind/realtime/realtime.queue.ts` | Building an in-process job queue with priorities, retries, and concurrency control |
| WebSocket, real-time sync, presence, live updates, channel, pub-sub, broadcast | `mind/realtime/realtime.sync.ts` | Building real-time collaboration, live feeds, or presence systems over WebSocket |

### mind/recommendation

| Keywords | File | Use When |
|----------|------|----------|
| recommendation, collaborative filtering, content-based, cosine similarity, user-item matrix, hybrid engine | `mind/recommendation/recommendation.engine.ts` | Building a recommendation system that suggests items to users based on behavior and preferences |
| recommendation post-processing, output rule engine, blacklist filter, remove already-seen items, business rule filtering, dedup recommendation results | `mind/recommendation/recommendation.filter.ts` | Post-processing recommendation results: dedup, diversity enforcement, business rules, blacklists |
| combine signals into score, weighted scoring formula, blend relevance recency popularity, score normalization, utility function, multi-signal ranking score | `mind/recommendation/recommendation.scoring.ts` | You need to combine multiple signals (relevance, recency, popularity, quality) into a single score |

### mind/search

| Keywords | File | Use When |
|----------|------|----------|
| fuzzy search, Levenshtein, Jaro-Winkler, edit distance, typo tolerance, approximate matching | `mind/search/search.fuzzy.ts` | Searching with typo tolerance, autocorrect, or approximate string matching |
| inverted index, full-text search, TF-IDF, BM25, search index, posting list, in-memory search | `mind/search/search.index.ts` | Building an in-memory full-text search engine with TF-IDF or BM25 ranking |
| query parsing, tokenization, normalization, query DSL, search query, stemming, stop words | `mind/search/search.query.ts` | Parsing and normalizing raw search strings into structured query objects before indexing or searching |

### mind/security

| Keywords | File | Use When |
|----------|------|----------|
| audit log, event trail, anomaly detection, security monitoring, tamper-proof, SIEM | `mind/security/security.audit.ts` | Recording, storing, and analyzing security-relevant events: logins, permission changes, data access |
| AES, RSA, encryption, decryption, Web Crypto, symmetric, asymmetric, PBKDF2, key derivation | `mind/security/security.encrypt.ts` | Encrypting sensitive data using Web Crypto API: AES-GCM for symmetric, RSA-OAEP for asymmetric |
| sanitize user input, runtime input validation, XSS sanitization, injection prevention at boundary, safe parse untrusted data, escape dangerous input | `mind/security/security.validate.ts` | Validating and sanitizing user input at system boundaries to prevent injection attacks |


## BRIDGE — Auto-Generated Index

> Generated by sync.ts on 2026-06-01

### bridge/figma

| Keywords | File | Use When |
|----------|------|----------|
| figma, best practices, naming convention, component organization, token, style guide, design handoff, version | `bridge/figma/figma.bestpractices.md` | Figma MCP Server — Best Practices & File Organization |
| figma, design, tokens, component, mcp setup, figma api, plugin, design system, export | `bridge/figma/figma.setup.md` | Figma MCP Server — Setup & Configuration |
| figma, design to code, token extraction, component spec, variant, auto layout, spacing, responsive, handoff | `bridge/figma/figma.workflows.md` | Figma MCP Server — Design-to-Code Workflows |

### bridge/framermotion

| Keywords | File | Use When |
|----------|------|----------|
| framer motion, performance, accessibility, reduced motion, will-change, layout thrashing, GPU, optimization | `bridge/framermotion/framermotion.bestpractices.md` | Framer Motion — Performance & Best Practices |
| framer motion, animation, motion, animate, spring, transition, React, framer | `bridge/framermotion/framermotion.setup.md` | Framer Motion — Setup & Core API |
| framer motion, page transition, scroll animation, drag, layout animation, shared layout, gesture, orchestration | `bridge/framermotion/framermotion.workflows.md` | Framer Motion — Advanced Workflows & Patterns |

### bridge/github

| Keywords | File | Use When |
|----------|------|----------|
| github, best practices, security, PAT, token, rate limit, commit, branch naming, PR hygiene | `bridge/github/github.bestpractices.md` | GitHub MCP Server — Best Practices & Security |
| github, repo, repository, git, branch, remote, clone, fork, ssh, token, mcp setup | `bridge/github/github.setup.md` | GitHub MCP Server — Setup & Configuration |
| github, pull request, PR workflow, branch strategy, issue automation, code review, merge, rebase, squash | `bridge/github/github.workflows.md` | GitHub MCP Server — Workflows & Automation |

### bridge/gsap

| Keywords | File | Use When |
|----------|------|----------|
| gsap, performance, cleanup, React, memory leak, will-change, GPU, refresh, ScrollTrigger kill, optimization | `bridge/gsap/gsap.bestpractices.md` | GSAP — Performance & Best Practices |
| gsap, greensock, timeline, tween, animation, scroll, ScrollTrigger, GSAP setup, gsap.to, gsap.from | `bridge/gsap/gsap.setup.md` | GSAP — Setup & Core API |
| gsap, timeline, ScrollTrigger, scroll animation, pinning, parallax, stagger, SVG, morphing, text animation | `bridge/gsap/gsap.workflows.md` | GSAP — Timelines & ScrollTrigger Workflows |

### bridge/shadcn

| Keywords | File | Use When |
|----------|------|----------|
| shadcn, theming, dark mode, CSS variables, customize, accessibility, composition, best practices | `bridge/shadcn/shadcn.bestpractices.md` | shadcn/ui — Theming, Customization & Best Practices |
| shadcn, shadcn/ui, radix, component, ui library, tailwind, cva, installation, theming, cli | `bridge/shadcn/shadcn.setup.md` | shadcn/ui — Setup & Component System |
| shadcn, form, react-hook-form, zod, data table, command palette, theme, dark mode, extend component | `bridge/shadcn/shadcn.workflows.md` | shadcn/ui — Workflows & Common Patterns |

### bridge/supabase

| Keywords | File | Use When |
|----------|------|----------|
| supabase, best practices, performance, index, rls security, N+1, connection pooling, migration, postgres optimization | `bridge/supabase/supabase.bestpractices.md` | Supabase MCP Server — Best Practices & Optimization |
| supabase, postgres, database, auth, storage, realtime, rls, mcp setup, supabase config | `bridge/supabase/supabase.setup.md` | Supabase MCP Server — Setup & Configuration |
| supabase, query, migration, rls policy, auth, storage, realtime, SQL, postgres, schema design | `bridge/supabase/supabase.workflows.md` | Supabase MCP Server — Workflows & Query Patterns |

### bridge/threjs

| Keywords | File | Use When |
|----------|------|----------|
| three.js, performance, optimization, dispose, memory, draw calls, instancing, LOD, frustum culling | `bridge/threjs/threjs.bestpractices.md` | Three.js — Performance & Best Practices |
| three.js, threjs, 3d, webgl, scene, renderer, camera, mesh, geometry, material, canvas, r3f | `bridge/threjs/threjs.setup.md` | Three.js — Setup & Core Concepts |
| three.js, animation, physics, shader, texture, model, GLTF, orbit controls, post processing, particle system | `bridge/threjs/threjs.workflows.md` | Three.js — Workflows & Advanced Techniques |

### bridge/vercel

| Keywords | File | Use When |
|----------|------|----------|
| vercel, best practices, performance, caching, cold start, edge, ISR, build optimization, security headers | `bridge/vercel/vercel.bestpractices.md` | Vercel MCP Server — Best Practices & Optimization |
| vercel, deploy, deployment, serverless, edge, project, token, mcp setup, vercel config | `bridge/vercel/vercel.setup.md` | Vercel MCP Server — Setup & Configuration |
| vercel, preview deployment, production deploy, rollback, branch preview, environment, domain, edge function, logs | `bridge/vercel/vercel.workflows.md` | Vercel MCP Server — Deployment Workflows |

### bridge/wolframalpha

| Keywords | File | Use When |
|----------|------|----------|
| wolfram, query optimization, natural language, API limits, error handling, precision, units, verification | `bridge/wolframalpha/wolframalpha.bestpractices.md` | WolframAlpha MCP Server — Best Practices & Query Optimization |
| wolfram, wolframalpha, math, equation, physics, chemistry, calculus, computation, science, formula | `bridge/wolframalpha/wolframalpha.setup.md` | WolframAlpha MCP Server — Setup & Query Guide |
| wolfram, calculus, linear algebra, statistics, physics simulation, engineering, data science, formula derivation | `bridge/wolframalpha/wolframalpha.workflows.md` | WolframAlpha MCP Server — Scientific & Engineering Workflows |


## PROMPT — Auto-Generated Index

> Generated by sync.ts on 2026-06-01

### prompt/ai

| Keywords | File | Use When |
|----------|------|----------|
| AI agent, autonomous agent, agentic loop, multi-step AI, workflow automation, agent design | `prompt/ai/ai.agents.md` | AI Agent Design Prompts |
| context management, context window, conversation history, summarization, memory, token limit | `prompt/ai/ai.context.md` | AI Context Management Prompts |
| AI integration, Claude API, Anthropic SDK, LLM integration, AI feature, streaming, tool use | `prompt/ai/ai.integration.md` | AI Integration Prompts |
| AI optimization, cost reduction, latency, caching, model selection, batch processing, prompt compression | `prompt/ai/ai.optimization.md` | AI Cost & Performance Optimization Prompts |
| prompt engineering, prompt design, few-shot, chain of thought, system prompt, LLM, Claude | `prompt/ai/ai.prompting.md` | Prompt Engineering Prompts |

### prompt/architecture

| Keywords | File | Use When |
|----------|------|----------|
| architecture, system design, microservice, event-driven, monolith, design decision, ADR | `prompt/architecture/architecture.design.md` | System Architecture Design Prompts |
| diagram, architecture diagram, sequence diagram, flow diagram, system diagram, mermaid, component diagram | `prompt/architecture/architecture.diagram.md` | Architecture Diagram Prompts |
| migration, tech migration, database migration, framework migration, monolith to microservices, breaking change | `prompt/architecture/architecture.migration.md` | Technology Migration Prompts |
| architecture pattern, CQRS, event sourcing, saga, outbox, BFF, strangler fig, hexagonal | `prompt/architecture/architecture.patterns.md` | Advanced Architecture Pattern Prompts |
| scalability, horizontal scaling, load balancing, caching strategy, database scaling, sharding, CDN | `prompt/architecture/architecture.scalability.md` | Scalability Architecture Prompts |

### prompt/code

| Keywords | File | Use When |
|----------|------|----------|
| generate code, implement feature, write function, create component, build module | `prompt/code/code.generate.md` | Code Generation Prompts |
| design pattern, factory, observer, strategy, repository, singleton, dependency injection, pattern implementation | `prompt/code/code.patterns.md` | Software Design Pattern Prompts |
| refactor, clean up, improve code, restructure, extract function, dry, solid | `prompt/code/code.refactor.md` | Code Refactoring Prompts |
| test, unit test, write tests, jest, vitest, mock, test coverage, test suite | `prompt/code/code.testing.md` | Test Writing Prompts |
| typescript, types, generics, interface, type safety, infer, conditional type, utility type | `prompt/code/code.typescript.md` | TypeScript Type System Prompts |

### prompt/database

| Keywords | File | Use When |
|----------|------|----------|
| database design, schema, data model, entity, relationship, normalization, postgres, SQL | `prompt/database/database.design.md` | Database Design Prompts |
| migration, schema migration, zero downtime, rollback, alter table, add column, rename, seed data | `prompt/database/database.migration.md` | Database Migration Prompts |
| database optimization, slow query, EXPLAIN, index tuning, vacuum, statistics, connection pool, query plan | `prompt/database/database.optimization.md` | Database Performance Optimization Prompts |
| SQL query, complex query, aggregate, window function, CTE, subquery, join, optimize query | `prompt/database/database.query.md` | Database Query Writing Prompts |
| full text search, search, postgres search, tsvector, tsquery, fuzzy search, search ranking, search index | `prompt/database/database.search.md` | Database Search Prompts |

### prompt/debug

| Keywords | File | Use When |
|----------|------|----------|
| debug, bug, diagnose, error, exception, crash, root cause, investigate | `prompt/debug/debug.diagnose.md` | Bug Diagnosis Prompts |
| logs, log analysis, error log, stack trace, crash report, server log, parse log | `prompt/debug/debug.logs.md` | Log Analysis Prompts |
| memory leak, memory usage, heap, garbage collection, leak detection, profiling, browser memory | `prompt/debug/debug.memory.md` | Memory Leak Detection Prompts |
| network, CORS, HTTP, request, response, API call, 401, 403, timeout, fetch error, websocket | `prompt/debug/debug.network.md` | Network & API Debug Prompts |
| reproduce bug, minimal reproduction, isolate, test case, repro steps, edge case isolation | `prompt/debug/debug.reproduce.md` | Bug Reproduction & Isolation Prompts |

### prompt/design

| Keywords | File | Use When |
|----------|------|----------|
| animation design, motion design, micro animation, transition, scroll animation, interaction animation | `prompt/design/design.animation.md` | Animation & Motion Design Prompts |
| component design, UI component, card, table, form, navigation, modal, dropdown, design pattern | `prompt/design/design.component.md` | UI Component Design Prompts |
| copywriting, UI copy, microcopy, button text, error message, onboarding copy, tone of voice | `prompt/design/design.copywriting.md` | UI Copywriting Prompts |
| design system, UI design, component library, design tokens, style guide, figma to code | `prompt/design/design.system.md` | UI/UX Design System Prompts |
| UX design, user experience, wireframe, user flow, interaction design, usability, prototype | `prompt/design/design.ux.md` | UX Design Prompts |

### prompt/performance

| Keywords | File | Use When |
|----------|------|----------|
| profiling, performance analysis, bottleneck, flame graph, CPU profile, memory profile, benchmark | `prompt/performance/performance.analysis.md` | Performance Analysis & Profiling Prompts |
| backend performance, API latency, throughput, Node.js performance, profiling, bottleneck, async | `prompt/performance/performance.backend.md` | Backend Performance Prompts |
| database performance, slow query, N+1, index, query optimization, EXPLAIN, postgres tuning | `prompt/performance/performance.database.md` | Database Performance Prompts |
| performance, frontend performance, Core Web Vitals, LCP, CLS, FID, bundle size, lighthouse | `prompt/performance/performance.frontend.md` | Frontend Performance Prompts |
| monitoring, observability, metrics, alerting, logging, tracing, APM, OpenTelemetry | `prompt/performance/performance.monitoring.md` | Performance Monitoring & Observability Prompts |

### prompt/planning

| Keywords | File | Use When |
|----------|------|----------|
| task breakdown, work breakdown, subtask, decompose, implementation plan, step by step, todo list | `prompt/planning/planning.breakdown.md` | Task Breakdown & Implementation Planning Prompts |
| communication, technical writing, stakeholder update, PR description, incident report, documentation writing | `prompt/planning/planning.communication.md` | Technical Communication Prompts |
| decision making, tech stack, build vs buy, tradeoff analysis, options comparison, choose technology | `prompt/planning/planning.decisions.md` | Technical Decision Making Prompts |
| project planning, roadmap, MVP, scope, requirements, kickoff, product plan | `prompt/planning/planning.project.md` | Project Planning Prompts |
| release, launch, deployment plan, rollout, go-live, release checklist, post-launch | `prompt/planning/planning.release.md` | Release & Launch Planning Prompts |

### prompt/review

| Keywords | File | Use When |
|----------|------|----------|
| architecture review, system design review, technical debt, coupling, scalability, design decision audit | `prompt/review/review.architecture.md` | Architecture Review Prompts |
| code review, PR review, audit, quality check, feedback, correctness, readability | `prompt/review/review.code.md` | Code Review Prompts |
| database review, schema review, query review, index audit, migration review, data model | `prompt/review/review.database.md` | Database Schema & Query Review Prompts |
| security review, vulnerability, pentest, audit, threat model, OWASP, injection, auth bypass | `prompt/review/review.security.md` | Security Review Prompts |
| UX review, UI review, usability, accessibility, design review, user flow, feedback | `prompt/review/review.ux.md` | UX & UI Review Prompts |

### prompt/security

| Keywords | File | Use When |
|----------|------|----------|
| security audit, vulnerability scan, penetration test, OWASP, threat model, attack surface, CVE | `prompt/security/security.audit.md` | Security Audit & Threat Modeling Prompts |
| security, authentication, authorization, JWT, OAuth, RBAC, session, password, security audit | `prompt/security/security.auth.md` | Security Implementation Prompts |
| encryption, AES, RSA, hashing, crypto, key management, data encryption, end-to-end | `prompt/security/security.encryption.md` | Encryption & Cryptography Prompts |
| security monitoring, audit log, anomaly detection, intrusion detection, alerting, SIEM, log analysis | `prompt/security/security.monitoring.md` | Security Monitoring Prompts |
| penetration test, pentest, security testing, attack simulation, BURP, XSS test, SQL injection test | `prompt/security/security.pentest.md` | Security Testing & Penetration Test Prompts |


<!-- END AUTO-GENERATED -->
