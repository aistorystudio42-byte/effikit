# Effikit — Execution Plan
> Each step is self-contained. Start a new conversation, paste the step number, done.
> When a step is complete, mark it ✅ and commit plan.md.

---

## Step 1 — 6 New Skill Folders ✅

**Goal:** Add 6 new skill folders to skills/ directory.

**Context:**
- Effikit repo: https://github.com/aistorystudio42-byte/effikit
- skills/ already has 20 folders with 4 .md files each
- New folders follow the exact same quality standard
- All files in English, report back in Turkish

**Quality Standards:**
- Every .md file starts with <!-- @keywords: ... --> tag (8-15 terms)
- Genuinely actionable — Claude must follow instructions directly
- Real working examples — no placeholders
- Decisive language — no "maybe", "sometimes", "you could"
- Opinionated — clear stance, not "it depends"
- 400-800 words per file — dense, no padding
- Format: Core Philosophy → When to Activate → Principles → 
  Decision Framework → Anti-Patterns → Example in Action

**Files to create:**

skills/media/
- media.image.md → Images as performance-critical assets.
  Cover: lazy loading, blur hash placeholder, WebP/AVIF detection,
  responsive srcset, CLS prevention, progressive loading decision matrix.
  Example: Production-grade responsive image system with blur placeholder.

- media.video.md → Video that loads fast without destroying UX.
  Cover: intersection-based autoplay, bandwidth detection,
  preload strategy, picture-in-picture, poster image best practices.
  Example: Hero video section that doesn't tank Core Web Vitals.

- media.audio.md → Web Audio API as precision instrument.
  Cover: AudioContext lifecycle, user gesture requirement,
  audio visualizer with AnalyserNode, spatial audio, mobile quirks.
  Example: Real-time audio visualizer responding to microphone input.

- media.optimization.md → Media as the #1 performance killer.
  Cover: Core Web Vitals impact, media budget concept,
  build-time vs runtime optimization, SVG pipeline, video compression.
  Example: Fix a media-heavy page from Lighthouse 40 to 90+.

skills/marketing/
- marketing.copywriting.md → Words that make people act, not just read.
  Cover: AIDA framework, specificity over vagueness, power words,
  CTA hierarchy, scarcity without lying, inverted pyramid.
  Example: Rewrite weak developer tool headline into 3 converting variants.

- marketing.positioning.md → Own a category, not just a feature.
  Cover: Category design vs entry, positioning statement formula,
  competitive moat, messaging hierarchy, feature-first positioning danger.
  Example: Position Effikit against ChatGPT and Cursor AI.

- marketing.growth.md → Growth loops, not growth hacks.
  Cover: Viral coefficient math, retention as foundation,
  PLG mechanics, activation moment, north star metric selection.
  Example: Complete growth loop for open-source developer toolkit.

- marketing.storytelling.md → Story is the most efficient trust algorithm.
  Cover: Hero's journey for products, problem-first framing,
  enemy narrative, founder story structure, before/after/bridge.
  Example: Complete product origin story that builds immediate trust.

skills/code-critic/
- critic.review.md → Code review as surgery — precise, never personal.
  Cover: 5 levels of code quality, review priority order,
  feedback that gets implemented, blocking vs non-blocking issues.
  Example: Full annotated review of React component with 8 issues.

- critic.antipatterns.md → Code that will hurt you in 6 months.
  Cover: 10 most dangerous TypeScript antipatterns with before/after,
  premature abstraction detection, clever vs boring code.
  Example: Identify and fix 3 critical antipatterns in realistic snippet.

- critic.refactor.md → Continuous surgery, not big-bang rewrites.
  Cover: Strangler fig pattern, refactor without breaking tests,
  naming as first refactor, when to rewrite vs refactor matrix.
  Example: Refactor 80-line function into composable pieces step by step.

- critic.standards.md → Standards a team actually follows.
  Cover: Standard categories, automated vs manual enforcement,
  living documentation, RFC process for standard changes.
  Example: TypeScript coding standard a 5-person team would adopt.

skills/reasoning/
- reasoning.firstprinciples.md → Decompose to truth, rebuild from atoms.
  Cover: 5-step decomposition, assumption inventory, why ladder,
  analogy rejection, rebuilding from constraints.
  Example: First principles applied to monolith vs microservices.

- reasoning.socratic.md → Questions are more powerful than answers.
  Cover: Socratic question taxonomy, self-directed questioning,
  when to stop and commit, productive doubt vs paralysis.
  Example: Full Socratic interrogation of a technical rewrite decision.

- reasoning.logical.md → Build airtight arguments, detect broken ones.
  Cover: Deductive/inductive/abductive in software context,
  12 logical fallacies in tech debates, steelmanning, argument mapping.
  Example: Analyze "we should use microservices because Netflix does".

- reasoning.debiasing.md → Your brain lies about your code.
  Cover: 8 cognitive biases dangerous in software engineering,
  debiasing technique per bias, pre-mortem analysis, red team thinking.
  Example: Full pre-mortem on a major architectural decision.

skills/typescript-expert/
- typescript.advanced.md → Type system as a proof system.
  Cover: Conditional types with infer, mapped types, template literals,
  phantom types, branded types, variance in practice.
  Example: Fully type-safe API client using advanced generics.

- typescript.patterns.md → Design patterns for TypeScript's type system.
  Cover: Discriminated unions as state machines, builder pattern,
  opaque types, exhaustive checking with never, result types.
  Example: Complete payment system domain modeled in TypeScript.

- typescript.compiler.md → TypeScript compiler as programmable tool.
  Cover: ts-morph for AST manipulation, custom transformers,
  language service plugins, programmatic type checking.
  Example: Transformer that automatically adds exhaustive null checks.

- typescript.performance.md → When TypeScript becomes your bottleneck.
  Cover: Instantiation depth limits, combinatorial explosion prevention,
  interface vs type alias performance, project references.
  Example: 45-second compile time fixed to under 8 seconds.

skills/ceo/
- ceo.strategy.md → Strategy is what you say NO to.
  Cover: 3 levels of strategy, Porter's 5 forces for software,
  moat identification, strategic narrative framework.
  Example: Complete strategic narrative for developer productivity tool.

- ceo.networkeffect.md → Network effects are engineered, not wished for.
  Cover: 13 types of network effects, cold start solutions,
  viral loops vs network effects distinction, designing from day one.
  Example: Design network effects into open-source developer toolkit.

- ceo.growth.md → Sustainable growth is a system, not a campaign.
  Cover: Growth equation, retention as foundation,
  unit economics, activation moment, growth model building.
  Example: Complete growth model for open-source developer tool.

- ceo.positioning.md → If you're not first, be different.
  Cover: Category creation vs entry, positioning formula,
  owning a word, reframing competition, pricing as signal.
  Example: Position Effikit against ChatGPT and Cursor AI completely.

**After completing:**
1. Add all 6 folders to keywords.md
2. Update navigation.md
3. Run sync.ts
4. Commit: "feat: add 6 advanced skill domains"
5. Push to GitHub
6. Mark this step ✅ in plan.md and commit

---

## Step 2 — craft/media/ Library ✅

**Goal:** Add craft/media/ with 3 production-grade TypeScript libraries.

**Context:**
- Effikit repo: https://github.com/aistorystudio42-byte/effikit
- craft/ already has 7 folders with 3 .ts files each
- New folder follows exact same quality standard
- All files in English, report back in Turkish

**Quality Standards:**
- Four header tags required: @keywords, @domain, @use-when, @not-when
- Zero any types — full TypeScript type safety
- Generics where applicable
- All functions and types exported
- Comments explain WHY not WHAT
- Real-world usage examples in comment block at bottom
- All edge cases handled explicitly
- No hardcoded values — configurable with defaults
- SSR-safe — no direct window/document access without checks

**Files to create:**

craft/media/media.image.ts
Must implement:
- useProgressiveImage → blur hash placeholder → full image swap
- useLazyImage → IntersectionObserver lazy loading,
  configurable rootMargin and threshold
- useResponsiveImage → srcset generation, WebP/AVIF detection,
  art direction breakpoints
- ImagePreloader class → priority queue, bandwidth-aware loading
- useCLS → CLS prevention, aspect ratio box, skeleton sizing
- Format detection → supportsWebP(), supportsAVIF()
  via canvas-based feature detection
- Full SSR safety on all hooks

craft/media/media.video.ts
Must implement:
- useVideoPlayer → full playback control, buffering,
  error handling, retry logic
- useVideoAutoplay → IntersectionObserver autoplay,
  pause on exit, prefers-reduced-motion respect
- useBandwidthDetection → NetworkInformation API wrapper,
  effective connection type, quality switching signals
- VideoPreloader → metadata or full preload,
  priority management, abort on unmount
- usePictureInPicture → PiP API with enter/exit/toggle,
  browser support detection and graceful fallback
- useVideoProgress → buffered ranges, seek preview, chapters
- Handle: autoplay policy, mobile Safari quirks, iOS inline playback

craft/media/media.audio.ts
Must implement:
- AudioEngine class → AudioContext lifecycle,
  suspended state handling, mobile autoplay restrictions
- useAudioVisualizer → AnalyserNode frequency/waveform,
  configurable FFT size, returns Float32Array for canvas
- useAudioPlayer → playback, seek, volume, rate, loop, crossfade
- useSpatialAudio → PannerNode wrapper, 3D positioning,
  distance model configuration
- AudioWorkletManager → worklet registration,
  processor communication, unsupported browser fallback
- useAudioRecorder → MediaRecorder wrapper,
  chunk collection, blob assembly, format selection
- SoundBoard class → preload multiple sounds,
  overlap control, volume normalization

**After completing:**
1. Add craft/media/ to keywords.md
2. Update navigation.md craft section
3. Run sync.ts
4. Commit: "feat: add craft/media library"
5. Push to GitHub
6. Mark this step ✅ in plan.md and commit

---

## Step 3 — Craft Audit & Improvement ✅

**Goal:** Academically audit and improve all craft/ TypeScript files.

**Context:**
- Effikit repo: https://github.com/aistorystudio42-byte/effikit
- craft/ has 8 folders (including new media/) with 3 .ts files each
- Total: 24 files to audit
- All fixes must preserve existing API — no breaking changes
- Report in Turkish, code stays in English

**Files to audit:**
craft/ui/ui.components.ts, craft/ui/ui.layout.ts, craft/ui/ui.tokens.ts
craft/ux/ux.interaction.ts, craft/ux/ux.feedback.ts, craft/ux/ux.accessibility.ts
craft/hooks/hooks.state.ts, craft/hooks/hooks.async.ts, craft/hooks/hooks.lifecycle.ts
craft/api/api.request.ts, craft/api/api.error.ts, craft/api/api.cache.ts
craft/db/db.query.ts, craft/db/db.schema.ts, craft/db/db.migration.ts
craft/auth/auth.session.ts, craft/auth/auth.token.ts, craft/auth/auth.permission.ts
craft/animation/animation.transition.ts, craft/animation/animation.micro.ts,
craft/animation/animation.scroll.ts
craft/media/media.image.ts, craft/media/media.video.ts, craft/media/media.audio.ts

**Audit categories per file:**
1. Type Safety → any usage, missing generics, return types, type narrowing
2. Memory Leaks → event listener cleanup, useEffect cleanup, timer clearing,
   AbortController usage, WeakRef/WeakMap needs
3. Race Conditions → mounted checks, concurrent requests, stale closures
4. Edge Cases → empty arrays, null/undefined, division by zero,
   infinite loop risk, negative values
5. Performance → unnecessary re-renders, missing useCallback/useMemo,
   O(n²) complexity, missing debounce/throttle
6. Security → XSS risk, prototype pollution, ReDoS, sensitive data in logs,
   timing attacks
7. Browser Compatibility → SSR safety, Web Crypto availability,
   IntersectionObserver/ResizeObserver polyfills
8. API Design → consistent signatures, options pattern, tree-shaking,
   breaking change risk

**Report format per file:**
---
## [filename]
### 🔴 Critical Issues
### 🟡 Potential Issues  
### 🟢 Academic Improvements
### ✅ Strengths
---

**After completing:**
1. Apply all fixes directly to files
2. Run sync.ts
3. Commit: "fix: craft audit and improvements"
4. Push to GitHub
5. Mark this step ✅ in plan.md and commit

---

## Step 4 — Mind Audit & Improvement ⏳

**Goal:** Academically audit and improve all mind/ TypeScript files.

**Context:**
- Effikit repo: https://github.com/aistorystudio42-byte/effikit
- mind/ has 12 folders with 3 .ts files each
- Total: 36 files to audit
- All fixes must preserve existing API
- Report in Turkish, code stays in English

**Files to audit:**
mind/recommendation/recommendation.engine.ts
mind/recommendation/recommendation.scoring.ts
mind/recommendation/recommendation.filter.ts
mind/discovery/discovery.feed.ts
mind/discovery/discovery.ranking.ts
mind/discovery/discovery.diversity.ts
mind/decision/decision.tree.ts
mind/decision/decision.weight.ts
mind/decision/decision.fallback.ts
mind/optimization/optimization.algorithm.ts
mind/optimization/optimization.cache.ts
mind/optimization/optimization.benchmark.ts
mind/ranking/ranking.score.ts
mind/ranking/ranking.decay.ts
mind/ranking/ranking.boost.ts
mind/search/search.query.ts
mind/search/search.fuzzy.ts
mind/search/search.index.ts
mind/personalization/personalization.profile.ts
mind/personalization/personalization.behavior.ts
mind/personalization/personalization.adapt.ts
mind/realtime/realtime.sync.ts
mind/realtime/realtime.queue.ts
mind/realtime/realtime.conflict.ts
mind/graph/graph.relation.ts
mind/graph/graph.traverse.ts
mind/graph/graph.cluster.ts
mind/caching/caching.strategy.ts
mind/caching/caching.invalidation.ts
mind/caching/caching.layer.ts
mind/security/security.encrypt.ts
mind/security/security.validate.ts
mind/security/security.audit.ts
mind/ai/ai.prompt.ts
mind/ai/ai.context.ts
mind/ai/ai.pipeline.ts

**Audit categories per file:**
1. Algorithmic Correctness → math accuracy, edge case failure,
   numerical instability, convergence guarantee, time/space complexity
2. Data Structure Issues → wrong structure choice, Map vs Object,
   Set operations efficiency, heap correctness, circular reference risk
3. Scalability → large dataset performance, unbounded growth,
   concurrent access race conditions, infinite recursion risk
4. Mathematical Edge Cases → division by zero, NaN/Infinity propagation,
   overflow/underflow, floating point precision, negative index risk
5. Algorithm Reliability → determinism, monotonicity, bias detection,
   cold start handling, degenerate case handling
6. Cryptographic Correctness → timing attacks, IV/salt reuse,
   weak random numbers, side-channel risk
7. Memory & Resource Management → unbounded cache growth,
   eviction policy correctness, timer cleanup, event listener accumulation
8. API Consistency → similar function signatures, error handling,
   return type consistency, factory pattern correctness

**Report format per file:**
---
## [filename]
### 🔴 Critical Issues (algorithmic error or security vulnerability)
### 🟡 Potential Issues (breaks under specific conditions)
### 🟢 Academic Improvements (literature-aligned enhancements)
### ✅ Algorithmic Strengths
---

**After completing:**
1. Apply all fixes directly to files
2. Run sync.ts
3. Commit: "fix: mind audit and improvements"
4. Push to GitHub
5. Mark this step ✅ in plan.md and commit

---

## Step 5 — Skills Audit & Improvement ✅

**Goal:** Audit and strengthen all skills/ markdown files.

**Context:**
- Effikit repo: https://github.com/aistorystudio42-byte/effikit
- skills/ has 26 folders with 4 .md files each
- Total: 104 files to audit
- Focus on making each file more actionable and precise
- Report in Turkish

**Audit categories:**
1. Actionability → can Claude follow this directly without interpretation?
2. Specificity → are examples real or generic?
3. Decisiveness → are there "it depends" answers without resolution?
4. Keyword accuracy → do @keywords match the actual content?
5. Format consistency → does it follow the standard format?
6. Uniqueness → does each file in a folder feel genuinely different?
7. Persona accuracy → for art/science/creativity folders,
   is the persona authentic and distinctive?

**After completing:**
1. Apply all improvements directly
2. Run sync.ts
3. Commit: "fix: skills audit and improvements"
4. Push to GitHub
5. Mark this step ✅ in plan.md and commit

---

## Step 6 — Keyword System Overhaul ✅

**Goal:** Elevate keywords.md and all @keywords tags to precision targeting.

**Context:**
- Effikit repo: https://github.com/aistorystudio42-byte/effikit
- Current keywords.md works but is not optimized for instant targeting
- Goal: Claude reads one keyword, goes to exact file, no ambiguity
- Report in Turkish

**Tasks:**
1. Analyze every @keywords tag in every file
   - Are keywords specific enough?
   - Do different files share too many keywords? (creates ambiguity)
   - Are semantic variations covered? (e.g. "cache" AND "caching" AND "memoize")
   - Are use-case keywords included? (not just technical terms)

2. Redesign keywords.md structure:
   - Add intent-based grouping (what is the user TRYING to do?)
   - Add scenario-based keywords (e.g. "user types in search box" → search.query.ts)
   - Add anti-keywords (when NOT to use a file)
   - Ensure zero ambiguity — one keyword maps to maximum 2 files

3. Update @keywords tags in all source files to match new system

4. Update navigation.md decision tree to reference new keyword logic

**After completing:**
1. Run sync.ts
2. Commit: "feat: keyword system overhaul — precision targeting"
3. Push to GitHub
4. Mark this step ✅ in plan.md and commit

---

## Step 7 — README ⏳

**Goal:** Write the definitive README.md for Effikit.

**Context:**
- Effikit repo: https://github.com/aistorystudio42-byte/effikit
- This is the GitHub landing page — first impression for every visitor
- Must work for: developers discovering Effikit, developers installing it,
  contributors wanting to add to it
- Language: English
- Tone: Professional, confident, developer-first. No marketing fluff.
- Report in Turkish when done

**README must include:**

1. Hero section
   - Name + one-line description
   - What problem it solves (specific, not vague)
   - Quick visual of folder structure

2. What is Effikit
   - The philosophy (read → adapt → use, no dependency)
   - Who it's for
   - What it is NOT (not an npm package, not a framework)

3. What's Inside
   - craft/ → ready TypeScript libraries (with file count)
   - mind/ → algorithm libraries (with file count)
   - skills/ → AI behavior directives (with file count)
   - bridge/ → MCP integration guides
   - prompt/ → prompt templates
   - Brief description of each, link to navigation.md for details

4. Installation
   - Claude Code users (global CLAUDE.md setup, git clone command)
   - Other AI tools (manual integration guide)
   - Verification step

5. How to Use
   - The 5-step workflow (navigation.md → keywords.md → file → adapt → write)
   - One complete real example end-to-end

6. Adding New Files
   - File header requirements
   - Running sync.ts
   - Folder size rules

7. Contributing
   - Quality standards summary
   - PR process
   - What gets accepted vs rejected

8. License
   - MIT, link to LICENSE file

**After completing:**
1. Commit: "docs: add README"
2. Push to GitHub
3. Mark this step ✅ in plan.md and commit
4. DELETE plan.md
5. Final commit: "chore: effikit v1.0 complete"
6. Push to GitHub
