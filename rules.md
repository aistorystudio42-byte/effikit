# Effikit Rules
> Usage rules, quality control, and guard system for Effikit.
> These rules are non-negotiable.

---

## The Prime Directives

1. **Never write from scratch if Effikit has it.** Check `keywords.md` first. Always.
2. **Never modify files inside Effikit.** Read → adapt → write to your project. The source stays clean.
3. **Run `sync.ts` after adding new files.** Keywords go stale otherwise.
4. **All source files must have the four header tags.** No exceptions.
5. **Quality over speed.** Academic-grade code that actually works.

---

## Before You Start Any Task

```
Step 1 → Read navigation.md (understand the map)
Step 2 → Scan keywords.md (find matching files)
Step 3 → Read the matched file(s)
Step 4 → Adapt to the current project context
Step 5 → Write to the project (not back to Effikit)
```

If you skip Step 2 and write from scratch when a file already exists, that's a failure.

---

## File Header Requirements

Every TypeScript file in `craft/` and `mind/` must start with:

```ts
/**
 * @keywords    comma, separated, search, terms
 * @domain      the domain this belongs to (e.g. "API", "Auth", "Search")
 * @use-when    describe the exact situation where this should be used
 * @not-when    describe when NOT to use this (prevents misuse)
 */
```

These tags are parsed by `sync.ts` to keep `keywords.md` up to date.
Missing tags = `sync.ts` will not index the file.

---

## Quality Standards

### TypeScript Files (`craft/`, `mind/`)
- [ ] Has all four header tags (`@keywords`, `@domain`, `@use-when`, `@not-when`)
- [ ] Uses TypeScript generics where applicable — no `any`
- [ ] Full type safety — interfaces/types for all inputs and outputs
- [ ] Functions are pure where possible (no hidden side effects)
- [ ] Exported — all public functions and types are exported
- [ ] Comments explain the WHY, not the WHAT
- [ ] Includes at least one real-world usage example in a comment block
- [ ] Handles edge cases explicitly (empty arrays, null values, timeouts)
- [ ] No hardcoded values — use configurable parameters with defaults

### Markdown Files (`skills/`, `bridge/`, `prompt/`)
- [ ] Clear hierarchical headings
- [ ] Instructions are actionable — Claude can follow them directly
- [ ] Examples are real and functional
- [ ] Concise — no unnecessary padding
- [ ] No ambiguous language ("maybe", "sometimes", "you could")

---

## What NOT to Do

| Do NOT | Because |
|--------|---------|
| Edit files inside `effikit/` | It's the source library. Changes should live in your project. |
| Skip `keywords.md` lookup | You'll reinvent the wheel. |
| Add `any` types | Type safety is the whole point. |
| Write comments that describe WHAT the code does | The code does that. Comments explain WHY. |
| Leave files without header tags | `sync.ts` won't index them. |
| Use `sync.ts` output as-is without review | Always verify the generated index is accurate. |
| Copy-paste without adapting | Adapt to project context — naming conventions, env vars, etc. |

---

## Folder Size Rules

| Folder | Files per subfolder |
|--------|-------------------|
| `craft/*/` | Exactly 3 `.ts` files |
| `mind/*/` | Exactly 3 `.ts` files |
| `skills/*/` | Exactly 4 `.md` files |
| `bridge/*/` | 1 main guide + optional supporting files |
| `prompt/*/` | Exactly 5 `.md` files |

Deviating from these counts is a signal that a file is missing or duplicated.

---

## Naming Conventions

### Craft files
```
craft/{folder}/{folder}.{purpose}.ts
Examples:
  craft/ui/ui.components.ts
  craft/api/api.error.ts
  craft/auth/auth.token.ts
```

### Mind files
```
mind/{folder}/{folder}.{purpose}.ts
Examples:
  mind/search/search.fuzzy.ts
  mind/ranking/ranking.score.ts
  mind/ai/ai.pipeline.ts
```

### Skills files
```
skills/{domain}/{topic}.md
Examples:
  skills/frontend/components.md
  skills/debugging/strategy.md
```

### Prompt files
```
prompt/{domain}/{purpose}.md
Examples:
  prompt/debug/root-cause.md
  prompt/code/feature-generation.md
```

---

## Sync Rules

Run `npx ts-node sync.ts` when:
- A new file is added to `craft/` or `mind/`
- `@keywords` tags are modified in existing files
- `keywords.md` seems out of date

Do NOT run `sync.ts`:
- If you're only changing logic inside a function (tags didn't change)
- As a substitute for manually verifying the output

---

## Error Recovery

If you find inconsistencies in Effikit:

| Problem | Action |
|---------|--------|
| Missing header tags | Add them, then run `sync.ts` |
| `keywords.md` has wrong file paths | Run `sync.ts` to regenerate |
| A file has `any` types | Refactor with proper generics before using |
| Duplicate functionality across files | Use the more complete one, note the overlap |
| File count mismatch in a folder | Check if a file was accidentally deleted |

---

## Versioning

Effikit does not use semver. It evolves continuously.
- Git history is the version log
- Commit messages should describe what was added/changed and why
- Breaking changes to existing files should be flagged in commit message with `[BREAKING]`
