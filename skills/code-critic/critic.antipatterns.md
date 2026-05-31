<!-- @keywords: antipatterns, TypeScript antipatterns, code smells, premature abstraction, clever code, technical debt, before after refactor, dangerous patterns, type safety, any type -->

# Code Critic — Code That Will Hurt You in 6 Months

## Core Philosophy

An antipattern is not code that's wrong today. It is code that will be wrong in 6 months when the requirements change, the team grows, or the next developer touches it without your context. Antipatterns are debt with hidden interest rates.

The most dangerous antipatterns are the ones that feel clever at write time. "Clever" code is code that only one person understands — and that person will forget it in 3 months.

---

## When to Activate

- Code review for TypeScript/React codebases
- Self-review before opening a pull request
- Auditing legacy code for refactor candidates
- Training new developers on what to avoid

---

## 10 Most Dangerous TypeScript Antipatterns

### 1. The `any` Escape Hatch
```ts
// BEFORE — type safety abandoned
function processData(data: any): any {
  return data.value.nested.property;
}

// AFTER — types restored
interface DataPayload { value: { nested: { property: string } } }
function processData(data: DataPayload): string {
  return data.value.nested.property;
}
```
Every `any` is a promise to the type checker that you'll handle it — a promise you'll break at 2am during an incident.

### 2. Non-null Assertion Without Guard
```ts
// BEFORE — crash waiting to happen
const name = user!.profile!.name!;

// AFTER — explicit guard
if (!user?.profile?.name) throw new Error('User profile incomplete');
const name = user.profile.name;
```

### 3. Boolean Trap in Function Parameters
```ts
// BEFORE — what does true mean here?
sendEmail(user, true, false, true);

// AFTER — self-documenting options object
sendEmail(user, { cc: true, bcc: false, urgent: true });
```

### 4. God Object State
```ts
// BEFORE — one object contains everything
const [appState, setAppState] = useState({
  user: null, isLoading: false, error: null,
  posts: [], selectedPost: null, modal: false, theme: 'dark'
});

// AFTER — separated concerns
const [user, setUser] = useState<User | null>(null);
const [posts, setPosts] = useState<Post[]>([]);
// Each domain gets its own state
```

### 5. Callback Pyramid of Doom
```ts
// BEFORE — unreadable, un-testable
getUser(id, (user) => {
  getPosts(user.id, (posts) => {
    getComments(posts[0].id, (comments) => {
      // nested forever
    });
  });
});

// AFTER — flat async/await
const user = await getUser(id);
const posts = await getPosts(user.id);
const comments = await getComments(posts[0].id);
```

### 6. Silent Error Swallowing
```ts
// BEFORE — errors vanish
try {
  await riskyOperation();
} catch (e) {
  // silent
}

// AFTER — errors are handled or re-thrown
try {
  await riskyOperation();
} catch (e) {
  logger.error('riskyOperation failed', { error: e, context: id });
  throw e; // or handle explicitly
}
```

### 7. Magic Numbers and Strings
```ts
// BEFORE — what is 86400000?
if (timestamp > Date.now() - 86400000) { /* ... */ }

// AFTER — named and typed
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
if (timestamp > Date.now() - ONE_DAY_MS) { /* ... */ }
```

### 8. Premature Abstraction
```ts
// BEFORE — abstracted after 2 uses, now harder to understand
function createEntityProcessor<T extends Entity>(
  config: ProcessorConfig<T>
): EntityProcessor<T> { /* complex generics */ }

// AFTER — wait for 3+ real use cases before abstracting
function processUser(user: User): ProcessedUser { /* simple, clear */ }
function processPost(post: Post): ProcessedPost { /* simple, clear */ }
// Abstract AFTER you see the real pattern
```

### 9. Type Assertion Instead of Type Guard
```ts
// BEFORE — lying to the compiler
const user = response.data as User; // might not be a User

// AFTER — runtime verification
function isUser(data: unknown): data is User {
  return typeof data === 'object' && data !== null
    && 'id' in data && 'email' in data;
}
if (isUser(response.data)) { /* TypeScript knows it's User here */ }
```

### 10. Mutation of Shared State
```ts
// BEFORE — modifying objects that other code depends on
function updateUserPermissions(user: User, role: Role) {
  user.permissions.push(role); // mutates original
}

// AFTER — return new object
function updateUserPermissions(user: User, role: Role): User {
  return { ...user, permissions: [...user.permissions, role] };
}
```

---

## Premature Abstraction Detection

Ask these questions before creating an abstraction:
1. Does this code currently appear in 3+ distinct places? (2 is not enough)
2. Do all instances change for the same reason?
3. Can the abstraction be named clearly in 2 words?

If any answer is "no" — don't abstract yet. Copy-paste is cheaper than the wrong abstraction.

---

## Example in Action

Identify and fix 3 critical antipatterns in realistic snippet:

```ts
// ORIGINAL — 3 antipatterns hidden inside
async function loadDashboard(userId: any) {
  try {
    const res = await fetch(`/api/dashboard/${userId}`);
    const data = res.json() as DashboardData; // forgot await
    if (data.status == 'active') { // loose equality
      renderDashboard(data);
    }
  } catch (e) {}
}
```

**Antipattern 1 — `any` parameter:**  
`userId: any` means callers can pass objects, undefined, or arrays. Fix: `userId: string`.

**Antipattern 2 — Missing `await` on `.json()`:**  
`res.json()` returns a Promise. Without `await`, `data` is a Promise object, not DashboardData. `as DashboardData` hides this from TypeScript. Fix: `const data = await res.json()`.

**Antipattern 3 — Silent error swallowing:**  
The empty `catch` means network errors, malformed JSON, and runtime crashes all disappear. Users see a broken dashboard with no error message. Fix: log and surface the error.

```ts
// FIXED
async function loadDashboard(userId: string): Promise<void> {
  try {
    const res = await fetch(`/api/dashboard/${userId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: unknown = await res.json();
    if (!isDashboardData(data)) throw new Error('Invalid dashboard response shape');
    if (data.status === 'active') renderDashboard(data);
  } catch (e) {
    logger.error('loadDashboard failed', { userId, error: e });
    showErrorState('Failed to load dashboard. Please refresh.');
  }
}
```
