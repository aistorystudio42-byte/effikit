<!-- @keywords: profiling, performance analysis, bottleneck, flame graph, CPU profile, memory profile, benchmark -->
<!-- @domain: Performance Analysis & Profiling Prompts -->

# Performance Analysis Prompts

## Profiling a Node.js Application

```
Profile this Node.js application and identify performance bottlenecks.

**Profiling method:**

**CPU Profiling:**
```bash
# Built-in profiler
node --prof server.js
# Make some requests
node --prof-process isolate-*.log > profile.txt

# Or with 0x (flame graph)
npx 0x -- node server.js
# Access flame graph at http://localhost:PORT
```

**Clinic.js (comprehensive):**
```bash
npm install -g clinic
clinic doctor -- node server.js     # general diagnostics
clinic flame -- node server.js      # CPU flame graph
clinic bubbleprof -- node server.js # async operations
```

**Reading the flame graph:**
- Wide bars = functions spending a lot of CPU time
- Look for user code (your app) vs V8 internals
- Self time (excluding children) vs total time

**Common bottlenecks in Node.js:**
1. JSON.parse/stringify on large objects in request/response cycle
2. Synchronous crypto operations (use async versions)
3. Regex with catastrophic backtracking on user input
4. Long-running computations on main thread (use Worker)
5. event emitter with many listeners accumulating

**Paste your profile data:**
[paste flame graph description or profiler output]

**Analysis needed:**
- Top 5 functions by CPU time
- Which of these are from your code vs dependencies
- Optimization for each
```

---

## Benchmark Comparison

```
Benchmark these implementations and tell me which is faster.

**What's being benchmarked:**
[describe what you're comparing — two sorting algorithms / two API clients / 
two JSON parsing approaches / etc.]

**Implementation A:**
```typescript
[paste implementation A]
```

**Implementation B:**
```typescript
[paste implementation B]
```

**Benchmark using Vitest bench:**
```typescript
import { bench, describe } from 'vitest';

describe('Implementation Comparison', () => {
  // Setup data outside the benchmark
  const testData = [...]; // realistic sample data
  
  bench('Implementation A', () => {
    implementationA(testData);
  });
  
  bench('Implementation B', () => {
    implementationB(testData);
  });
});
```

**Run:**
```bash
npx vitest bench --reporter=verbose
```

**What to report:**
- Ops/second for each
- Margin of error
- Memory usage (if testable)
- Recommendation with caveat (micro-benchmarks don't always predict real-world)

**Important:** test with realistic data sizes, not tiny toy examples.
```

---

## Flame Graph Analysis

```
Analyze this flame graph and tell me where to optimize.

**Flame graph data:**
[paste or describe the flame graph — which functions are widest]

**Flame graph reading guide:**

**Width = time:** wider bar = more time spent in that function (including children)
**Self time:** the portion of the bar that isn't covered by children below it
**Color:** typically orange/red = hot (frequently sampled), blue/green = cool

**What to look for:**
1. Wide bars in your own code (not Node.js internals)
2. Functions that appear many times at different stack positions (called frequently)
3. Functions with large self time (doing work themselves, not delegating)
4. I/O callbacks that take longer than expected
5. Promise resolution chains that are unexpectedly long

**For each hot spot found:**
- Function name and module
- % of total CPU time
- Why it might be slow (algorithm / repeated work / missing cache)
- Optimization suggestion
- Expected improvement (rough estimate)
```

---

## Algorithmic Complexity Analysis

```
Analyze the time and space complexity of this code and suggest improvements.

**Code:**
[paste algorithm or function]

**Analyze:**
1. **Time complexity:**
   - Identify all loops and their nesting level
   - Identify recursive calls and their depth
   - Big-O notation for the overall function
   - Best case / average case / worst case if they differ

2. **Space complexity:**
   - Identify data structures that grow with input size
   - Stack depth for recursive functions
   - Big-O for space usage

3. **Comparison to optimal:**
   - What's the theoretical optimal complexity for this problem?
   - Is there a gap? Why?

4. **Optimization path:**
   - If current is O(n²), what would it take to get to O(n log n) or O(n)?
   - What's the trade-off? (space vs time, code complexity vs performance)

5. **Practical threshold:**
   - At what input size does the current complexity become problematic?
   - Given our expected input sizes [N], is optimization needed?

**Output:** complexity analysis + improved implementation if optimization is warranted.
```

---

## Performance Regression Detection

```
Detect and investigate a performance regression.

**Regression details:**
- Metric: [API latency / page load / throughput / memory]
- Before: [X ms / N req/sec]
- After: [Y ms / M req/sec]
- When regression appeared: [after deploy on date / after reaching N users / gradual]

**Investigation approach:**

**Step 1 — Confirm the regression:**
```bash
# Compare before/after with the same load test
k6 run --vus 50 --duration 30s load-test.js  # before (use git bisect to find commit)
git checkout [commit before regression]
k6 run --vus 50 --duration 30s load-test.js  # after
```

**Step 2 — Isolate to a commit (git bisect):**
```bash
git bisect start
git bisect bad HEAD         # current version is slow
git bisect good v2.1.0      # this version was fast
# Git checks out middle commit — test performance
# Mark as good or bad until the culprit commit is found
git bisect good/bad
```

**Step 3 — Identify the cause in the culprit commit:**
Look for:
- Database query changes (added a join, removed an index)
- Added a synchronous operation in async path
- Increased payload size (added fields to API response)
- New middleware that runs on every request
- New dependency with performance issues
- Memory leak causing GC pressure over time

**Step 4 — Fix:**
[describe fix based on root cause]
[add a performance test to prevent regression of this specific metric]
```

---

## Load Testing Plan

```
Create a load testing plan for: [application / feature]

**Load testing scenarios:**

**Scenario 1 — Normal load:**
- Users: [N concurrent]
- Duration: [30 minutes]
- Request mix: [70% reads, 20% writes, 10% admin]
- Target: [P99 <500ms, error rate <0.1%]

**Scenario 2 — Peak load:**
- Users: [5× normal]
- Duration: [15 minutes]
- Target: [P99 <2s, error rate <1%, no crashes]

**Scenario 3 — Spike test:**
- Ramp from 0 → [10× normal] in 30 seconds
- Hold for 5 minutes
- Target: [system degrades gracefully — not crash]

**Scenario 4 — Soak test:**
- Users: [2× normal]
- Duration: [4 hours]
- Target: [no memory leak — stable RSS throughout]

**k6 implementation:**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration', true);

export const options = {
  scenarios: {
    normal_load: {
      executor: 'constant-vus',
      vus: [N],
      duration: '30m',
    },
  },
  thresholds: {
    http_req_duration: ['p(99)<500'],
    errors: ['rate<0.001'],
  },
};

export default function() {
  // Mix of operations matching real traffic
  const responses = http.batch([
    ['GET', 'http://localhost:3000/api/posts'],
    ['GET', `http://localhost:3000/api/users/${Math.floor(Math.random() * 1000)}`],
  ]);
  
  check(responses[0], { 'posts 200': (r) => r.status === 200 });
  apiDuration.add(responses[0].timings.duration);
  errorRate.add(responses[0].status !== 200);
  
  sleep(1);
}
```

Write the complete test plan for: [your specific load testing requirements].
```
