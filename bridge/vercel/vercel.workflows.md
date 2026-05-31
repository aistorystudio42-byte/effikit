<!-- @keywords: vercel, preview deployment, production deploy, rollback, branch preview, environment, domain, edge function, logs -->
<!-- @domain: Vercel MCP Server — Deployment Workflows -->

# Vercel MCP Server — Deployment Workflows

## Deployment Lifecycle

Every push to a connected repo creates a deployment. Understanding the states:

```
QUEUED → BUILDING → READY    (success)
                  → ERROR    (build failed)
                  → CANCELED (manually stopped or superseded)
```

**Check current state:**
```
Show the latest deployment for project "my-app" and its state
```

**Watch until ready:**
```
List deployments for "my-app" — show only the most recent one 
and tell me if it succeeded or failed
```

---

## Preview Deployment Workflow

Every non-main branch automatically gets a preview URL on Vercel. This is the core feedback loop:

```
1. Push feature branch to GitHub
2. Vercel auto-deploys it
3. Ask Claude: "Get the latest deployment for my-app on branch feature/dark-mode"
4. Claude returns the preview URL
5. Open the URL, test manually or share with team
```

**Get preview URL for a specific branch:**
```
List deployments for project "my-app" filtered to branch "feature/dark-mode" 
— show the most recent URL
```

---

## Production Deployment

**Trigger manually (via CLI, not MCP — for safety):**
```bash
vercel --prod
```

**Via MCP — inspect before you ship:**
```
Get the last 3 deployments on the main branch of project "my-app".
Show: deployment ID, status, created time, and duration.
Tell me if any of them failed and why.
```

**Then deploy:**
```
Deploy project "my-app" to production from the main branch
```

---

## Log Analysis

### Build Log Investigation

Build logs are your first stop for failures:

```
Get build logs for the failed deployment dpl_abc123 in project "my-app"
— focus on lines containing "error" or "failed"
```

**Common build errors and what to look for:**
```
"Module not found"           → import path issue or missing dependency
"Type error"                 → TypeScript compile-time failure
"Cannot find name"           → missing type definitions
"ENOMEM"                     → build hit memory limit (upgrade plan or optimize)
"Build exceeded time limit"  → build timeout (optimize or use Vercel cache)
```

### Runtime Log Investigation

Runtime logs capture function invocations, errors, and response times:

```
Get runtime logs for project "my-app" — show the last 50 lines
and identify any 500 errors or unhandled exceptions
```

**Filtering useful patterns:**
```
Show runtime logs for "my-app" and extract only lines with:
- Status codes 4xx or 5xx
- "Error:" or "Unhandled" keywords
- Duration over 3000ms (slow functions)
```

---

## Environment Strategy

### Three-Environment Pattern

| Environment | Branch | Purpose |
|------------|--------|---------|
| Production | `main` | Live users |
| Staging | `staging` | QA and acceptance testing |
| Preview | any other branch | Feature review |

**Vercel env var setup per environment:**
```bash
# Production only
vercel env add DATABASE_URL production

# Staging only  
vercel env add DATABASE_URL preview --git-branch staging

# All preview deployments
vercel env add FEATURE_FLAGS_ENABLED preview
```

**Check what's configured:**
```
Get the project details for "my-app" and show how many environment 
variables are set per environment (production / preview / development)
```

---

## Domain Management

### Add a Custom Domain

In Vercel dashboard or CLI:
```bash
vercel domains add myapp.com
```

Then verify DNS propagation:
```
Check if the domain "myapp.com" is currently pointing to Vercel 
by fetching its content via get_access_to_vercel_url
```

### Domain Availability Check

Before buying a domain:
```
Check if these domains are available and show prices:
- effikit.dev
- effikit.app  
- effikit.io
```

---

## Rollback Strategy

Vercel keeps all deployments — rolling back is instant:

1. Get the deployment ID of the last stable version:
```
List the last 10 production deployments for "my-app" 
— show ID, date, and status
```

2. In Vercel dashboard: **Deployment → Promote to Production**  
   (The MCP server doesn't expose a direct "promote" tool — use dashboard for this step)

3. Confirm the rollback:
```
Get the current production deployment for "my-app" — confirm 
which deployment ID is now live
```

---

## Edge vs Serverless Functions

**Serverless (default):**
- Runs in Node.js runtime
- Cold starts: 200-800ms
- Use for: database queries, auth, complex business logic

**Edge (opt-in):**
```typescript
export const runtime = 'edge'; // add to any route file
```
- Runs in V8 isolate — no Node.js APIs
- Cold starts: <50ms
- Use for: geolocation, A/B testing, auth token validation, rewrites

**Ask Claude to audit:**
```
Look at my Vercel runtime logs for "my-app" and identify which API 
routes have the highest P99 latency — those are candidates for edge runtime
```

---

## Monorepo Deployments

If you have multiple apps in one repo:

```json
// vercel.json at repo root
{
  "projects": [
    { "src": "apps/web/**", "dest": "apps/web" },
    { "src": "apps/api/**", "dest": "apps/api" }
  ]
}
```

Or use separate Vercel projects pointing to the same repo with different `rootDirectory` settings:

```
Get project details for "my-web-app" and "my-api-app" 
— compare their rootDirectory and buildCommand settings
```
