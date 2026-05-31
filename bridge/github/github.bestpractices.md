<!-- @keywords: github, best practices, security, PAT, token, rate limit, commit, branch naming, PR hygiene -->
<!-- @domain: GitHub MCP Server — Best Practices & Security -->

# GitHub MCP Server — Best Practices & Security

## Token Security

**Never store tokens in code or config files committed to the repo.**

```json
// ✅ Right — in claude_desktop_config.json (not committed)
"env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..." }

// ❌ Wrong — hardcoded anywhere in the project
const token = "ghp_abc123...";
```

**Use fine-grained tokens over classic PATs** — scope to specific repos and permissions, not all repos + full admin access.

**Rotate tokens every 90 days.** GitHub will warn you; Claude won't.

**Separate tokens by concern:**
| Token | Scopes | Use For |
|-------|--------|---------|
| `effikit-read` | Contents: Read, Metadata: Read | Reading files, searching |
| `effikit-write` | Contents: RW, PRs: RW, Issues: RW | Full dev workflow |
| `effikit-ci` | Actions: RW, Workflows: RW | CI/CD automation only |

---

## Rate Limits

GitHub REST API limits: **5,000 requests/hour** (authenticated).  
Search API: **30 requests/minute** (lower — use with care).

**What burns rate limits fast:**
- Looping `list_commits` across many branches
- Running `search_code` repeatedly for broad patterns
- Fetching file contents for large directories recursively

**What to do instead:**
```
# Instead of listing all files and reading each one:
Search code in owner/repo for "@deprecated" 
→ returns file paths + snippets directly

# Instead of listing all commits to count changes:
Get the comparison between v1.0.0 and v1.1.0 in owner/repo
```

---

## Commit Message Convention

Follow Conventional Commits — it enables automated changelog generation:

```
feat: add OAuth2 PKCE flow
fix: resolve session expiry race condition
refactor: extract token validation into separate service
docs: update API authentication guide
chore: upgrade dependencies to latest patch versions
test: add integration tests for refresh token flow
perf: cache user permission lookups with 5-minute TTL
```

**Breaking changes:**
```
feat!: redesign authentication API

BREAKING CHANGE: `login()` now returns a Promise<AuthResult> 
instead of a synchronous token string. Update all callers.
```

---

## Branch Naming

```
feature/short-descriptive-name     ← new functionality
fix/issue-42-session-timeout       ← bug fixes (include issue #)
hotfix/critical-xss-vulnerability  ← urgent production fixes
release/v2.1.0                     ← release stabilization
chore/upgrade-typescript-5.4       ← maintenance work
docs/update-auth-readme            ← documentation only
```

**Rules:**
- Lowercase, hyphens only (no underscores, no spaces)
- Include issue number when applicable (`fix/gh-42-...`)
- Keep it under 50 characters
- Delete branches after merge — stale branches are noise

---

## PR Hygiene

**Atomic PRs:** One logical change per PR. Reviewers can reason about it; CI catches regressions cleanly.

**Size guidance:**
- Under 200 lines changed: reviewable in one sitting
- 200–500 lines: acceptable with good PR description
- Over 500 lines: split it — reviewers will skim and miss things

**Draft PRs:** Open as draft (`draft: true`) when work is in progress. Signals "not ready for review" without blocking CI.

**PR description template to use with Claude:**
```
Create a PR in owner/repo with this body:
## What changed and why
[explanation]

## How to test
1. [step]
2. [step]

## Checklist
- [ ] Tests added or updated
- [ ] No console.log left behind
- [ ] Type-safe (no `any` introduced)
- [ ] Accessible (keyboard nav works)
```

---

## What NOT to Do via MCP

| Action | Why Not |
|--------|---------|
| Force-push to main | Rewrites shared history — coordinate via PR instead |
| Direct commit to protected branch | Bypasses review; use PRs |
| Delete a branch before PR is merged | Data loss — wait for merge confirmation |
| Mass-close issues without comment | No audit trail; always add a comment explaining why |
| Commit secrets / .env files | Even if deleted later, git history is permanent |

---

## Search Effectively

```
# Find files changed in the last PR (not just listing all files)
Search code in owner/repo for "useAuthSession" language:TypeScript

# Find dead code exports that nothing imports
Search code in owner/repo for "export function deprecated" 

# Cross-repo search (when you maintain multiple related repos)
Search repositories with topic:effikit user:aistorystudio42-byte
```

---

## Error Recovery

**"Resource not accessible by integration"** → Your PAT lacks the required scope. Add it in GitHub → Settings → Tokens.

**"Branch not found"** → Verify exact branch name including case (`main` ≠ `Main`).

**"Merge conflict"** → The MCP server cannot auto-resolve conflicts. Pull locally, resolve, push the resolved branch, then merge via MCP.

**Rate limit hit** → Wait 60 seconds before retrying. Don't loop.
