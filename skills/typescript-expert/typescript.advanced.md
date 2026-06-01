<!-- @keywords: TypeScript advanced types, conditional types, infer, mapped types, template literal types, phantom types, branded types, variance, type-safe API client, generics -->

# TypeScript Expert — Type System as a Proof System

## Core Philosophy

TypeScript's type system is not a linting tool — it is a theorem prover. A type-correct program has properties that are guaranteed at compile time, not hoped for at runtime. When used correctly, TypeScript makes certain bugs impossible, not just unlikely.

The goal is to push invariants into the type system. If something can go wrong, encode it as a type error. If a value can be null, make `null` part of the type. If a function can fail, return a `Result` type. The type system is your first line of defense, not your last.

---

## When to Activate

- Building APIs that will be consumed by other developers
- Designing domain models where invalid states must be unrepresentable
- Writing reusable utilities that must work across multiple type shapes
- Any system where runtime type errors would be expensive to debug

---

## Principles

### Conditional Types with `infer`
Extract type information from other types at the structural level:

```ts
// Extract the resolved type from a Promise
type Awaited<T> = T extends Promise<infer R> ? R : T;

// Extract return type of any function
type ReturnType<T extends (...args: any[]) => any> =
  T extends (...args: any[]) => infer R ? R : never;

// Extract element type from array
type ElementOf<T extends readonly unknown[]> =
  T extends readonly (infer E)[] ? E : never;

// Extract the first argument type
type FirstArg<T extends (...args: any[]) => any> =
  T extends (first: infer F, ...rest: any[]) => any ? F : never;
```

---

### Mapped Types
Transform every property of a type systematically:

```ts
// Make all properties required and non-nullable
type NonNullableRequired<T> = {
  [K in keyof T]-?: NonNullable<T[K]>
};

// Filter properties by value type
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K]
};

// Convert methods to event emitter shape
type EventMap<T> = {
  [K in keyof T as T[K] extends (...args: any[]) => any
    ? `on${Capitalize<string & K>}`
    : never]: T[K] extends (...args: infer A) => any
      ? (handler: (...args: A) => void) => void
      : never
};
```

---

### Branded Types
Make structurally identical types semantically distinct:

```ts
declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

type UserId = Brand<string, 'UserId'>;
type PostId = Brand<string, 'PostId'>;
type Email = Brand<string, 'Email'>;

// Constructors with runtime validation
function UserId(id: string): UserId {
  if (!id.startsWith('usr_')) throw new Error(`Invalid UserId: ${id}`);
  return id as UserId;
}

// Now mixing IDs is a compile-time error:
declare function getUser(id: UserId): User;
declare const postId: PostId;
getUser(postId); // Error: Argument of type 'PostId' is not assignable to 'UserId'
```

---

### Variance
TypeScript is structurally typed with covariance for most cases:

```ts
// Covariant: can substitute subtype for supertype
type Producer<T> = () => T;
// Producer<Dog> is assignable to Producer<Animal>

// Contravariant: must flip for parameters
type Consumer<T> = (value: T) => void;
// Consumer<Animal> is assignable to Consumer<Dog>

// Invariant: must be exact
type ReadWrite<T> = { get(): T; set(value: T): void };
// Neither ReadWrite<Dog> nor ReadWrite<Animal> is assignable to the other

// Force contravariance with function parameter trick
type Contravariant<T> = (x: T) => void;
```

---

## Decision Framework

- Evaluate the complexity of the task.
- Identify structural bottlenecks.
- Choose the simplest abstraction that solves the problem.

## Anti-Patterns

- Using `as` to bypass type errors instead of fixing the type
- `any` in generic constraints — use `unknown` and narrow explicitly
- Over-engineering types to the point where inference breaks and errors are cryptic
- Phantom types used without understanding variance implications

---

## Example in Action

Fully type-safe API client using advanced generics:

```ts
// Route definitions as const — the types flow from the definition
const routes = {
  'GET /users/:id': {
    params: {} as { id: string },
    response: {} as { id: string; name: string; email: string }
  },
  'POST /users': {
    params: {} as {},
    body: {} as { name: string; email: string },
    response: {} as { id: string; name: string; email: string }
  },
  'DELETE /users/:id': {
    params: {} as { id: string },
    response: {} as { deleted: boolean }
  }
} as const;

type Routes = typeof routes;
type RouteKey = keyof Routes;

// Extract typed request/response from route key
type RouteParams<K extends RouteKey> = 'params' extends keyof Routes[K]
  ? Routes[K]['params'] : Record<string, never>;

type RouteBody<K extends RouteKey> = 'body' extends keyof Routes[K]
  ? Routes[K]['body'] : undefined;

type RouteResponse<K extends RouteKey> = 'response' extends keyof Routes[K]
  ? Routes[K]['response'] : unknown;

// Type-safe API call — TypeScript knows params, body, and response per route
async function apiCall<K extends RouteKey>(
  route: K,
  options: RouteBody<K> extends undefined
    ? { params: RouteParams<K> }
    : { params: RouteParams<K>; body: RouteBody<K> }
): Promise<RouteResponse<K>> {
  const [method, path] = (route as string).split(' ');
  const url = (path as string).replace(/:(\w+)/g, (_, k) =>
    String((options.params as Record<string, string>)[k])
  );

  const res = await fetch(url, {
    method,
    body: 'body' in options ? JSON.stringify(options.body) : undefined,
    headers: { 'Content-Type': 'application/json' }
  });

  return res.json() as RouteResponse<K>;
}

// Usage — fully type-checked
const user = await apiCall('GET /users/:id', {
  params: { id: 'usr_123' }
});
// user: { id: string; name: string; email: string }

const newUser = await apiCall('POST /users', {
  params: {},
  body: { name: 'Alice', email: 'alice@example.com' }
});
// newUser: { id: string; name: string; email: string }

// This is a compile-time error — DELETE has no body
// await apiCall('DELETE /users/:id', { params: { id: '1' }, body: {} });
```
