<!-- @keywords: github, repo, repository, git, branch, remote, clone, fork, ssh, token, mcp setup -->
<!-- @domain: GitHub MCP Server — Setup & Configuration -->

# GitHub MCP Server — Setup & Configuration

## What This Is

The GitHub MCP server exposes GitHub's REST and GraphQL APIs as callable tools inside Claude Code. Instead of switching to a browser or running `gh` CLI commands manually, you ask Claude to interact with GitHub directly during your session.

---

## Installation

### Prerequisites
- Node.js 18+
- A GitHub Personal Access Token (PAT) with the scopes you need

### Step 1 — Generate a PAT

Go to: **GitHub → Settings → Developer Settings → Personal access tokens → Fine-grained tokens**

Required scopes (minimum):
```
Contents: Read & Write
Pull requests: Read & Write
Issues: Read & Write
Metadata: Read (auto-selected)
```

For CI/Actions work, also add:
```
Actions: Read & Write
Workflows: Read & Write
```

### Step 2 — Add to claude_desktop_config.json

**macOS/Linux:** `~/.config/claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

### Step 3 — Verify Connection

Restart Claude Desktop. Then ask:
> "List my GitHub repositories"

If you see a repository list, the server is active.

---

## Available Tools

| Tool | What It Does |
|------|-------------|
| `search_repositories` | Search repos by name, language, topic, stars |
| `get_file_contents` | Read any file from any branch/commit |
| `create_or_update_file` | Write or overwrite a file in a repo |
| `push_files` | Commit multiple files in one operation |
| `create_repository` | Create a new public or private repo |
| `fork_repository` | Fork a repo to your account or an org |
| `create_branch` | Create a branch from a ref |
| `list_commits` | Get commit history with filters |
| `get_commit` | Inspect a specific commit's diff |
| `create_pull_request` | Open a PR with title, body, base, head |
| `get_pull_request` | Read PR metadata and status |
| `list_pull_requests` | List open/closed/merged PRs |
| `merge_pull_request` | Merge a PR (merge/squash/rebase) |
| `create_pull_request_review` | Submit a PR review with inline comments |
| `create_issue` | Create a new issue with labels, assignees |
| `get_issue` | Read issue details and comments |
| `list_issues` | Filter issues by state, label, assignee |
| `update_issue` | Change title, body, state, labels |
| `add_issue_comment` | Comment on an issue |
| `search_code` | Search code across all repos |
| `search_issues` | Full-text search over issues and PRs |
| `list_branches` | List all branches with their last commit |

---

## Prompt Examples

```
List all open PRs in owner/repo that are older than 7 days
```

```
Create a branch called "feature/dark-mode" from main in owner/repo
```

```
Open a PR from feature/dark-mode to main with title "Add dark mode support" 
and body that describes the changes
```

```
Search for all issues labeled "bug" that are unassigned in owner/repo
```

```
Get the contents of src/app/page.tsx from the main branch of owner/repo
```

```
Add a comment to issue #42 in owner/repo: "Reproduced on v2.1.3, investigating"
```

```
Search repositories with language:TypeScript topic:mcp stars:>100
```

```
List the last 20 commits on the main branch of owner/repo
```

---

## Common Workflows

**Start a feature:**
1. Create branch from main
2. Confirm branch exists via list_branches
3. Begin working — Claude can commit files directly

**PR review cycle:**
1. List open PRs
2. Get specific PR details
3. Create a review with inline comments
4. Merge when approved

**Bug triage:**
1. Search issues by label "bug"
2. Add comment with reproduction steps
3. Update labels and assignee in one call
