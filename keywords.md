# Effikit Keywords Index
> Keyword → file mapping engine. Scan this to find the right file fast.
> Format: keywords | file path | one-line description

---

## CRAFT — TypeScript Code Libraries

### UI
| Keywords | File | Description |
|----------|------|-------------|
| card, modal, dialog, input, dropdown, button, badge, avatar, tooltip, popover, react component | `craft/ui/ui.components.ts` | Ready-made React UI components |
| grid, flex, layout, container, responsive, breakpoint, column, row, sidebar, wrapper | `craft/ui/ui.layout.ts` | Grid system and responsive layout utilities |
| color, token, theme, typography, font, spacing, radius, shadow, palette, design system | `craft/ui/ui.tokens.ts` | Design tokens: colors, typography, spacing scales |

### UX
| Keywords | File | Description |
|----------|------|-------------|
| drag, drop, gesture, swipe, click, touch, pointer, interaction, dnd | `craft/ux/ux.interaction.ts` | Gesture, drag-drop, click and touch interaction systems |
| loading, skeleton, spinner, error state, success, toast, feedback, empty state | `craft/ux/ux.feedback.ts` | Loading, skeleton, error and success state management |
| aria, keyboard nav, screen reader, focus trap, tab order, accessibility, a11y | `craft/ux/ux.accessibility.ts` | ARIA roles, keyboard navigation, screen reader support |

### Hooks
| Keywords | File | Description |
|----------|------|-------------|
| useState, useReducer, state machine, zustand, context, global state, atom | `craft/hooks/hooks.state.ts` | Advanced state management hooks |
| fetch, useQuery, useSWR, loading, retry, abort, async hook | `craft/hooks/hooks.async.ts` | Async fetch, loading, error, retry hooks |
| useEffect, mount, unmount, resize, intersection, observer, scroll, debounce | `craft/hooks/hooks.lifecycle.ts` | Mount, unmount, resize, intersection observer hooks |

### API
| Keywords | File | Description |
|----------|------|-------------|
| axios, fetch, http, request, header, timeout, interceptor, middleware, api client | `craft/api/api.request.ts` | HTTP request management with headers, timeout, interceptors |
| error handling, api error, 4xx, 5xx, error boundary, classify, catch | `craft/api/api.error.ts` | API error catching, classification and management |
| cache, stale, revalidate, ttl, invalidate, cache-first, network-first | `craft/api/api.cache.ts` | Response caching with stale-while-revalidate strategy |

### Database
| Keywords | File | Description |
|----------|------|-------------|
| query, sql, select, where, join, filter, param, builder, prepared statement | `craft/db/db.query.ts` | Query builder with parameter management and optimization |
| schema, model, table, type, zod, prisma, drizzle, field, column, relation | `craft/db/db.schema.ts` | Table/model definitions with full type safety |
| migration, seed, rollback, version, alter, up, down, changelog | `craft/db/db.migration.ts` | Migration system with versioning and rollback support |

### Auth
| Keywords | File | Description |
|----------|------|-------------|
| session, cookie, refresh token, expire, logout, next-auth, session storage | `craft/auth/auth.session.ts` | Session lifecycle, refresh, expiry management |
| jwt, token, sign, verify, decode, payload, secret, bearer, encode | `craft/auth/auth.token.ts` | JWT creation, signing, verification and decoding |
| rbac, role, permission, policy, can, cannot, guard, acl, access control | `craft/auth/auth.permission.ts` | Role-based access control and policy engine |

### Animation
| Keywords | File | Description |
|----------|------|-------------|
| page transition, route animation, enter, exit, fade, slide, mount animation | `craft/animation/animation.transition.ts` | Page and component transition animations |
| hover, micro interaction, button animation, focus animation, ripple | `craft/animation/animation.micro.ts` | Hover, click, focus micro-interaction effects |
| scroll animation, parallax, reveal on scroll, sticky, progress | `craft/animation/animation.scroll.ts` | Scroll-based animations and parallax systems |

### Media
| Keywords | File | Description |
|----------|------|-------------|
| image loading, lazy load, progressive image, blur hash, responsive image, srcset, WebP, AVIF, CLS prevention, aspect ratio, image preloader | `craft/media/media.image.ts` | Progressive loading, lazy images, responsive srcset, CLS prevention |
| video player, autoplay, IntersectionObserver autoplay, bandwidth detection, picture-in-picture, video progress, buffered ranges, iOS video, mobile video | `craft/media/media.video.ts` | Full video player, scroll autoplay, PiP, bandwidth quality switching |
| Web Audio API, AudioContext, audio visualizer, AnalyserNode, spatial audio, PannerNode, AudioWorklet, microphone recorder, SoundBoard, crossfade | `craft/media/media.audio.ts` | AudioContext lifecycle, visualizer, recorder, spatial audio, worklets |

---

## MIND — Algorithm Libraries

### Recommendation
| Keywords | File | Description |
|----------|------|-------------|
| collaborative filtering, user-based, item-based, recommend, similar users | `mind/recommendation/recommendation.engine.ts` | Collaborative and content-based recommendation engine |
| score, weight, multi-criteria, ranking score, rate, relevance | `mind/recommendation/recommendation.scoring.ts` | Weighted scoring and multi-criteria decision system |
| filter output, diversity, deduplication, rule engine, blacklist | `mind/recommendation/recommendation.filter.ts` | Rule-based output filtering and diversity balancing |

### Discovery
| Keywords | File | Description |
|----------|------|-------------|
| feed, content stream, pagination, cursor, infinite scroll | `mind/discovery/discovery.feed.ts` | Content feed management with sorting and pagination |
| multi-factor ranking, boost, surface, promote, trending | `mind/discovery/discovery.ranking.ts` | Multi-factor content ranking and promotion system |
| diversity, novelty, dedup, avoid repetition, content mix | `mind/discovery/discovery.diversity.ts` | Repetition prevention and content diversity balancing |

### Decision
| Keywords | File | Description |
|----------|------|-------------|
| decision tree, if-else logic, traversal, node, branch, leaf | `mind/decision/decision.tree.ts` | Decision tree structure and traversal algorithm |
| weighted priority, multi-criteria, AHP, score decision | `mind/decision/decision.weight.ts` | Weighted priority and multi-criteria decision system |
| fallback, alternative, retry, backup plan, graceful degradation | `mind/decision/decision.fallback.ts` | Fallback path and graceful degradation manager |

### Optimization
| Keywords | File | Description |
|----------|------|-------------|
| genetic algorithm, simulated annealing, gradient descent, minimize, maximize | `mind/optimization/optimization.algorithm.ts` | Genetic algorithm, SA, and gradient descent implementations |
| memoize, cache computation, dynamic programming, expensive call | `mind/optimization/optimization.cache.ts` | Computation memoization and caching strategies |
| benchmark, profile, measure, compare, ops/sec, performance test | `mind/optimization/optimization.benchmark.ts` | Performance measurement and benchmarking tools |

### Ranking
| Keywords | File | Description |
|----------|------|-------------|
| elo, trueskill, bayesian, rating, leaderboard, skill rating | `mind/ranking/ranking.score.ts` | ELO, TrueSkill, Bayesian average score calculation |
| decay, time-based, freshness, recency, age, half-life, score decay | `mind/ranking/ranking.decay.ts` | Time-based score decay and freshness mechanism |
| boost, promote, pin, sticky, priority override, manual rank | `mind/ranking/ranking.boost.ts` | Boost rules and priority override engine |

### Search
| Keywords | File | Description |
|----------|------|-------------|
| query parse, tokenize, normalize, stop words, stemming | `mind/search/search.query.ts` | Query parsing, tokenization and normalization |
| fuzzy search, levenshtein, jaro-winkler, typo tolerance, approximate match | `mind/search/search.fuzzy.ts` | Fuzzy matching with Levenshtein and Jaro-Winkler |
| inverted index, full text search, tfidf, term frequency, search index | `mind/search/search.index.ts` | Inverted index structure and fast text search |

### Personalization
| Keywords | File | Description |
|----------|------|-------------|
| user profile, preference, taste, build profile, update profile | `mind/personalization/personalization.profile.ts` | User profile construction and update system |
| behavior tracking, click, view, dwell time, event, pattern | `mind/personalization/personalization.behavior.ts` | Behavior tracking and pattern analysis |
| adapt, dynamic content, learn, adjust, personalize, tailor | `mind/personalization/personalization.adapt.ts` | Dynamic content adaptation and learning system |

### Realtime
| Keywords | File | Description |
|----------|------|-------------|
| websocket, socket, live, sync, broadcast, subscribe, realtime | `mind/realtime/realtime.sync.ts` | WebSocket-based real-time synchronization |
| queue, job, task queue, priority queue, retry, backoff, worker | `mind/realtime/realtime.queue.ts` | Job queue with priority and retry management |
| conflict, merge, crdt, operational transform, concurrent edit | `mind/realtime/realtime.conflict.ts` | Conflict detection, resolution and merge strategies |

### Graph
| Keywords | File | Description |
|----------|------|-------------|
| relation, edge, node, directed, undirected, graph, adjacency | `mind/graph/graph.relation.ts` | Relation graph definition with directed/undirected support |
| bfs, dfs, dijkstra, shortest path, traverse, walk, explore | `mind/graph/graph.traverse.ts` | BFS, DFS, Dijkstra pathfinding algorithms |
| cluster, community detection, group, louvain, connected components | `mind/graph/graph.cluster.ts` | Community detection and clustering algorithms |

### Caching
| Keywords | File | Description |
|----------|------|-------------|
| lru, lfu, ttl, eviction, cache strategy, least recently used | `mind/caching/caching.strategy.ts` | LRU, LFU, TTL-based caching algorithm implementations |
| cache invalidation, dependency, purge, tag-based, bust cache | `mind/caching/caching.invalidation.ts` | Cache invalidation rules and dependency management |
| multi-layer cache, l1, l2, memory cache, redis, cache hierarchy | `mind/caching/caching.layer.ts` | Multi-layer cache architecture and management |

### Security
| Keywords | File | Description |
|----------|------|-------------|
| aes, rsa, encrypt, decrypt, cipher, key, iv, crypto | `mind/security/security.encrypt.ts` | AES and RSA encryption/decryption implementations |
| validate, sanitize, xss, sql injection, input, parse safe | `mind/security/security.validate.ts` | Input validation, sanitization and safe parsing |
| audit log, trail, anomaly, detect, monitor, suspicious | `mind/security/security.audit.ts` | Audit trail, anomaly detection and logging system |

### AI
| Keywords | File | Description |
|----------|------|-------------|
| prompt template, chain, few-shot, system prompt, prompt builder | `mind/ai/ai.prompt.ts` | Prompt engineering, template and chain management |
| context window, summarize, memory, long context, truncate | `mind/ai/ai.context.ts` | Context window management and memory system |
| ai pipeline, parallel ai, chain models, workflow, streaming | `mind/ai/ai.pipeline.ts` | AI workflow, parallel processing and chaining system |

---

## SKILLS — AI Behavior Directives

| Keywords | Folder |
|----------|--------|
| react, component, jsx, tsx, styling, css, tailwind, state management | `skills/frontend/` |
| node, express, fastify, server, architecture, service, pattern | `skills/backend/` |
| rest, graphql, endpoint, route, validation, openapi, swagger | `skills/api/` |
| schema design, query optimization, index, normalization, orm | `skills/database/` |
| debug, bug, error, log, stack trace, reproduce, breakpoint | `skills/debugging/` |
| security, vulnerability, owasp, xss, csrf, auth security | `skills/security/` |
| test, unit test, integration test, e2e, jest, vitest, coverage | `skills/testing/` |
| refactor, clean code, dry, solid, rename, extract, simplify | `skills/refactoring/` |
| design system, ui design, color theory, spacing, typography | `skills/design/` |
| ai, llm, claude, openai, prompt engineering, embeddings | `skills/ai/` |
| ci/cd, docker, deploy, pipeline, github actions, monitoring | `skills/devops/` |
| code review, pr review, feedback, checklist, standards | `skills/code-review/` |
| docs, documentation, readme, jsdoc, changelog, comment | `skills/documentation/` |
| architecture, system design, microservice, monolith, event-driven | `skills/architecture/` |
| performance, optimize, speed, lighthouse, profiling, bundle | `skills/performance/` |
| accessibility, wcag, aria, keyboard, screen reader | `skills/accessibility/` |
| creative, brainstorm, ideate, edison, disney, shakespeare, dali | `skills/creativity/` |
| art, artistic, da vinci, beethoven, picasso, michelangelo | `skills/art/` |
| science, physics, einstein, newton, feynman, tesla | `skills/science/` |
| productivity, focus, speed, workflow, efficiency, boost | `skills/performance-boost/` |
| image, video, audio, lazy loading, blur hash, WebP, AVIF, srcset, media optimization, Core Web Vitals, LCP | `skills/media/` |
| copywriting, AIDA, headline, CTA, positioning, growth loops, storytelling, viral coefficient, brand story | `skills/marketing/` |
| code critic, antipatterns, refactor, strangler fig, coding standards, code review surgery | `skills/code-critic/` |
| first principles, socratic method, logical fallacies, debiasing, pre-mortem, cognitive bias, reasoning | `skills/reasoning/` |
| TypeScript advanced, conditional types, infer, branded types, discriminated unions, ts-morph, tsc performance | `skills/typescript-expert/` |
| strategy, Porter's five forces, network effects, growth model, positioning category, CEO, moat | `skills/ceo/` |

---

## BRIDGE — External Service Guides

| Keywords | Folder |
|----------|--------|
| github, repo, branch, pull request, issue, actions, git | `bridge/github/` |
| vercel, deploy, preview, domain, env var, serverless | `bridge/vercel/` |
| supabase, postgres, rls, storage, realtime, supabase auth | `bridge/supabase/` |
| figma, design, tokens, component export, style | `bridge/figma/` |
| three.js, threjs, 3d, webgl, scene, mesh, geometry, physics | `bridge/threjs/` |
| framer motion, framermotion, animate, motion, spring | `bridge/framermotion/` |
| wolfram, wolframalpha, math, equation, physics, calculate | `bridge/wolframalpha/` |
| shadcn, shadcn/ui, radix, component library, theming | `bridge/shadcn/` |
| gsap, timeline, scrolltrigger, tween, greensock | `bridge/gsap/` |

---

## PROMPT — Template Files

| Keywords | Folder |
|----------|--------|
| generate code, write code, implement feature, code prompt | `prompt/code/` |
| debug prompt, find bug, error analysis, fix issue | `prompt/debug/` |
| review code, audit, quality check, security review prompt | `prompt/review/` |
| architect, system design, diagram, adr, decision | `prompt/architecture/` |
| plan, sprint, roadmap, task breakdown, estimate | `prompt/planning/` |
| database prompt, schema, query, migration prompt | `prompt/database/` |
| security audit, pentest prompt, vulnerability, threat model | `prompt/security/` |
| performance prompt, slow, optimize, profiling | `prompt/performance/` |
| ui design prompt, wireframe, component design | `prompt/design/` |
| ai prompt, llm integration, pipeline prompt | `prompt/ai/` |

---

<!-- AUTO-GENERATED: sync.ts -->

## CRAFT — Auto-Generated Index

> Generated by sync.ts on 2026-05-31

### craft/animation

| Keywords | File | Use When |
|----------|------|----------|
| hover, micro interaction, button animation, focus animation, ripple, spring, bounce, magnetic | `craft/animation/animation.micro.ts` | Adding tactile feel to buttons, inputs, cards — hover lifts, click feedback, focus rings, ripples |
| scroll animation, parallax, reveal on scroll, sticky, progress, intersection, scroll-driven | `craft/animation/animation.scroll.ts` | Animating elements based on scroll position: reveals, parallax, progress indicators, sticky headers |
| page transition, route animation, enter, exit, fade, slide, mount animation, framer, css transition | `craft/animation/animation.transition.ts` | Animating page changes, component mount/unmount, modal open/close, or route transitions |

### craft/api

| Keywords | File | Use When |
|----------|------|----------|
| cache, stale, revalidate, ttl, invalidate, cache-first, network-first, swr, request cache | `craft/api/api.cache.ts` | Caching API responses to reduce network requests, implementing stale-while-revalidate, or offline-first patterns |
| error handling, api error, 4xx, 5xx, error boundary, classify, catch, normalize, error map | `craft/api/api.error.ts` | Normalizing and classifying HTTP errors, mapping status codes to user messages, building error boundaries |
| axios, fetch, http, request, header, timeout, interceptor, middleware, api client, retry, base url | `craft/api/api.request.ts` | Building a typed HTTP client layer with interceptors, timeout, auth headers, and retry logic |

### craft/auth

| Keywords | File | Use When |
|----------|------|----------|
| rbac, role, permission, policy, can, cannot, guard, acl, access control, authorization | `craft/auth/auth.permission.ts` | Implementing role-based access control, feature flags per role, or resource-level authorization |
| session, cookie, refresh token, expire, logout, next-auth, session storage, persist session | `craft/auth/auth.session.ts` | Managing user sessions: storing, refreshing, validating, and clearing authentication state |
| jwt, token, sign, verify, decode, payload, secret, bearer, encode, refresh token, claims | `craft/auth/auth.token.ts` | Creating, signing, verifying, and decoding JWT tokens; managing token rotation |

### craft/db

| Keywords | File | Use When |
|----------|------|----------|
| migration, seed, rollback, version, alter, up, down, changelog, database version | `craft/db/db.migration.ts` | Running schema migrations in order, tracking applied migrations, and rolling back failed ones |
| query, sql, select, where, join, filter, param, builder, prepared statement, dynamic query | `craft/db/db.query.ts` | Building dynamic SQL queries with type safety, parameter binding, and query composition |
| schema, model, table, type, zod, prisma, drizzle, field, column, relation, validation | `craft/db/db.schema.ts` | Defining typed database models, runtime validation schemas, and table column definitions |

### craft/hooks

| Keywords | File | Use When |
|----------|------|----------|
| fetch, useQuery, useSWR, loading, retry, abort, async hook, data fetching, polling, mutation | `craft/hooks/hooks.async.ts` | Fetching data from APIs with loading/error/retry states, polling, or optimistic mutations |
| useEffect, mount, unmount, resize, intersection, observer, scroll, debounce, throttle, event listener | `craft/hooks/hooks.lifecycle.ts` | Responding to DOM events, viewport changes, element visibility, or managing effect cleanup |
| useState, useReducer, state machine, zustand, context, global state, atom, immer, history, undo | `craft/hooks/hooks.state.ts` | You need advanced state patterns: state machines, undo/redo, derived state, shared atoms |

### craft/media

| Keywords | File | Use When |
|----------|------|----------|
| Web Audio API, AudioContext, audio player, audio visualizer, AnalyserNode, spatial audio, PannerNode, AudioWorklet, MediaRecorder, audio recorder, microphone, crossfade, waveform, frequency data, SoundBoard, mobile audio | `craft/media/media.audio.ts` | Web Audio API: visualizers, players with crossfade, spatial audio, real-time microphone processing, audio worklets, or multi-sound boards |
| image loading, lazy load, progressive image, blur hash, responsive image, srcset, WebP, AVIF, CLS prevention, aspect ratio, image preloader, bandwidth-aware, IntersectionObserver, placeholder | `craft/media/media.image.ts` | Loading images with performance constraints: lazy load, blur-up placeholders, responsive srcset, format detection, CLS prevention |
| video player, autoplay, IntersectionObserver, bandwidth detection, picture-in-picture, video progress, buffered ranges, NetworkInformation, prefers-reduced-motion, iOS Safari, mobile video, preload strategy, HLS, video chapters | `craft/media/media.video.ts` | Any video that needs autoplay on scroll, bandwidth-aware quality, PiP toggle, buffered progress, or iOS inline playback |

### craft/ui

| Keywords | File | Use When |
|----------|------|----------|
| card, modal, dialog, input, dropdown, button, badge, avatar, tooltip, popover, react component, ui | `craft/ui/ui.components.ts` | You need ready-made, accessible React components: cards, modals, inputs, dropdowns, badges |
| grid, flex, layout, container, responsive, breakpoint, column, row, sidebar, wrapper, stack | `craft/ui/ui.layout.ts` | Building page structure, responsive grids, container widths, or flex/stack layouts |
| color, token, theme, typography, font, spacing, radius, shadow, palette, design system, design tokens | `craft/ui/ui.tokens.ts` | You need consistent design values across the app: colors, spacing scale, font sizes, shadows |

### craft/ux

| Keywords | File | Use When |
|----------|------|----------|
| aria, keyboard nav, screen reader, focus trap, tab order, accessibility, a11y, wcag, focus management | `craft/ux/ux.accessibility.ts` | Building accessible modals, menus, comboboxes, or any interactive UI that must work for keyboard/screen reader users |
| loading, skeleton, spinner, error state, success, toast, feedback, empty state, progress | `craft/ux/ux.feedback.ts` | Communicating async state to users: loading indicators, skeletons, toasts, empty states |
| drag, drop, gesture, swipe, click, touch, pointer, interaction, dnd, long press, pan | `craft/ux/ux.interaction.ts` | Building drag-and-drop lists, swipe gestures, long-press actions, or touch-friendly interactions |


## MIND — Auto-Generated Index

> Generated by sync.ts on 2026-05-31

### mind/ai

| Keywords | File | Use When |
|----------|------|----------|
| context window, token budget, conversation memory, summarization, sliding window, RAG context | `mind/ai/ai.context.ts` | Managing AI conversation context: token budgeting, memory compression, RAG document injection |
| AI pipeline, workflow, parallel, sequential, map-reduce, agent, tool use, orchestration | `mind/ai/ai.pipeline.ts` | Orchestrating multi-step AI workflows: parallel calls, sequential chains, map-reduce over documents |
| prompt engineering, template, chain, few-shot, system prompt, instruction, Claude, GPT | `mind/ai/ai.prompt.ts` | Building reusable, composable prompt templates with variable interpolation and chain management |

### mind/caching

| Keywords | File | Use When |
|----------|------|----------|
| cache invalidation, dependency tracking, tag-based invalidation, versioning, purge, stale | `mind/caching/caching.invalidation.ts` | Invalidating related cache entries when underlying data changes, using tags or dependencies |
| multi-layer cache, L1 L2 cache, write-through, write-back, read-through, cache hierarchy | `mind/caching/caching.layer.ts` | Building a multi-tier cache (L1 in-memory + L2 Redis/file) with consistent read/write policies |
| LRU, LFU, TTL, cache eviction, in-memory cache, FIFO, ARC, cache policy | `mind/caching/caching.strategy.ts` | Implementing in-memory caches with eviction policies: LRU, LFU, TTL, or hybrid |

### mind/decision

| Keywords | File | Use When |
|----------|------|----------|
| fallback, circuit breaker, retry, alternative path, degraded mode, resilience, backup strategy | `mind/decision/decision.fallback.ts` | Building resilient systems that need graceful degradation when primary paths fail |
| decision tree, traversal, rule tree, branching logic, if-else tree, classification | `mind/decision/decision.tree.ts` | Building configurable branching logic trees for routing, classification, or rule evaluation |
| weighted decision, priority, AHP, analytic hierarchy process, multi-criteria, pairwise comparison | `mind/decision/decision.weight.ts` | Ranking or selecting among alternatives using weighted criteria and priority scoring |

### mind/discovery

| Keywords | File | Use When |
|----------|------|----------|
| diversity, deduplication, MMR, maximal marginal relevance, category balance, novelty, serendipity | `mind/discovery/discovery.diversity.ts` | Preventing echo chambers and category flooding in feeds; injecting novelty into ranked lists |
| feed, content stream, pagination, cursor, infinite scroll, timeline, content ordering | `mind/discovery/discovery.feed.ts` | Building a paginated or cursor-based content feed with sorting and filtering |
| ranking, multi-factor, boost, decay, freshness, engagement, wilson score, bayesian | `mind/discovery/discovery.ranking.ts` | Building a multi-factor content ranking system with freshness decay, engagement signals and boosts |

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
| memoization, cache, computation cache, lazy evaluation, trie cache, dependency tracking | `mind/optimization/optimization.cache.ts` | Caching expensive pure function results to avoid redundant computation |

### mind/personalization

| Keywords | File | Use When |
|----------|------|----------|
| adaptive content, dynamic adaptation, layout personalization, contextual rendering, user-driven UI | `mind/personalization/personalization.adapt.ts` | Dynamically adapting content, layout, or feature visibility based on user profile and context |
| behavior tracking, user pattern, session analysis, engagement sequence, behavioral signal | `mind/personalization/personalization.behavior.ts` | Tracking and analyzing user behavior patterns: sessions, sequences, engagement rhythm |
| user profile, interest model, preference learning, taste graph, user representation | `mind/personalization/personalization.profile.ts` | Building and maintaining a dynamic user interest profile from interaction signals |

### mind/ranking

| Keywords | File | Use When |
|----------|------|----------|
| boost, promote, pinning, sponsored, priority, score boost, manual override | `mind/ranking/ranking.boost.ts` | Applying business rules, editorial picks, sponsored content, or A/B test boosts to a ranked list |
| time decay, score decay, freshness, half-life, exponential decay, temporal ranking | `mind/ranking/ranking.decay.ts` | Scores need to decrease over time: trending content, hot posts, activity scores |
| ELO, TrueSkill, Bayesian rating, ranking score, competitive rating, skill estimation | `mind/ranking/ranking.score.ts` | Building competitive ranking systems: leaderboards, matchmaking, content quality rating |

### mind/realtime

| Keywords | File | Use When |
|----------|------|----------|
| conflict resolution, CRDT, operational transform, merge, concurrent edit, last-write-wins | `mind/realtime/realtime.conflict.ts` | Resolving concurrent edits in collaborative systems: shared documents, forms, state |
| queue, job queue, priority queue, retry, dead letter, task scheduling, worker | `mind/realtime/realtime.queue.ts` | Building an in-process job queue with priorities, retries, and concurrency control |
| WebSocket, real-time sync, presence, live updates, channel, pub-sub, broadcast | `mind/realtime/realtime.sync.ts` | Building real-time collaboration, live feeds, or presence systems over WebSocket |

### mind/recommendation

| Keywords | File | Use When |
|----------|------|----------|
| recommendation, collaborative filtering, content-based, cosine similarity, user-item matrix, hybrid engine | `mind/recommendation/recommendation.engine.ts` | Building a recommendation system that suggests items to users based on behavior and preferences |
| filter, rule engine, output filtering, diversity, deduplication, blacklist, post-processing | `mind/recommendation/recommendation.filter.ts` | Post-processing recommendation results: dedup, diversity enforcement, business rules, blacklists |
| scoring, weighted score, multi-criteria, normalization, ranking score, utility function | `mind/recommendation/recommendation.scoring.ts` | You need to combine multiple signals (relevance, recency, popularity, quality) into a single score |

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
| input validation, sanitization, XSS prevention, SQL injection, schema validation, content security | `mind/security/security.validate.ts` | Validating and sanitizing user input at system boundaries to prevent injection attacks |


## BRIDGE — Auto-Generated Index

> Generated by sync.ts on 2026-05-31

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

> Generated by sync.ts on 2026-05-31

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
