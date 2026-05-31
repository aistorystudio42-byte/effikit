<!-- @keywords: async debugging, race conditions, promise, async/await, concurrency, timing bugs -->

# Debugging — Async and Concurrency Issues

## Why Async Bugs Are Hard

Async bugs are non-deterministic. They depend on timing, execution order, and state that changes between when you schedule work and when it executes. The bug may disappear when you add a log statement (because logging adds a delay that changes timing). They may only occur under load.

This guide covers patterns for making async bugs reproducible and fixable.

---

## Race Condition Patterns

### Stale Closure
```typescript
// Bug: Captures stale state in async callback
function SearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  // Wrong: query captured at time of effect creation
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults(query).then(setResults); // 'query' might be stale
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
}

// Fix: Use ref for latest value, or include in dependency array
function SearchComponent() {
  const [query, setQuery] = useState('');
  const queryRef = useRef(query);
  queryRef.current = query; // always current

  useEffect(() => {
    const currentQuery = query; // capture at effect run time
    const timer = setTimeout(async () => {
      const data = await fetchResults(currentQuery);
      // Check if query changed while we were waiting
      if (queryRef.current === currentQuery) {
        setResults(data);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
}
```

### Request Race (Out-of-Order Responses)
```typescript
// Bug: Slow request may complete after a faster newer request
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser(userId).then(setUser); // if userId changes fast, responses can arrive out of order
  }, [userId]);
}

// Fix: AbortController — cancel inflight requests
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchUser(userId, { signal: controller.signal })
      .then(setUser)
      .catch(err => {
        if (err.name === 'AbortError') return; // cancelled, ignore
        console.error(err);
      });

    return () => controller.abort(); // cleanup: cancel if userId changes
  }, [userId]);
}
```

### Double Invocation / Concurrent Writes
```typescript
// Bug: User clicks submit twice → two concurrent API calls → duplicate record
async function handleSubmit() {
  const result = await createOrder(formData); // called twice
  router.push(`/orders/${result.id}`);
}

// Fix: Prevent concurrent calls
const isSubmitting = useRef(false);

async function handleSubmit() {
  if (isSubmitting.current) return; // guard
  isSubmitting.current = true;
  try {
    const result = await createOrder(formData);
    router.push(`/orders/${result.id}`);
  } finally {
    isSubmitting.current = false;
  }
}

// Or: disable button while submitting
const [isPending, setIsPending] = useState(false);
<button disabled={isPending} onClick={handleSubmit}>
```

---

## Promise Hell Debugging

### Unhandled Rejection Tracking
```typescript
// Find where rejections are silently swallowed
const originalFetch = window.fetch;
window.fetch = (...args) => {
  return originalFetch(...args).catch(err => {
    console.trace('Fetch rejected:', err); // stack trace shows who called fetch
    throw err; // re-throw — don't swallow
  });
};

// Never do this:
somePromise.catch(() => {}); // silent swallow

// Do this instead:
somePromise.catch(err => logger.error(err, 'Operation failed'));
```

### Promise Chain Debugging
```typescript
// Add .then() inspectors at each stage to find where chain breaks
fetchUser(id)
  .then(user => {
    console.log('[DEBUG] user fetched:', user?.id);
    return user;
  })
  .then(user => enrichWithOrders(user))
  .then(enriched => {
    console.log('[DEBUG] enriched:', JSON.stringify(enriched, null, 2));
    return enriched;
  })
  .catch(err => {
    console.error('[DEBUG] chain failed at:', err.message);
    console.error(err.stack);
  });
```

---

## State Machine for Async Operations

Represent async state explicitly — don't use multiple booleans.

```typescript
// Wrong: Multiple booleans get out of sync
const [isLoading, setIsLoading] = useState(false);
const [isError, setIsError] = useState(false);
const [data, setData] = useState(null);
// isLoading=true AND isError=true — impossible but can happen with bugs

// Correct: Discriminated union — impossible states are unrepresentable
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

const [state, setState] = useState<AsyncState<User>>({ status: 'idle' });

async function loadUser(id: string) {
  setState({ status: 'loading' });
  try {
    const user = await fetchUser(id);
    setState({ status: 'success', data: user });
  } catch (error) {
    setState({ status: 'error', error: error as Error });
  }
}

// Rendering
switch (state.status) {
  case 'idle':     return <IdleState />;
  case 'loading':  return <Spinner />;
  case 'success':  return <UserView user={state.data} />;
  case 'error':    return <ErrorView error={state.error} />;
}
```

---

## Debugging Timing-Dependent Bugs

```typescript
// Make timing controllable in tests
// Inject a delay function instead of using setTimeout directly

interface Scheduler {
  delay(ms: number): Promise<void>;
  debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T;
}

// Real implementation
const realScheduler: Scheduler = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  debounce: (fn, ms) => debounce(fn, ms),
};

// Test implementation — controllable
const testScheduler = {
  delay: (ms: number) => Promise.resolve(), // instant
  debounce: (fn: Function, _ms: number) => fn, // immediate, no debounce
};

// Component uses injected scheduler
function AutoSave({ scheduler = realScheduler }: { scheduler?: Scheduler }) {
  const save = scheduler.debounce(async () => {
    await saveData();
  }, 1000);
}
```

---

## Concurrency Control Utilities

```typescript
// Mutex: ensure only one async operation runs at a time
class Mutex {
  private queue: Array<() => void> = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    return new Promise(resolve => {
      const tryAcquire = () => {
        if (!this.locked) {
          this.locked = true;
          resolve(() => this.release());
        } else {
          this.queue.push(tryAcquire);
        }
      };
      tryAcquire();
    });
  }

  private release(): void {
    this.locked = false;
    const next = this.queue.shift();
    if (next) next();
  }
}

// Usage: prevent concurrent order submission
const orderMutex = new Mutex();

async function createOrder(data: CreateOrderDto) {
  const release = await orderMutex.acquire();
  try {
    return await orderService.create(data);
  } finally {
    release();
  }
}

// Semaphore: limit concurrent operations to N
class Semaphore {
  private current = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async acquire(): Promise<() => void> {
    return new Promise(resolve => {
      const tryAcquire = () => {
        if (this.current < this.limit) {
          this.current++;
          resolve(() => this.release());
        } else {
          this.queue.push(tryAcquire);
        }
      };
      tryAcquire();
    });
  }

  private release(): void {
    this.current--;
    const next = this.queue.shift();
    if (next) next();
  }
}

// Process max 3 files concurrently
const sem = new Semaphore(3);
await Promise.all(files.map(async (file) => {
  const release = await sem.acquire();
  try {
    return await processFile(file);
  } finally {
    release();
  }
}));
```
