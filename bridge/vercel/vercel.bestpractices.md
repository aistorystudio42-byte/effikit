<!-- @keywords: vercel, best practices, performance, caching, cold start, edge, ISR, build optimization, security headers -->
<!-- @domain: Vercel MCP Server — Best Practices & Optimization -->

# Vercel MCP Server — Best Practices & Optimization

## Build Performance

### Optimize Build Times

**Enable build cache** — Vercel caches `node_modules` and framework build artifacts between deployments. If your builds are slow, check what's busting the cache:

```
Get build logs for the last 3 deployments of "my-app" 
— look for "Cache MISS" or "cache invalidated" messages
```

**Common cache-busters to avoid:**
- `npm install` with floating versions (`^` or `~`) — lock with `package-lock.json`
- Generating files in `node_modules` during build (use `postinstall` carefully)
- Using `Date.now()` or random values in build-time code

**Build time targets:**
| App Size | Acceptable | Warning | Action Required |
|----------|-----------|---------|-----------------|
| Small (<50 pages) | <60s | 60-120s | >120s |
| Medium (50-200 pages) | <180s | 180-300s | >300s |
| Large (200+ pages) | <300s | 300-600s | >600s |

### Dependency Pruning

```bash
# Analyze what's in your bundle
npx @next/bundle-analyzer

# Check for duplicate packages
npx npm-dedupe
```

---

## Caching Strategy

### Static Assets

Vercel serves static assets from its CDN with long-lived cache headers automatically. Don't override these unless necessary:

```
Cache-Control: public, max-age=31536000, immutable
```

Files in `/public` get this header. Content-addressed filenames (Webpack/Vite default) ensure cache invalidation on change.

### Incremental Static Regeneration (ISR)

For pages that change occasionally but don't need per-request data:

```typescript
// Next.js App Router
export const revalidate = 60; // seconds

// Next.js Pages Router
export async function getStaticProps() {
  return { props: { data }, revalidate: 60 };
}
```

**ISR vs on-demand revalidation:**
```typescript
// On-demand: revalidate when data actually changes (webhook, form submit)
import { revalidatePath } from 'next/cache';
revalidatePath('/blog/[slug]', 'page');
```

---

## Security Headers

Always set security headers — Vercel doesn't add them by default:

```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;"
        }
      ]
    }
  ]
}
```

**Strict CSP with nonces (Next.js middleware):**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export function middleware() {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const response = NextResponse.next();
  response.headers.set('x-nonce', nonce);
  return response;
}
```

---

## Function Performance

### Cold Start Reduction

**Keep functions small** — bundle only what the function uses:

```typescript
// ❌ Imports entire library
import _ from 'lodash';

// ✅ Tree-shakeable import
import { debounce } from 'lodash-es';
```

**Avoid heavy initialization at module level:**
```typescript
// ❌ Runs on every cold start
const heavyClient = new HeavySDK({ config: loadLargeConfig() });

// ✅ Initialize lazily, reuse across warm invocations  
let client: HeavySDK | null = null;
function getClient() {
  if (!client) client = new HeavySDK({ config: loadLargeConfig() });
  return client;
}
```

### Streaming Responses

For long-running AI or data operations, stream instead of waiting:

```typescript
export async function POST(req: Request) {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // Start long operation without blocking response
  processLongOperation(writer);
  
  return new Response(stream.readable, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

---

## What NOT to Do

| Action | Problem | Alternative |
|--------|---------|-------------|
| Store secrets in vercel.json | Committed to repo, leaked | Use Vercel Dashboard env vars |
| Use `force: true` on deploys | Skips cache, always slow | Only use when debugging cache issues |
| Deploy directly to prod without preview | No validation step | Always test preview URL first |
| Use serverless for WebSockets | Functions timeout after 30s | Use Vercel's Realtime or a dedicated WS service |
| Load large files from `/public` at runtime | CDN doesn't compress efficiently | Use `next/image` or optimize at build time |
| Set `maxDuration` to max (300s) on all routes | Keeps connections open, costs more | Set per-route based on actual P99 |

---

## Cost Optimization

**Understand what costs money on Vercel:**
- **Function invocations:** Each API call = one invocation
- **Function execution time:** `duration × memory`
- **Bandwidth:** Outbound data transfer
- **Build minutes:** Time spent building

**Reduce invocations:**
```typescript
// Cache API responses at the edge
export const runtime = 'edge';
export const revalidate = 300; // 5 minutes — serves from cache
```

**Reduce bandwidth:**
- Use `next/image` — automatic format conversion (WebP/AVIF) + resizing
- Enable Vercel's built-in compression (automatic for text responses)
- Paginate API responses instead of returning full datasets

**Monitor costs:**
```
Get deployment stats for "my-app" from the last 30 days 
— show invocation count and bandwidth usage
```
