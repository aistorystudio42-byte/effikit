# Effikit

**A personal developer toolkit you read from, not install.** Ready TypeScript libraries, advanced algorithms, AI behavior directives, MCP integration guides, and prompt templates — engineered so your AI assistant builds from proven code instead of guessing from scratch.

```
effikit/
  navigation.md     ← Internal map. AI reads this first.
  keywords.md       ← Keyword → file mapping engine.
  rules.md          ← Usage rules and quality control.
  sync.ts           ← Auto-generates keywords.md from source tags.
  │
  ├── craft/        ← Ready TypeScript libraries        (8 folders · 24 files)
  ├── mind/         ← Advanced algorithm libraries       (12 folders · 36 files)
  ├── skills/       ← AI behavior directives             (26 folders · 104 files)
  ├── bridge/       ← MCP & service integration guides   (9 folders · 27 files)
  └── prompt/       ← Ready-to-use prompt templates       (10 folders · 50 files)
```

---

## The Problem

When you ask an AI assistant to build something, it regenerates the same patterns from scratch every time — and the quality drifts. A debounce hook here, a retry-with-backoff there, a JWT helper that almost handles refresh correctly. You re-review the same code, fix the same edge cases, and never accumulate anything.

Effikit fixes that. It is a curated, battle-tested library your assistant **reads from, adapts, and applies** — so the floor of every task is "proven implementation," not "first attempt."

---

## What is Effikit?

Effikit is built on one principle:

> **Read → Adapt → Use.** Never copy blindly. Never install as a dependency.

Your AI assistant opens the relevant file, understands the implementation, then adapts it to your project's exact needs. Nothing gets bolted on; everything gets fitted.

**Who it's for**
- Developers using Claude Code (or any capable AI assistant) as their primary builder
- People who want consistent, high-quality output without rewriting the same primitives

**What it is NOT**
- ❌ Not an npm package — you don't `npm install effikit`
- ❌ Not a framework — it imposes no runtime, no build step, no lock-in
- ❌ Not a snippet dump — every file is academic-grade, type-safe, and edge-case-aware

---

## What's Inside

| Folder | What it holds | Size |
|--------|---------------|------|
| **craft/** | Production-grade TypeScript libraries — UI, UX, hooks, API, DB, auth, animation, media | 8 folders · 24 files |
| **mind/** | Advanced algorithms — recommendation, search, ranking, graph, optimization, security, AI | 12 folders · 36 files |
| **skills/** | AI behavior directives — how Claude should *think and act* in each domain (frontend, security, the science/art personas...) | 26 folders · 104 files |
| **bridge/** | Integration guides for MCP servers & external services — GitHub, Vercel, Supabase, Figma, GSAP... | 9 folders · 27 files |
| **prompt/** | Reusable, tested prompt templates for code, debug, review, architecture, planning... | 10 folders · 50 files |

Every `craft/` and `mind/` file is fully typed (zero `any`), exports all functions and types, handles edge cases explicitly, and is SSR-safe where relevant. Every `skills/` and `prompt/` file is decisive and directly actionable — no "it depends."

👉 For the full file-by-file map, see **[navigation.md](navigation.md)**.

---

## Installation

Effikit isn't installed into your app — it lives alongside your project so your AI assistant can read it.

### Claude Code users — MCP (recommended, fastest)

The MCP server turns Effikit into a real-time discovery engine. Your AI calls tools instead of reading static files, which saves tokens and returns higher-quality matches.

**1. Clone Effikit:**

```bash
git clone https://github.com/aistorystudio42-byte/effikit.git .effikit
```

**2. Install MCP dependencies:**

```bash
cd .effikit/mcp && npm install
```

**3. Add to your project `.mcp.json`** (or global `~/.claude/mcp.json`):

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

**4. Add to your global `~/.claude/CLAUDE.md`:**

```markdown
## Effikit — Primary Toolkit (MCP)
Before any task, call effikit_navigate with what you want to build.
Use effikit_blueprint for full-feature builds.
Use effikit_read to get the file content, then adapt it into the project.
Never modify files inside .effikit — read, adapt, write into your project.
```

That's it. Claude will call `effikit_navigate` automatically before every coding task and get scored, relevant results in milliseconds — no manual file reading required.

**Available MCP tools:**

| Tool | When to call |
|------|-------------|
| `effikit_navigate` | Before every coding task — returns top matches scored by relevance |
| `effikit_blueprint` | For full-feature builds — returns a layered recipe (skill + code + prompt) |
| `effikit_search` | Free-form search by keyword or phrase |
| `effikit_read` | Read a specific file's full content + adaptation directive |
| `effikit_skill` | Activate expert mindset for a domain (security, refactoring, Einstein...) |
| `effikit_manifest` | View the full map of all sections and files |
| `effikit_stats` | Coverage statistics |
| `effikit_audit` | Tag health + cohesion budget check — run after adding files |

### CLI — without AI

If you prefer terminal access without an AI client:

```bash
# Find and copy the most relevant file into your current directory
npx tsx .effikit/cli/index.ts add "infinite scroll"

# List scored candidates without copying
npx tsx .effikit/cli/index.ts search "jwt auth"

# Browse the full catalogue
npx tsx .effikit/cli/index.ts list
```

### Other AI tools

Point your assistant at the cloned folder and instruct it to read `navigation.md` first, then `keywords.md` to locate files. The workflow is identical; only the config file location differs.

### Verify it works

Ask your assistant: *"Using Effikit, give me a production-ready debounce hook."*
If it calls `effikit_navigate` with `"debounce hook"` and adapts the real implementation instead of inventing one, you're set.

---

## How to Use

Effikit follows a strict **5-step workflow**:

```
1. navigation.md   →  Understand the map. Where do things live?
2. keywords.md     →  Match the request to an exact file (3-layer funnel: intent → scenario → keyword).
3. open the file   →  Read the real implementation and its @use-when / @not-when tags.
4. adapt           →  Fit it to your project's types, naming, and constraints.
5. write           →  Write the adapted code into YOUR project — never into .effikit.
```

### One complete example

> **You:** "I need infinite scroll for my product feed."

1. **navigation.md** → infinite scroll = a UX/hook concern → look at `craft/hooks/` and `mind/discovery/`.
2. **keywords.md** → `infinite scroll`, `intersection observer`, `load more` → maps to [craft/hooks/hooks.lifecycle.ts](craft/hooks/hooks.lifecycle.ts) (the `useIntersection` hook) and [mind/discovery/discovery.feed.ts](mind/discovery/discovery.feed.ts) (pagination + ordering).
3. **open** both files, read the IntersectionObserver lifecycle (SSR-safe, cleanup handled) and the feed pagination logic.
4. **adapt** — wire `useIntersection` to your product API, swap in your item type.
5. **write** the result into `src/hooks/useProductFeed.ts` in your project.

Result: a correct, edge-case-aware feature in one pass — no reinventing IntersectionObserver cleanup or off-by-one pagination bugs.

---

## Adding New Files

Effikit grows by contribution. Every new file must meet the standard.

**`craft/` and `mind/` (.ts) — four header tags are mandatory:**

```typescript
// @keywords: comma, separated, specific, terms
// @domain: the area this belongs to
// @use-when: the exact scenario this is the right choice
// @not-when: when to reach for something else instead
```

Plus: zero `any`, all exports public, comments explain *why* not *what*, real usage examples in a comment block at the bottom.

**`skills/` and `prompt/` (.md):**

```markdown
<!-- @keywords: 8-15 specific terms -->
```

Plus: decisive language, real working examples, clear opinionated stance.

**After adding any file, regenerate the keyword index:**

```bash
npx tsx sync.ts
```

`sync.ts` scans every `@keywords` tag across `craft/`, `mind/`, `skills/`, and `prompt/`, then rebuilds `keywords.md` automatically.

If you installed the dev dependencies (`npm install` in the root), a Husky pre-commit hook handles this automatically — `sync.ts` runs and stages `keywords.md` on every commit that touches `craft/` or `mind/`.

**Audit after adding:**

```bash
# Via MCP (recommended — full report in your AI client)
# call: effikit_audit

# Via CLI
cd .effikit/mcp && npx tsx server.ts  # then call effikit_audit from your AI
```

The audit catches missing `@keywords` tags, empty tag bodies, and folders approaching the cohesion budget limit — before they silently break discoverability.

**Folder size rule:** each `craft/`/`mind/` folder holds exactly 3 files; each `skills/` folder holds exactly 4; each `prompt/` folder holds exactly 5. Keep folders focused — split a domain rather than overfilling one.

---

## Contributing

**Quality bar (non-negotiable):**
- TypeScript: full type safety, no `any`, all edge cases handled, SSR-safe
- Markdown: actionable, decisive, real examples, no padding
- Every file carries accurate `@keywords` and passes `sync.ts` cleanly

**PR process:**
1. Fork, branch, add your file(s) following the header standard
2. Run `npx tsx sync.ts` and commit the updated `keywords.md` (the Husky hook does this automatically if you installed dev deps)
3. Open a PR — the `effikit-audit` GitHub Action will verify tag health and cohesion budget automatically
4. A PR description should explain what the file does and *when it should be used*

**Accepted:** generic, reusable, genuinely better than what an AI writes cold.
**Rejected:** project-specific glue, untyped code, vague "it depends" guidance, near-duplicates of existing files.

See **[rules.md](rules.md)** for the complete quality control system.

---

## License

[MIT](LICENSE) © 2026 aistorystudio42-byte. Use it, fork it, adapt it freely.
