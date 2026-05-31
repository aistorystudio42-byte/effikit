<!-- @keywords: backend performance, profiling, throughput, latency, CPU, memory, Node.js optimization -->

# Performance — Backend Optimization

## Backend Performance Metrics

```
Throughput:     requests per second the system can handle
Latency:        time to respond to a single request
P50/P95/P99:    50th/95th/99th percentile latency
                P99 > P50 × 3 often indicates tail latency problem
Error rate:     % of requests returning 5xx
Saturation:     how close to capacity (CPU %, memory %, connection pool usage)
```

Optimize in order: **correctness first, then latency, then throughput**.

---

## Node.js Profiling

```bash
# CPU profiling — find hot functions
node --prof src/main.js
# Run load: autocannon http://localhost:3000/api/products
# Process profile
node --prof-process isolate-*.log > profile.txt
# Look for functions with high "self" time

# Heap snapshot — memory leak detection
node --inspect src/main.js
# Chrome DevTools → chrome://inspect → Memory tab → Take snapshot

# Clinic.js — automated Node.js profiling
npx clinic doctor -- node src/main.js
npx clinic flame -- node src/main.js  # flame graph
npx clinic bubbleprof -- node src/main.js  # async profile
```

---

## Async Performance Patterns

```typescript
// Pattern 1: Parallel independent operations
// Wrong: sequential awaits when operations are independent
const user = await userRepo.findById(userId);      // wait
const permissions = await permRepo.getByUser(userId); // wait
const settings = await settingsRepo.getByUser(userId); // wait

// Correct: parallel — 3x faster
const [user, permissions, settings] = await Promise.all([
  userRepo.findById(userId),
  permRepo.getByUser(userId),
  settingsRepo.getByUser(userId),
]);

// Pattern 2: Parallel with concurrency limit
// Don't overwhelm the database with 10,000 parallel queries
const processedOrders = await Promise.all(
  orders.map(order => processOrder(order)) // ✗ all at once
);

// Limit concurrency with p-limit
import pLimit from 'p-limit';
const limit = pLimit(10); // max 10 concurrent
const processedOrders = await Promise.all(
  orders.map(order => limit(() => processOrder(order))) // ✓ max 10 at once
);

// Pattern 3: Streaming large datasets (don't load everything in memory)
// Wrong: load all users into memory
const allUsers = await db.query('SELECT * FROM users'); // could be 1M rows
for (const user of allUsers) { await processUser(user); }

// Correct: stream with cursor
const cursor = db.queryCursor('SELECT * FROM users ORDER BY id');
for await (const user of cursor) {
  await processUser(user);
  // Only one row in memory at a time
}
```

---

## CPU-Bound Work

```typescript
// Node.js is single-threaded. CPU-intensive work blocks everything.

// Identify CPU-bound operations:
// - Complex calculations (statistics, ML inference, compression)
// - Synchronous file parsing (large JSON, CSV, XML)
// - Image/video processing
// - Cryptographic operations on large data

// Offload to Worker Threads
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import path from 'path';

// Main thread: dispatch to worker
function processHeavyReport(data: ReportData): Promise<Report> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'report.worker.js'), {
      workerData: data,
    });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
    });
  });
}

// report.worker.js — runs in separate thread
if (!isMainThread) {
  const report = generateReport(workerData); // heavy computation here
  parentPort!.postMessage(report);
}

// Worker pool (production) — reuse workers, avoid creation overhead
import Piscina from 'piscina';
const pool = new Piscina({ filename: './report.worker.js', maxThreads: 4 });
const report = await pool.run(data);
```

---

## Memory Optimization

```typescript
// Monitor memory usage
const memUsage = process.memoryUsage();
// heapUsed: objects in heap
// heapTotal: heap allocated from OS
// rss: total process memory (heap + stack + code)
// external: C++ objects (Buffers)

// Avoid: reading large files into memory at once
const content = fs.readFileSync('huge-file.csv', 'utf8'); // ✗ whole file in memory

// Correct: streaming
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const rl = createInterface({ input: createReadStream('huge-file.csv') });
for await (const line of rl) {
  await processLine(line); // one line at a time
}

// Avoid: unbounded caches
const cache = new Map();
someData.forEach(item => cache.set(item.id, item)); // grows forever

// Correct: bounded cache
import LRUCache from 'lru-cache';
const cache = new LRUCache({ max: 1000, ttl: 5 * 60 * 1000 });

// Avoid: closures capturing large objects
const bigData = loadGigabyteDataset();
function processItem(id: string) {
  return bigData.find(item => item.id === id); // bigData kept alive forever
}

// Correct: pass what you need, don't capture
function processItem(bigData: Map<string, Item>, id: string) {
  return bigData.get(id);
}
```

---

## HTTP Layer Performance

```typescript
// Response compression — reduces payload size significantly
import compression from 'compression';
app.use(compression({
  level: 6,      // 1-9, higher = more compression, more CPU
  threshold: 1024, // only compress responses > 1KB
}));

// HTTP/2 — multiplexing, header compression (configure at nginx/proxy level)
// HTTP/2 push: pre-send resources the browser will need
// (use sparingly — often backfires with caching)

// ETag / conditional requests — avoid sending unchanged data
import etag from 'etag';

app.get('/api/products/:id', async (req, res) => {
  const product = await productService.getById(req.params.id);
  const tag = etag(JSON.stringify(product));

  if (req.headers['if-none-match'] === tag) {
    return res.status(304).end(); // not modified — save bandwidth
  }

  res.setHeader('ETag', tag);
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  res.json(product);
});

// Keep-alive connections — avoid TCP handshake overhead
const server = app.listen(port);
server.keepAliveTimeout = 65_000; // keep connections alive for 65 seconds
server.headersTimeout = 66_000;   // must be > keepAliveTimeout
```

---

## Backend Performance Checklist

- [ ] P50/P95/P99 latency tracked in production
- [ ] Slow endpoints profiled with clinic.js or node --prof
- [ ] Independent async operations run in parallel (not sequential await)
- [ ] CPU-bound work offloaded to worker threads
- [ ] Large datasets streamed (not loaded into memory)
- [ ] In-memory caches are bounded (LRU with max size)
- [ ] Response compression enabled (gzip/brotli)
- [ ] ETags / conditional requests implemented for cacheable resources
- [ ] Connection pool size tuned (not default unlimited)
