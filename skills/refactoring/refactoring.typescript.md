<!-- @keywords: TypeScript, type safety, generics, utility types, type narrowing, refactoring types -->

# Refactoring — TypeScript Type Safety

## Types as Documentation

TypeScript types are not just compiler checks — they're the most reliable documentation your codebase has. When a function's type signature tells you everything about inputs and outputs, comments become redundant.

---

## Eliminating `any`

`any` is a type safety escape hatch. Every `any` is a hole in your type system where runtime errors can hide.

```typescript
// ✗ any leaks type safety
function processApiResponse(data: any) {
  return data.users.map((u: any) => u.email);
  // TypeError at runtime if data.users is undefined
}

// ✓ unknown — forces explicit narrowing before use
function processApiResponse(data: unknown) {
  // Zod parsing — validates and types simultaneously
  const schema = z.object({ users: z.array(z.object({ email: z.string() })) });
  const parsed = schema.parse(data);
  return parsed.users.map(u => u.email);
}

// ✓ Typed API response
interface ApiResponse<T> {
  data: T;
  meta: { total: number; page: number };
}
async function fetchUsers(): Promise<ApiResponse<User[]>> {
  const response = await fetch('/api/users');
  return response.json() as Promise<ApiResponse<User[]>>;
  // Cast only at the boundary — TypeScript trusts it from here
}
```

---

## Discriminated Unions — Eliminate Invalid States

```typescript
// ✗ Multiple booleans — can create impossible combinations
interface Request {
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  data?: User;
  error?: Error;
}
// isLoading=true AND isSuccess=true → impossible but representable

// ✓ Discriminated union — impossible states are unrepresentable
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// TypeScript narrows correctly in switch
function render(state: RequestState<User>) {
  switch (state.status) {
    case 'loading': return <Spinner />;
    case 'success': return <UserView user={state.data} />; // state.data is User here
    case 'error': return <ErrorView error={state.error} />; // state.error is Error here
  }
}
```

---

## Branded Types — Prevent ID Mix-ups

```typescript
// ✗ All IDs are strings — easy to pass the wrong one
function getOrderByUserId(userId: string): Promise<Order[]> { ... }
function getUser(userId: string): Promise<User> { ... }

// Accidentally passing orderId where userId expected — no compile error
const orderId = '456';
const user = await getUser(orderId); // wrong but TypeScript allows it

// ✓ Branded types — each ID type is distinct at compile time
type UserId = string & { readonly __brand: 'UserId' };
type OrderId = string & { readonly __brand: 'OrderId' };

function createUserId(id: string): UserId { return id as UserId; }
function createOrderId(id: string): OrderId { return id as OrderId; }

function getUser(userId: UserId): Promise<User> { ... }
function getOrderByUserId(userId: UserId): Promise<Order[]> { ... }

const orderId = createOrderId('456');
const user = await getUser(orderId); // ✗ TypeScript error: OrderId is not UserId
```

---

## Utility Types

```typescript
// Partial — all fields optional (useful for update DTOs)
type UpdateUserDto = Partial<Pick<User, 'name' | 'bio' | 'avatarUrl'>>;

// Required — all fields required (useful for DB records that should have all fields)
type PersistedUser = Required<User>;

// Readonly — prevent mutation
type ImmutableConfig = Readonly<AppConfig>;
const config: ImmutableConfig = loadConfig();
config.dbUrl = 'new'; // ✗ TypeScript error

// Record — typed object map
type UserRoles = Record<UserId, UserRole[]>;
type ErrorMessages = Record<string, string[]>;

// Exclude / Extract — filter union types
type NonNullableId = Exclude<string | null | undefined, null | undefined>; // string
type PickedStatuses = Extract<OrderStatus, 'pending' | 'completed'>; // only those two

// ReturnType / Parameters — infer from existing functions
type FetchUserReturn = Awaited<ReturnType<typeof fetchUser>>;
type CreateUserParams = Parameters<typeof createUser>[0];

// Template literal types
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Endpoint = `${HttpMethod} /${string}`;
const route: Endpoint = 'GET /users'; // ✓
const invalid: Endpoint = 'FETCH /users'; // ✗
```

---

## Generic Constraints

```typescript
// ✗ Too permissive
function getProperty<T, K>(obj: T, key: K): any { ... }

// ✓ Constrained generics
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: '1', name: 'Alice' };
const name = getProperty(user, 'name'); // type: string
const missing = getProperty(user, 'missing'); // ✗ compile error

// Repository pattern with generics
interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(filters?: Partial<T>): Promise<T[]>;
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: ID, data: Partial<Omit<T, 'id'>>): Promise<T>;
  delete(id: ID): Promise<void>;
}

class UserRepository implements Repository<User, UserId> {
  async findById(id: UserId): Promise<User | null> { ... }
  // TypeScript enforces all methods are implemented with correct types
}
```

---

## Type Narrowing Patterns

```typescript
// Type guards — create reusable narrowing functions
function isUser(value: unknown): value is User {
  return typeof value === 'object'
    && value !== null
    && 'id' in value
    && 'email' in value
    && typeof (value as any).email === 'string';
}

function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && 'statusCode' in error;
}

// Assertion functions — throw if condition not met
function assertDefined<T>(value: T | null | undefined, name: string): asserts value is T {
  if (value == null) throw new Error(`${name} must be defined`);
}

const user = await findUser(id);
assertDefined(user, 'user'); // narrows: user is User from here on
console.log(user.email); // TypeScript knows it's not null

// Exhaustive switch — compile error if a case is missed
function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${value}`);
}

function handleStatus(status: OrderStatus): string {
  switch (status) {
    case 'pending': return 'Waiting';
    case 'processing': return 'In progress';
    case 'completed': return 'Done';
    case 'cancelled': return 'Cancelled';
    default: return assertNever(status); // error if new status added without handling
  }
}
```

---

## TypeScript Refactoring Checklist

- [ ] No `any` in business logic code
- [ ] All API boundaries use `unknown` + Zod parsing
- [ ] IDs use branded types if mix-up risk exists
- [ ] Multi-state variables use discriminated unions
- [ ] Utility types used instead of manually duplicating shapes
- [ ] Generic functions are constrained (`K extends keyof T`)
- [ ] Exhaustive switches use `assertNever` for compile-time safety
- [ ] `strict: true` in tsconfig (enables `strictNullChecks`, `noImplicitAny`)
