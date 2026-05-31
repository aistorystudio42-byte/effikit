<!-- @keywords: production debugging, error tracking, logs, monitoring, alerts, incident response, Sentry -->

# Debugging — Production Issues and Incident Response

## Production Debugging Constraints

In production, you can't:
- Add random console.logs and refresh
- Set breakpoints and step through code
- Access user's browser directly
- Reproduce every issue locally

What you have instead:
- Structured logs
- Error tracking (Sentry, Datadog)
- Metrics and traces
- Deployment history

The discipline of production debugging is building **observability** before incidents happen.

---

## Error Tracking Setup

```typescript
// Sentry — full context on every error
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.GIT_SHA, // tie errors to exact deploy

  // Sample 100% in staging, 10% in production (cost vs coverage tradeoff)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  beforeSend(event, hint) {
    // Don't send expected errors to Sentry — reduce noise
    const error = hint.originalException;
    if (error instanceof NotFoundError) return null;
    if (error instanceof ValidationError) return null;
    return event;
  },
});

// Attach user context to every subsequent error in this request
Sentry.setUser({ id: user.id, email: user.email });

// Add custom context
Sentry.setContext('order', { orderId: order.id, status: order.status });

// Manual capture with full context
Sentry.captureException(error, {
  extra: {
    userId: req.user?.id,
    requestBody: req.body,
    requestPath: req.path,
  },
  tags: {
    feature: 'checkout',
    paymentProvider: 'stripe',
  },
});
```

---

## Structured Log Analysis

```typescript
// Write logs that are queryable
// Wrong: unstructured string
logger.info(`User ${userId} created order ${orderId} for $${amount}`);
// Can't filter by orderId without regex

// Correct: structured object
logger.info({
  event: 'order.created',
  userId,
  orderId,
  amountCents: amount,
  itemCount: items.length,
}, 'Order created');
// Can filter: event="order.created" AND userId="123"

// Log query examples (Datadog, CloudWatch, Loki)
// Find all errors for a user:
//   level=error userId=abc123
// Find slow requests:
//   duration_ms > 5000
// Find errors after deploy:
//   level=error timestamp > "2024-03-15T14:00:00Z"
// Trace a request:
//   requestId=550e8400-e29b-41d4-a716-446655440000
```

---

## Reading Stack Traces in Production

```
Production stack traces are minified. Two requirements to read them:
1. Source maps uploaded to error tracker or available
2. Release version tagged in errors

// Source map upload (CI/CD step)
sentry-cli releases files $VERSION upload-sourcemaps ./dist

// Stack trace in Sentry with source maps
UserController.createUser [users.controller.ts:45]
  ← this line previously showed: UserController.<anonymous> [bundle.js:1:42389]

Without source maps, you're reading minified bundle line numbers.
Always upload source maps for every deployment.
```

---

## Debugging by Log Correlation

```typescript
// Request ID ties all logs from one request together
// Even across service boundaries

// Middleware: generate + attach request ID
const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string ?? crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Attach to logger so all logs in this request have the ID
  req.logger = logger.child({ requestId });
  next();
};

// Forward to downstream services
const downstreamResponse = await fetch('http://payment-service/charge', {
  headers: {
    'X-Request-ID': req.requestId, // propagate correlation ID
    'Authorization': `Bearer ${serviceToken}`,
  },
});

// Now query: requestId = "550e8400" returns ALL logs across ALL services for this request
```

---

## Incident Response Protocol

### Immediate Steps (First 5 Minutes)
```
1. Assess impact
   - How many users affected? (error rate, unique users erroring)
   - Is it total outage or partial degradation?
   - Is it getting worse, stable, or recovering?

2. Check recent changes
   git log --since="2 hours ago" --oneline
   // Was there a deploy recently?
   // Infrastructure change?
   // Config change?

3. Quick rollback decision
   - If recent deploy and high impact → rollback first, debug after
   - If no recent change → dig deeper before acting

4. Communication
   - Acknowledge in status page / Slack immediately
   - "We are investigating elevated error rates in checkout"
   - Update every 15 minutes until resolved
```

### Investigation Steps
```
5. Narrow the scope
   - Which endpoints are affected?
   - Which user segments? (all, specific plan, specific region)
   - Since exactly when? (correlates with deploy, traffic spike, etc.)

6. Form hypotheses from evidence
   - Error logs: what's the actual error message?
   - Metrics: CPU, memory, DB connections, queue depth — what spiked?
   - Dependencies: is a downstream service degraded?

7. Fix or mitigate
   - Fix if root cause is clear
   - Mitigate if fix is risky (disable feature, return fallback response)
   - Rollback if mitigation isn't available

8. Verify recovery
   - Error rate returns to baseline
   - P99 latency normalizes
   - No new error types appearing
```

### Post-Incident Review
```
Write a blameless post-mortem within 48 hours:

Title: [Severity] Brief description of incident
Date: 2024-03-15
Duration: 47 minutes
Impact: ~3,200 users unable to complete checkout

Timeline:
  14:23 — Deploy v2.3.1 with payment flow changes
  14:31 — Checkout error rate rises from 0.1% to 18%
  14:35 — First PagerDuty alert fires
  14:38 — On-call identifies correlation with deploy
  14:45 — Rollback decision made
  14:52 — v2.3.0 rolled back, error rate begins declining
  15:10 — Error rate returns to baseline

Root Cause:
  The new coupon validation code called payment provider API synchronously,
  causing 30-second timeouts that cascaded into checkout failures.

Contributing Factors:
  - No load test with coupon codes before deploy
  - Timeout not configured on payment API call

Action Items:
  [ ] Add timeout to all external API calls (3 days)
  [ ] Add integration test for checkout with coupon codes (1 week)
  [ ] Add checkout success rate to deployment dashboard (2 days)
```

---

## Alerting Strategy

```
Too few alerts → outages go undetected
Too many alerts → alert fatigue → alerts ignored

Good alert rules:
  - Alerts on symptoms (user impact), not causes (CPU usage)
  - "Checkout error rate > 1% for 5 minutes" (symptom)
  - Not "CPU > 80%" (cause — might not affect users)

Key metrics to alert on:
  - Error rate (by endpoint or overall)
  - P99 latency (not average — outliers matter)
  - Successful transaction rate (orders, signups)
  - Queue depth (if growing → workers struggling)
  - Disk usage (if nearing full → DB will crash)
```
