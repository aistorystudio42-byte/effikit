<!-- @keywords: performance monitoring, profiling, APM, benchmarking, load testing, bottleneck detection -->

# .github/workflows/performance.yml

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to monitoring.

## Principles

### Load Testing
```typescript
// k6 — scripted load testing
// k6.io/docs

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    // Gradual ramp-up: find breaking point
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },   // ramp to 50 users in 1 min
        { duration: '3m', target: 50 },   // hold at 50 for 3 min
        { duration: '1m', target: 200 },  // ramp to 200
        { duration: '3m', target: 200 },  // hold at 200
        { duration: '1m', target: 0 },    // ramp down
      ],
    },
    // Spike test: sudden traffic burst
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 500 }, // instant spike
        { duration: '1m',  target: 500 }, // hold
        { duration: '10s', target: 0 },   // instant drop
      ],
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // P95 < 500ms
    'http_req_failed': ['rate<0.01'],                  // < 1% errors
    'errors': ['rate<0.01'],
  },
};

export default function() {
  const response = http.post('http://localhost:3000/api/auth/login', JSON.stringify({
    email: 'test@example.com',
    password: 'TestPassword123',
  }), { headers: { 'Content-Type': 'application/json' } });

  const success = check(response, {
    'status is 200': r => r.status === 200,
    'has access token': r => JSON.parse(r.body).data?.accessToken !== undefined,
    'response time < 500ms': r => r.timings.duration < 500,
  });

  errorRate.add(!success);
  sleep(1);
}
```

```bash
k6 run load-test.js

```

---

### Continuous Performance Testing in CI
```yaml
name: Performance Tests

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'  # daily at 6am

jobs:
  perf-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Start application
        run: docker-compose up -d && sleep 30
      - name: Run k6 load test
        uses: grafana/k6-action@v0.3.1
        with:
          filename: tests/performance/api.js
          flags: '--out json=results.json'
      - name: Check thresholds
        run: |
          P99=$(cat results.json | jq '.metrics.http_req_duration.values."p(99)"')
          if (( $(echo "$P99 > 1000" | bc -l) )); then
            echo "P99 latency $P99ms exceeds 1000ms threshold"
            exit 1
          fi
      - uses: actions/upload-artifact@v4
        with:
          name: perf-results
          path: results.json
```

---

### Profiling in Production
```typescript
// Clinic.js: non-invasive production profiling

// 1. CPU profiling — identify hot functions
// Run: clinic flame -- node src/main.js
// Then send real traffic, ctrl+C to stop
// Opens flame graph in browser

// 2. Event loop delay — detect blocking code
// Run: clinic bubbleprof -- node src/main.js

// 3. Memory leak detection
// Run: clinic heapprofile -- node src/main.js

// Manual V8 profiling
import v8Profiler from 'v8-profiler-next';

// Start profiling for 30 seconds
v8Profiler.startProfiling('30s-sample', true);
setTimeout(() => {
  const profile = v8Profiler.stopProfiling('30s-sample');
  profile.export((error, result) => {
    fs.writeFileSync(`profile-${Date.now()}.cpuprofile`, result);
    profile.delete();
  });
}, 30_000);
// Open .cpuprofile in Chrome DevTools → Performance tab
```

---

### Performance Regression Detection
```typescript
// Track performance baselines and alert on regression

interface PerformanceBaseline {
  endpoint: string;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  measuredAt: Date;
}

class PerformanceTracker {
  async checkRegression(
    current: PerformanceBaseline,
    baseline: PerformanceBaseline,
    threshold = 1.3, // 30% regression threshold
  ): Promise<RegressionReport> {
    const regressions = [];

    if (current.p99Ms > baseline.p99Ms * threshold) {
      regressions.push({
        metric: 'P99',
        baseline: baseline.p99Ms,
        current: current.p99Ms,
        change: `+${((current.p99Ms / baseline.p99Ms - 1) * 100).toFixed(1)}%`,
      });
    }

    return { endpoint: current.endpoint, regressions, isRegression: regressions.length > 0 };
  }
}
```

---

### APM Integration
```typescript
// Datadog APM — automatic instrumentation
import 'dd-trace/init'; // must be first import

// Custom spans for business operations
import tracer from 'dd-trace';

async function processCheckout(orderId: string) {
  return tracer.trace('checkout.process', { resource: 'processCheckout' }, async (span) => {
    span.setTag('orderId', orderId);

    const order = await tracer.trace('checkout.db.load', async () => {
      return orderRepo.findById(orderId);
    });

    const payment = await tracer.trace('checkout.payment', async (paymentSpan) => {
      paymentSpan.setTag('amount', order.total);
      return paymentService.charge(order);
    });

    span.setTag('paymentStatus', payment.status);
    return { order, payment };
  });
}
```

---

## Decision Framework

Performance degrades silently. A query that takes 50ms today may take 500ms after 6 months of data growth. Continuous monitoring catches regressions before users do.

```
Monitor in layers:
  Synthetic    → scheduled tests against known scenarios (always available)
  Real User    → actual users' experience (true performance)
  Profiling    → deep investigation when symptoms appear

Alert on symptoms, not causes:
  Good alert: "P99 latency on /checkout > 2s"
  Bad alert:  "CPU > 80%" (CPU spikes don't always affect users)
```

---

## Anti-Patterns

- Over-engineering the solution.
- Ignoring context and copying blindly.
- Mixing concerns unnecessarily.

## Example in Action

- [ ] P50/P95/P99 latency tracked per endpoint in production
- [ ] Error rate tracked and alerted (threshold: > 1%)
- [ ] Load tests run in CI on main branch
- [ ] Performance baselines established — alert on > 30% regression
- [ ] Daily synthetic monitoring (detects degradation between releases)
- [ ] Real user monitoring (RUM) collecting actual user experience
- [ ] Flame graph profiling done on any endpoint with P99 > 500ms
- [ ] Database slow query log reviewed weekly
- [ ] Memory usage trended (detect slow leaks before they become outages)
