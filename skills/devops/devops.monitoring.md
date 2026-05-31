<!-- @keywords: monitoring, observability, metrics, logs, traces, alerting, Prometheus, Grafana, OpenTelemetry -->

# DevOps — Monitoring and Observability

## The Three Pillars of Observability

```
Logs     → What happened? (events with context)
Metrics  → How is the system performing? (numbers over time)
Traces   → Why did this request take so long? (distributed request path)
```

Observability is not installed after deployment — it's built in during development.

---

## Structured Logging

```typescript
import pino from 'pino';

// Single logger instance per service
const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: {
    service: 'api',
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
  },
  ...(process.env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
});

// Request logging middleware — every request gets a correlation ID
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string ?? crypto.randomUUID();
  const startTime = Date.now();

  req.log = logger.child({ requestId, userId: req.user?.id });
  res.setHeader('X-Request-ID', requestId);

  res.on('finish', () => {
    req.log.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startTime,
      userAgent: req.headers['user-agent'],
    }, 'request completed');
  });

  next();
};

// Structured business events — queryable in log aggregator
req.log.info({ event: 'order.created', orderId, userId, totalCents }, 'Order created');
req.log.warn({ event: 'auth.failed', email, ip: req.ip, reason: 'wrong_password' }, 'Login failed');
req.log.error({ event: 'payment.failed', orderId, error: err.message }, 'Payment processing error');
```

---

## Metrics with Prometheus

```typescript
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

const registry = new Registry();

// Request metrics
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

// Business metrics
const ordersCreated = new Counter({
  name: 'orders_created_total',
  help: 'Total orders created',
  labelNames: ['payment_method', 'tier'],
  registers: [registry],
});

const activeWebsocketConnections = new Gauge({
  name: 'websocket_connections_active',
  help: 'Current active WebSocket connections',
  registers: [registry],
});

// Metrics middleware
const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const labels = { method: req.method, route: req.route?.path ?? req.path, status_code: res.statusCode };
    end(labels);
    httpRequestsTotal.inc(labels);
  });
  next();
};

// Scrape endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});
```

---

## Distributed Tracing with OpenTelemetry

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, SpanStatusCode } from '@opentelemetry/api';

// Initialize once at startup
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'api',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION,
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
});
sdk.start();

// Manual span creation for critical operations
const tracer = trace.getTracer('api');

async function processOrder(orderId: string) {
  return tracer.startActiveSpan('processOrder', async (span) => {
    span.setAttributes({ 'order.id': orderId });

    try {
      const order = await tracer.startActiveSpan('db.fetchOrder', async (dbSpan) => {
        const result = await orderRepo.findById(orderId);
        dbSpan.end();
        return result;
      });

      span.end();
      return order;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.end();
      throw error;
    }
  });
}
```

---

## Alerting Rules

```yaml
# prometheus/alerts.yml
groups:
  - name: api
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status_code=~"5.."}[5m])) /
          sum(rate(http_requests_total[5m])) > 0.01
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Error rate above 1%"
          description: "{{ $value | humanizePercentage }} of requests are failing"

      # High latency
      - alert: HighP99Latency
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route)
          ) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 latency above 2s on {{ $labels.route }}"

      # Low success rate for orders
      - alert: OrderCreationFailing
        expr: |
          sum(rate(orders_created_total[5m])) /
          sum(rate(http_requests_total{route="/api/orders",method="POST"}[5m])) < 0.95
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "Order creation success rate below 95%"
```

---

## Grafana Dashboard Key Panels

```
Row 1: Traffic
  - Requests per second (by endpoint)
  - Error rate (%) over time
  - P50/P95/P99 latency

Row 2: Saturation
  - CPU usage (%)
  - Memory usage (bytes)
  - Active DB connections
  - Queue depth

Row 3: Business
  - Orders created per minute
  - Revenue per hour
  - Active users

Row 4: Dependencies
  - DB query latency
  - Redis latency
  - External API latency and error rate
```

---

## Observability Checklist

- [ ] Structured JSON logging in production (no plain text logs)
- [ ] Request IDs generated and propagated through all service calls
- [ ] Prometheus metrics exported (`/metrics` endpoint)
- [ ] RED metrics tracked per endpoint (Rate, Errors, Duration)
- [ ] Business metrics tracked (orders, signups, revenue)
- [ ] Distributed tracing enabled (OpenTelemetry or similar)
- [ ] Alerting rules cover: high error rate, high latency, disk space, queue depth
- [ ] Runbook linked in every alert (what to do when it fires)
- [ ] Grafana dashboard with traffic, saturation, errors, business metrics
