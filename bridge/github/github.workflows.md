<!-- @keywords: github, pull request, PR workflow, branch strategy, issue automation, code review, merge, rebase, squash -->
<!-- @domain: GitHub MCP Server — Workflows & Automation -->

# GitHub MCP Server — Workflows & Automation

## Branch Strategy Patterns

### Trunk-Based Development
```
main (always deployable)
  └── feature/short-lived-branch  (max 1-2 days)
  └── fix/specific-bug-name
  └── chore/dependency-update
```

Prompt pattern:
```
Create branch "feature/user-avatar-upload" from main in owner/repo,
then show me the current contents of src/features/profile/ on that branch
```

### Gitflow Variant
```
main      ← production releases only
develop   ← integration branch
  └── feature/*
  └── hotfix/*   (branches off main, merges to both main + develop)
release/* ← stabilization branch before merging to main
```

---

## Pull Request Automation

### Open a PR with full context
```
Create a pull request in owner/repo:
- Head branch: feature/dark-mode
- Base branch: main
- Title: "feat: add system dark mode support"
- Body:
  ## Changes
  - Added CSS custom properties for dark/light themes
  - Hooked into prefers-color-scheme media query
  - Added toggle button in settings panel
  
  ## Testing
  - Tested on Chrome 124, Firefox 125, Safari 17
  - Passes WCAG 2.1 AA contrast requirements
  
  ## Screenshots
  [add screenshots here]
```

### Request a review
```
Create a review on PR #17 in owner/repo:
- Event: COMMENT (not APPROVE or REQUEST_CHANGES yet)
- Body: "Left inline questions on the CSS variable naming — everything else LGTM"
```

### Squash and merge
```
Merge PR #17 in owner/repo using squash method,
commit message: "feat: add dark mode support (#17)"
```

---

## Issue Lifecycle Automation

### Triage a new bug report
```
In owner/repo, issue #55:
1. Add label "confirmed-bug"
2. Remove label "needs-triage"  
3. Assign to user "alice"
4. Comment: "Confirmed on v3.2.1. Root cause identified in auth middleware. Fix targeted for next patch release."
```

### Create a structured issue
```
Create an issue in owner/repo:
Title: "Memory leak in WebSocket reconnect loop"
Labels: ["bug", "performance", "p1"]
Assignees: ["bob"]
Body:
## Description
Heap grows ~50MB per reconnect cycle. Visible in Chrome DevTools memory profiler.

## Steps to Reproduce
1. Open the app
2. Disconnect network for 10 seconds
3. Reconnect
4. Repeat 5 times
5. Check memory in DevTools

## Expected
Stable memory footprint after reconnect

## Actual
Linear memory growth, crashes at ~800MB

## Environment
- Browser: Chrome 124
- OS: macOS 14.4
- App version: 3.2.1
```

---

## Code Search Patterns

### Find all usages of a function across the repo
```
Search code in owner/repo for "getUserSession" — show me every file that calls it
```

### Audit dependencies
```
Search code in owner/repo for "require('eval'" to find any dynamic eval usage
```

### Find TODO comments before a release
```
Search code in owner/repo for "TODO:" and "FIXME:" across all TypeScript files
```

---

## Multi-File Commit Pattern

Use `push_files` to commit multiple changes atomically — no intermediate broken states:

```
Push the following files to the feature/auth-refactor branch in owner/repo
with commit message "refactor: extract auth middleware":
- src/middleware/auth.ts → [new contents]
- src/middleware/index.ts → [updated exports]
- tests/middleware/auth.test.ts → [new tests]
```

---

## Release Workflow

```
1. List all commits on main since the last tag v2.0.0 in owner/repo
2. Group them by type (feat, fix, chore, docs)
3. Create an issue titled "Release v2.1.0 Checklist" with a task list
4. Once done, create a PR from release/v2.1.0 to main
```

---

## Useful Filters

```
# Only open PRs with no reviews
List PRs in owner/repo where state is open and review_count is 0

# Issues updated in last 24h
List issues in owner/repo updated after 2025-05-30T00:00:00Z

# PRs from a specific author
List PRs in owner/repo where author is "alice" and state is open
```
