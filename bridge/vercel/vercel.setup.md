<!-- @keywords: vercel, deploy, deployment, serverless, edge, project, token, mcp setup, vercel config -->
<!-- @domain: Vercel MCP Server — Setup & Configuration -->

# Vercel MCP Server — Setup & Configuration

## What This Is

The Vercel MCP server lets Claude interact with your Vercel projects directly — triggering deployments, reading logs, managing environment variables, and inspecting deployment status without leaving the conversation.

---

## Installation

### Prerequisites
- A Vercel account (free tier works)
- A Vercel API Token

### Step 1 — Generate API Token

**Vercel Dashboard → Settings → Tokens → Create Token**

- Name: `claude-mcp`
- Scope: Full Account (or limit to specific teams)
- Expiration: Set to 90 days and rotate

### Step 2 — Add to claude_desktop_config.json

**macOS/Linux:** `~/.config/claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "vercel": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-vercel"],
      "env": {
        "VERCEL_TOKEN": "your_vercel_token_here",
        "VERCEL_TEAM_ID": "team_xxxxxxxxxxxx"
      }
    }
  }
}
```

`VERCEL_TEAM_ID` is optional — only needed if your projects are under a team (not personal account). Find it in **Team Settings → General → Team ID**.

### Step 3 — Verify

Restart Claude Desktop. Ask:
> "List my Vercel projects"

You should see your project list with deployment counts.

---

## Available Tools

| Tool | What It Does |
|------|-------------|
| `list_projects` | List all projects in account/team |
| `get_project` | Get project config, framework, domains |
| `list_deployments` | List deployments with filter by state/branch |
| `get_deployment` | Full details of a specific deployment |
| `get_deployment_build_logs` | Streaming build logs for a deployment |
| `get_runtime_logs` | Live function invocation logs |
| `deploy_to_vercel` | Trigger a new deployment |
| `check_domain_availability_and_price` | Check if a domain is available |
| `list_teams` | List teams your account belongs to |
| `get_access_to_vercel_url` | Inspect a Vercel preview URL |
| `web_fetch_vercel_url` | Fetch content from a Vercel-hosted URL |

---

## Prompt Examples

```
List all my Vercel projects and show their current deployment status
```

```
Show the last 5 deployments for project "my-app" including their state and branch
```

```
Get the build logs for deployment dpl_abc123xyz in project "my-app"
```

```
Show runtime logs for the last 100 invocations of project "my-app"
```

```
Deploy project "my-app" from the main branch
```

```
Check if the domain "effikit.dev" is available and show its price
```

```
Get full details for project "my-app": framework, domains, environment count
```

---

## Project Configuration Reference

When you ask Claude to get a project, the response includes:

```
name: my-app
framework: nextjs
rootDirectory: ./
buildCommand: next build
outputDirectory: .next
installCommand: npm install
devCommand: next dev
nodeVersion: 20.x
regions: [iad1]
domains: [my-app.vercel.app, myapp.com]
```

These map directly to `vercel.json` settings and are editable via the Vercel dashboard.

---

## Environment Variable Management

The MCP server doesn't have a direct "set env var" tool — manage env vars via the Vercel dashboard or the `vercel env` CLI:

```bash
# Add env var to production
vercel env add NEXT_PUBLIC_API_URL production

# Pull all env vars locally
vercel env pull .env.local
```

For Claude-assisted workflows, describe what you need and Claude will generate the correct CLI commands.

---

## Framework Detection

Vercel auto-detects frameworks. What it does with them:

| Framework | Build Output | Serverless |
|-----------|-------------|------------|
| Next.js App Router | `.next` | Functions per route segment |
| Next.js Pages | `.next` | Functions per page |
| Vite | `dist` | Static only (no SSR) |
| Astro | `dist` | Edge functions (island hydration) |
| SvelteKit | `.svelte-kit/output` | Functions per route |
| Remix | `build` | Functions per loader/action |

If Vercel misdetects your framework, set it explicitly in `vercel.json`:

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "outputDirectory": ".next"
}
```
