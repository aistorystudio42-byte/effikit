<!-- @keywords: debugging tools, Chrome DevTools, breakpoints, network tab, React DevTools, logging, profiler -->

# Debugging — Tools and Techniques

## Browser DevTools Mastery

### Console Beyond console.log
```javascript
// Group related logs
console.group('Auth Flow');
console.log('token:', token);
console.log('user:', user);
console.groupEnd();

// Table view for arrays of objects
console.table(users); // renders as sortable table

// Measure performance
console.time('data-transform');
const result = heavyTransform(data);
console.timeEnd('data-transform'); // "data-transform: 23.4ms"

// Conditional log — only when condition is false
console.assert(user !== null, 'User should not be null here', { user, context });

// Stack trace at any point
console.trace('Who called this?');
```

### Breakpoints — More Than Just `debugger`
```javascript
// Conditional breakpoint (right-click line in DevTools → Add conditional breakpoint)
// Breaks only when: user.id === '123' && order.status === 'pending'

// Logpoint (right-click → Add logpoint) — log without pausing
// Expression: `user logged in: ${user.email} at ${new Date().toISOString()}`

// DOM mutation breakpoint
// Right-click DOM node → Break on → Subtree modifications
// Pauses when anything changes the DOM under this node

// XHR/Fetch breakpoint
// Sources → XHR/fetch breakpoints → Add URL containing: "api/orders"
// Pauses before every request to that URL
```

### Network Tab Investigation
```
Status 0 → CORS blocked or browser cancelled request
Status 304 → Cached response served (check ETag/If-None-Match headers)
Status 401 → Auth header missing or expired
Status 422 → Look at response body for validation errors
Status 500 → Server error — check response body and server logs

Request inspection:
  Headers tab → verify Authorization header exists and correct
  Payload tab → verify request body matches what API expects
  Response tab → actual error message from server
  Timing tab → identify network latency vs server processing time
```

---

## React DevTools

### Component Inspector
```
React DevTools → Components tab
- Click any component → see props, state, context
- Search by component name
- Highlight updates (Settings → Highlight updates when components render)
  → Flashing components are re-rendering — if unexpected, investigate

Hooks panel:
- Shows all hooks in order with current values
- useState: shows current value
- useEffect: shows last called with dependencies
- Custom hooks: shows return values
```

### Profiler
```
React DevTools → Profiler tab
1. Click Record
2. Perform the slow action
3. Stop recording
4. Analyze the flame chart

What to look for:
- Tall bars → long render time
- Wide bars → many components re-rendering
- Gray bars → components that didn't render (good)
- Orange bars → components that rendered but didn't change (wasted render → memo)

Commit details panel:
- "Why did this render?" → shows which prop/state/context changed
```

---

## Node.js Debugging

### VS Code Debugger Setup
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API Server",
      "program": "${workspaceFolder}/src/main.ts",
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "NODE_ENV": "development"
      },
      "sourceMaps": true,
      "restart": true,
      "protocol": "inspector"
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Running Process",
      "port": 9229,
      "restart": true,
      "sourceMaps": true
    }
  ]
}
```

```bash
# Start Node with inspector
node --inspect src/main.js         # attach debugger
node --inspect-brk src/main.js    # pause at first line

# For ts-node
ts-node --inspect src/main.ts

# Attach Chrome DevTools: chrome://inspect
```

### Async Debugging Patterns
```typescript
// Unhandled promise rejection tracking
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // In production: send to error tracker
});

// Promise chain debugging — add .then() inspectors
fetchUser(id)
  .then(user => {
    console.log('fetchUser resolved:', user);
    return fetchOrders(user.id);
  })
  .then(orders => {
    console.log('fetchOrders resolved:', orders);
    return processOrders(orders);
  });

// Async/await with try-catch specificity
try {
  const user = await fetchUser(id);
  try {
    const orders = await fetchOrders(user.id);
  } catch (ordersError) {
    // Handle fetchOrders error specifically
    console.error('Failed to fetch orders:', ordersError);
  }
} catch (userError) {
  // Handle fetchUser error specifically
  console.error('Failed to fetch user:', userError);
}
```

---

## Logging for Debuggability

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(process.env.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty' } }  // human readable
    : {}),                                         // JSON in production
});

// Structured logging — machine-parseable, grep-friendly
logger.info({ userId: user.id, orderId: order.id, action: 'order.created' }, 'Order created');

// Correlation ID — trace a request across services
const requestLogger = logger.child({ requestId: crypto.randomUUID() });
// All logs from this request share the same requestId

// Error logging with context
logger.error({
  err: error,           // pino serializes Error correctly
  userId: req.user?.id,
  path: req.path,
  body: req.body,       // careful with sensitive data
}, 'Request failed');
```

---

## Memory Leak Detection

```typescript
// Node.js heap snapshot
const v8 = require('v8');
const fs = require('fs');

// Take snapshot before suspected leak
const snapshot1 = v8.writeHeapSnapshot('./heap1.heapsnapshot');

// Do the operation that might leak
for (let i = 0; i < 1000; i++) operationThatMightLeak();

// Take snapshot after
const snapshot2 = v8.writeHeapSnapshot('./heap2.heapsnapshot');

// Open both in Chrome DevTools → Memory tab → Load snapshot
// Compare to find objects that grew

// Quick memory check
setInterval(() => {
  const used = process.memoryUsage();
  console.log({
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
    rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
  });
}, 10_000);
```

---

## Production Debugging Without Downtime

```typescript
// Feature flags for diagnostic logging
const isDiagnosticMode = featureFlags.isEnabled('diagnostic-logging', userId);

if (isDiagnosticMode) {
  logger.debug({ fullContext: request }, 'Detailed request trace');
}

// Source maps in production — readable stack traces
// tsconfig.json: "sourceMap": true
// Deploy .map files alongside .js files
// Use source-map-support: require('source-map-support').install();

// Error boundary with context capture
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    errorTracker.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
        userId: this.context.user?.id,
        route: window.location.pathname,
      }
    });
  }
}
```
