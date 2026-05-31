<!-- @keywords: monitoring, observability, metrics, alerting, logging, tracing, APM, OpenTelemetry -->
<!-- @domain: Performance Monitoring & Observability Prompts -->

# Performance Monitoring Prompts

## Observability Stack Design

```
Design an observability stack for: [application]

**The three pillars of observability:**

**1. Metrics — "Is something wrong?"**
Numerical measurements over time.

```typescript
// OpenTelemetry metrics
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('my-app');
const httpRequestDuration = meter.createHistogram('http_request_duration_ms', {
  description: 'Duration of HTTP requests in milliseconds',
  unit: 'ms',
  boundaries: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
});

const activeConnections = meter.createUpDownCounter('active_connections');

// In request handler
const start = Date.now();
// ... handle request ...
httpRequestDuration.record(Date.now() - start, {
  method: req.method,
  route: req.route.path,
  status: String(res.statusCode),
});
```

**Key metrics to track:**
- HTTP: request rate, error rate, latency percentiles (P50/P95/P99)
- Database: query count, duration, error rate, connection pool usage
- Cache: hit rate, miss rate, eviction rate
- Business: orders/minute, signups/hour, revenue/minute

**2. Logs — "What happened?"**
Structured events with context.

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: {
    level: (label) => ({ level: label }), // structured level field
  },
});

// Structured logging — every field is queryable
logger.info({
  event: 'user.login',
  userId: user.id,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  duration: Date.now() - requestStart,
}, 'User logged in successfully');

logger.error({
  event: 'payment.failed',
  userId: user.id,
  orderId: order.id,
  errorCode: paymentError.code,
  err: paymentError, // pino serializes Error objects nicely
}, 'Payment processing failed');
```

**3. Traces — "Where did it go?"**
Distributed request traces across services.

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('my-app');

async function fetchUserWithPosts(userId: string) {
  return tracer.startActiveSpan('fetchUserWithPosts', async (span) => {
    span.setAttributes({ 'user.id': userId });
    try {
      const [user, posts] = await Promise.all([getUser(userId), getPosts(userId)]);
      span.setStatus({ code: SpanStatusCode.OK });
      return { user, posts };
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      span.end();
    }
  });
}
```

Design the complete stack for: [your infrastructure].
```

---

## Alerting Rules Design

```
Design alerting rules for: [application]

**Alerting philosophy:**
Alert on symptoms (user-facing impact), not causes.
Alert on things that require human action.
Don't alert on things that resolve themselves.

**SLO-based alerting:**

Define SLOs first:
- Availability: [99.9% — allows 43 minutes downtime/month]
- Latency: [P99 < 500ms for 95% of requests]
- Error rate: [< 0.1% of requests return 5xx]

**Alert rules:**

**P1 — Pages oncall immediately:**
```yaml
# Error rate spike
- name: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Error rate above 5% for 2 minutes"
    runbook: "https://runbooks.internal/high-error-rate"

# Latency spike
- name: HighLatencyP99
  expr: histogram_quantile(0.99, rate(http_request_duration_ms_bucket[5m])) > 2000
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "P99 latency above 2s for 5 minutes"
```

**P2 — Notify in 1 hour:**
```yaml
# Elevated error rate (not critical yet)
- name: ElevatedErrorRate
  expr: rate(http_requests_total{status=~"5.."}[15m]) / rate(http_requests_total[15m]) > 0.01
  for: 10m
  labels:
    severity: warning

# High memory usage
- name: HighMemoryUsage
  expr: process_resident_memory_bytes / 1e9 > 1.5  # > 1.5 GB
  for: 15m
  labels:
    severity: warning
```

**Anti-patterns to avoid:**
- Don't alert on individual errors (use error rate)
- Don't alert on CPU without latency impact (auto-scaling handles it)
- Don't alert outside business hours for low-priority issues

Design for: [your specific SLOs and infrastructure].
```

---

## Log Aggregation Strategy

```
Design a log aggregation and analysis strategy for: [application]

**Log sources:**
- Application logs: [where — stdout / files / CloudWatch]
- Web server logs: [nginx / Next.js]
- Database logs: [slow query log]
- Infrastructure logs: [container / VM]

**Structured logging standards:**

```typescript
// Every log entry must have these fields:
interface LogEntry {
  timestamp: string;    // ISO8601
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;      // 'api' | 'worker' | 'admin'
  traceId: string;      // for distributed tracing
  requestId: string;    // per-request correlation
  message: string;
  [key: string]: unknown; // event-specific fields
}
```

**Log aggregation stack:**

**Option A — Managed (simplest):**
- Vercel/Render/Railway: built-in log streaming
- CloudWatch Logs (AWS): automatic for Lambda / ECS
- Datadog / Logtail / Better Stack: paid but feature-rich

**Option B — Self-hosted:**
- Loki + Promtail + Grafana (best open-source stack)
- ELK stack (Elasticsearch + Logstash + Kibana — more powerful, more complex)

**Query patterns to support:**
```
# Find all errors for a user
{service="api"} |= "error" | json | userId="user123"

# Trace a request across services  
{} | traceId="abc123"

# Slow request analysis
{service="api"} | json | duration > 1000
```

**Log retention policy:**
- Hot (queryable): 7-30 days
- Cold (archived): 1-7 years (compliance)
- Debug logs: 24 hours only (volume)

Design for: [your specific logging infrastructure].
```

---

## SLO Definition & Tracking

```
Define and implement SLOs for: [service]

**Service:** [name and description]
**Users:** [who uses it, what's their expectation]

**SLO Definition:**

**Availability SLO:**
```
SLO: 99.9% availability (measured monthly)
Budget: 43.8 minutes downtime per month

Good event: HTTP response status < 500 within 10 seconds
Bad event: HTTP status >= 500 OR response time > 10 seconds

Measurement: 
  good_requests / total_requests > 0.999
```

**Latency SLO:**
```
SLO: 95% of requests complete in < 300ms
SLO: 99% of requests complete in < 1000ms

Measurement (Prometheus):
  histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m])) < 300
```

**Implementation (error budget tracking):**
```typescript
// Track SLO compliance
async function getSloCompliance(windowDays: number = 30) {
  const [total, good] = await Promise.all([
    metrics.query('sum(http_requests_total)', windowDays),
    metrics.query('sum(http_requests_total{status!~"5.."})', windowDays),
  ]);
  
  const compliance = good / total;
  const budget = 1 - 0.999; // 0.1% error budget
  const burned = (1 - compliance) / budget;
  
  return {
    compliance: `${(compliance * 100).toFixed(3)}%`,
    errorBudgetRemaining: `${((1 - burned) * 100).toFixed(1)}%`,
    status: burned > 1 ? 'BUDGET_EXHAUSTED' : burned > 0.5 ? 'AT_RISK' : 'HEALTHY',
  };
}
```

Define SLOs for: [your specific service and user expectations].
```

---

## Distributed Tracing Setup

```
Set up distributed tracing for: [multi-service application]

**Services to trace:**
- [Service A]: [tech stack]
- [Service B]: [tech stack]
- [Service C]: [tech stack]

**OpenTelemetry setup (vendor-neutral):**

```typescript
// instrumentation.ts — Next.js (called before app starts)
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT, // Jaeger, Tempo, or managed service
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },  // DB queries
      '@opentelemetry/instrumentation-redis': { enabled: true }, // Cache
    }),
  ],
});

sdk.start();
```

**Context propagation (cross-service):**
```typescript
// Service A — inject trace context into outgoing request
const headers: Record<string, string> = {};
propagation.inject(context.active(), headers); // adds traceparent header
await fetch('http://service-b/api/action', { headers });

// Service B — extract trace context from incoming request
const ctx = propagation.extract(context.active(), req.headers);
context.with(ctx, () => {
  // All spans created here will be part of the same trace
  tracer.startActiveSpan('service-b-operation', (span) => {
    // ...
  });
});
```

**Backend options:**
- Jaeger (free, self-hosted)
- Grafana Tempo (free, integrates with Loki/Prometheus)
- Honeycomb / Datadog / New Relic (paid, managed)

Set up for: [your specific services and infrastructure].
```
