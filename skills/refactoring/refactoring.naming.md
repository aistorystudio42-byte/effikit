<!-- @keywords: naming, variables, functions, classes, readable code, conventions, semantic naming -->

# Refactoring — Naming and Readability

## Naming Is Design

Good names eliminate the need for comments. If a function needs a comment to explain what it does, the function is either too complex or poorly named. The goal is code that reads like prose.

```
A name should answer:
  - What is this? (variables, classes)
  - What does this do? (functions)
  - Why does this exist? (only if not obvious)

A name should NOT:
  - Describe the type (userArray, nameString)
  - Use abbreviations that require context (usrMgr, tmp, d)
  - Lie about what it does (processUser that deletes users)
```

---

## Variable Naming

```typescript
// ✗ Too vague
const data = await fetch('/api/users');
const d = new Date();
const n = users.length;
const temp = calculateTotal(items);

// ✓ Reveals intent
const activeUsers = await fetchActiveUsers();
const subscriptionExpiresAt = new Date(user.expiresAt);
const totalActiveUsers = users.length;
const orderSubtotal = calculateSubtotal(items);

// ✗ Redundant type in name
const userArray: User[] = [];
const nameString: string = user.name;
const isActiveBoolean: boolean = user.isActive;

// ✓ Name the concept, not the type
const users: User[] = [];
const name: string = user.name;
const isActive: boolean = user.isActive;

// ✗ Magic booleans
if (user.status === 1) { ... }   // what is 1?
if (order.flags & 0x04) { ... }  // what is 0x04?

// ✓ Named constants
const UserStatus = { ACTIVE: 1, SUSPENDED: 2, DELETED: 3 } as const;
const OrderFlags = { HAS_COUPON: 0x01, IS_GIFT: 0x02, EXPRESS: 0x04 } as const;
if (user.status === UserStatus.ACTIVE) { ... }
if (order.flags & OrderFlags.EXPRESS) { ... }
```

---

## Function Naming

```typescript
// Functions should be verbs or verb phrases

// ✗ Noun-only names (what IS it, not what it DOES)
function userValidation(user: User): boolean { ... }
function productPrice(product: Product, qty: number): number { ... }

// ✓ Verb + noun
function validateUser(user: User): boolean { ... }
function calculateProductPrice(product: Product, qty: number): number { ... }

// Boolean functions: use is/has/can/should
// ✗
function active(user: User): boolean { ... }
function permissions(user: User, action: string): boolean { ... }

// ✓
function isUserActive(user: User): boolean { ... }
function canUserPerform(user: User, action: string): boolean { ... }
function hasExpiredSubscription(user: User): boolean { ... }

// Getters vs finders:
// get* — fast, synchronous, throws if not found
// find* — may return null/undefined, async ok
// fetch* — async, loads from external source
const user = getAuthenticatedUser(req);         // sync, throws if no auth
const user = await findUserByEmail(email);      // may return null
const users = await fetchUsersFromExternalApi(); // async, external
```

---

## Class and Type Naming

```typescript
// Classes: nouns, PascalCase
class UserRepository { ... }     // ✓
class ProcessUsers { ... }       // ✗ verb (should be UserProcessor)
class DataManager { ... }        // ✗ too generic

// Interfaces: describe capability or shape
interface Serializable { serialize(): string; }
interface UserRepository { findById(id: string): Promise<User | null>; }

// Avoid I prefix for interfaces (not TypeScript convention)
interface IUserRepository { ... } // ✗
interface UserRepository { ... }  // ✓

// DTOs: describe purpose + DTO suffix
interface CreateUserDto { email: string; name: string; password: string; }
interface UpdateOrderDto { status?: OrderStatus; note?: string; }

// Events: past tense (happened)
interface UserCreatedEvent { userId: string; email: string; createdAt: Date; }
interface OrderCompletedEvent { orderId: string; totalCents: number; }

// Commands: imperative (do this)
interface CreateUserCommand { email: string; name: string; }
interface ProcessOrderCommand { orderId: string; }
```

---

## Avoid These Patterns

```typescript
// Manager / Handler / Processor — too generic, reveals nothing
class DataManager { ... }    // → UserRepository? ProductCatalog?
class EventHandler { ... }   // → NotificationDispatcher? WebhookRouter?

// Utils / Helpers — catch-all bags that grow forever
// Instead, group by domain:
// ✗ utils.ts → mixed bag
// ✓ date-formatting.ts, currency.ts, url-helpers.ts

// Abbreviations
const usr = await getUser();     // → user
const pwd = req.body.pwd;        // → password
const cfg = loadConfig();        // → config (this one is fine)
const btn = document.getElementById('btn'); // → button

// Noise words that add no meaning
const theUser = { ... };
const userObject = { ... };
const listOfUsers = { ... };  // → users
const userData = { ... };     // → user
const userInfo = { ... };     // → user or userProfile

// Context repetition
class UserService {
  getUserById(userId: string) { ... }  // ✗ "User" repeated
  getById(userId: string) { ... }      // ✓ context provided by class name
}
```

---

## Naming at Scale: Consistency Rules

```typescript
// Establish conventions and stick to them:

// Timestamps: always *At suffix
createdAt, updatedAt, deletedAt, publishedAt, expiresAt

// Counts: *Count or total*
userCount, totalItems, pageCount

// Flags: is* / has* / can*
isActive, isDeleted, hasPaymentMethod, canEdit

// Collections: plural noun
users, orders, items, permissions

// IDs: *Id (camelCase)
userId, orderId, productId

// Callbacks: on* prefix
onClick, onSubmit, onChange, onError

// Async functions: no special prefix needed
// The return type (Promise<T>) signals async
async function fetchUser(id: string): Promise<User> { ... }
// Not: asyncFetchUser or fetchUserAsync
```

---

## Rename Refactoring Process

1. Identify the poor name
2. Understand exactly what it represents
3. Choose a name that reveals intent without context
4. Use IDE rename (affects all references)
5. Run tests — ensure nothing broke

For TypeScript: use `F2` rename in VS Code or `tsc --noEmit` to verify no broken references.
