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
