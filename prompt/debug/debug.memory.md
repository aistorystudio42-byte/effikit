<!-- @keywords: memory leak, memory usage, heap, garbage collection, leak detection, profiling, browser memory -->
<!-- @domain: Memory Leak Detection Prompts -->

# Memory Leak Detection Prompts

## Browser Memory Leak

```
Help me find a memory leak in this browser application.

**Symptom:**
- Memory grows from [X MB] to [Y MB] over [Z minutes of use]
- Leak is triggered by: [navigating / clicking / refreshing / scrolling]
- Resolved by: [full page refresh only]

**Framework:** [React / Vue / Vanilla JS]
**Suspected components:**
[paste suspected component code]

**DevTools data (if available):**
[paste Memory tab snapshot comparison or heap profile]

**Common leak patterns to check:**
1. Event listeners added but never removed
2. setInterval / setTimeout not cleared on unmount
3. Subscription not cancelled (WebSocket, EventEmitter, RxJS)
4. Closure capturing large objects that can't be GC'd
5. Detached DOM nodes still referenced
6. WeakRef vs strong ref for caches

**For each pattern found:**
- Where in the code
- The specific listener/timer/subscription that leaks
- Fix: correct cleanup code
- Where to place the cleanup (useEffect return, componentWillUnmount, etc.)
```

---

## Node.js Server Memory Leak

```
My Node.js server memory grows and never releases. Help me diagnose.

**Runtime:** Node.js [version]
**Framework:** [Express / Fastify / NestJS / bare Node]
**Memory growth pattern:**
- Starts at: [X MB RSS]
- Grows to: [Y MB RSS] over [Z hours]
- After restart: resets to X (confirms leak, not legitimate growth)
- Triggered by: [all traffic / specific endpoint / background job]

**Relevant code:**
[paste request handlers, background jobs, global state, module-level variables]

**Heap snapshot diff (if available):**
[paste output of `node --inspect` heap comparison]

**Check these patterns:**
1. Module-level arrays/maps that grow without bounds
2. Event emitters accumulating listeners (process, EventEmitter)
3. Closures in middleware capturing req/res
4. Long-lived timers referencing large request context
5. Database connection pool not returning connections
6. Cache with no TTL or size limit
7. console.log with structured objects (V8 retains references for formatting)

**Output for each finding:**
- Leak source: [specific variable/pattern]
- Evidence: [why this is the leak]
- Fix: [specific code change]
- Monitoring: [what metric to track to confirm fix works]
```

---

## React Component Memory Leak

```
This React component leaks memory. Fix it.

**Component:**
[paste component code]

**Leak symptom:**
[describe — memory grows, Warning: Can't perform state update on unmounted component, etc.]

**Checklist — find and fix all that apply:**

1. useEffect without cleanup:
   useEffect(() => {
     // is there a return () => cleanup() here?
   }, [deps])

2. Async operations that complete after unmount:
   // Is there an isMounted flag or AbortController?

3. Event listeners:
   window.addEventListener / document.addEventListener
   // Is there a corresponding removeEventListener?

4. Subscriptions:
   socket.on / eventBus.subscribe / store.subscribe
   // Is there unsubscribe on unmount?

5. Intervals / timeouts:
   setInterval / setTimeout
   // Is there clearInterval / clearTimeout?

6. External library:
   [library].init() / [library].on()
   // Is there [library].destroy() / [library].off()?

For each leak found: show the broken code, then the fixed code.
```

---

## Cache Memory Analysis

```
My caching layer is consuming too much memory. Help me fix it.

**Cache implementation:**
[paste cache code — Map, LRU, Redis client, etc.]

**Problem:**
- Cache size: [X MB] and growing / never evicting / wrong TTL
- Expected max size: [Y MB]
- Items that should expire: [describe TTL policy]

**Analysis needed:**
1. Does the cache have a size limit? (If not, add one)
2. Does the cache have TTL expiry? (If not, add it)
3. Are cache keys unique enough? (Are we storing duplicates under different keys?)
4. Is the cached value the full object when only a subset is needed?
5. Is there a circular reference in cached values preventing GC?

**Fix:**
Implement LRU (Least Recently Used) eviction with:
- Max entries: [N]
- TTL: [X seconds]
- Weak references for values where appropriate

Show: corrected cache implementation + size monitoring.
```

---

## Garbage Collection Analysis

```
Help me understand and improve GC behavior in my application.

**Runtime:** [Node.js / V8 in browser / JVM / other]
**GC logs / profiling data:**
[paste GC log output or profiling data]

**Symptoms:**
- GC pauses causing [latency spikes / frame drops / request timeouts]
- GC frequency: [how often major GCs are happening]
- Heap size: [before GC → after GC → growing trend?]

**What I need:**
1. Is the GC pattern normal or pathological?
2. Are there long-lived objects that should be short-lived? (Gen 0 vs Gen 2)
3. Object allocation hotspots: which code creates the most garbage?
4. Specific changes to reduce allocation pressure:
   - Object pooling opportunities
   - Avoiding closure allocation in hot paths
   - Using typed arrays instead of generic arrays
   - Reusing objects instead of creating new ones

5. Target metrics after optimization:
   - Max GC pause: [target ms]
   - Major GC frequency: [target interval]
```
