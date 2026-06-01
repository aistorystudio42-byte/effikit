<!-- @keywords: TypeScript design patterns, discriminated unions, state machine, builder pattern, opaque types, exhaustive checking, never type, result type, payment domain, type-safe patterns -->

# TypeScript Expert — Design Patterns for TypeScript's Type System

## Core Philosophy

Generic design patterns (Singleton, Factory, Observer) were designed for languages without TypeScript's type system. Reimplementing them naively in TypeScript misses the point — the type system enables patterns that don't exist in other languages.

The two most powerful TypeScript-native patterns are discriminated unions and exhaustive checking with `never`. Combined, they make invalid states unrepresentable and force handling of every case at compile time.

---

## When to Activate

- Modeling domain state that must go through specific transitions
- Building systems where missing a case should be a compile error
- Writing libraries where incorrect usage must be impossible
- Any system with complex state that developers will modify over time

---

## Principles

### Discriminated Unions as State Machines
```ts
// Invalid states are impossible to represent
type PaymentState =
  | { status: 'idle' }
  | { status: 'processing'; transactionId: string }
  | { status: 'succeeded'; transactionId: string; receiptUrl: string }
  | { status: 'failed'; transactionId: string; error: string; retryable: boolean }
  | { status: 'refunded'; transactionId: string; refundId: string };

// Exhaustive switch — TypeScript errors if a case is missing
function handlePaymentState(state: PaymentState): void {
  switch (state.status) {
    case 'idle': break;
    case 'processing':
      showSpinner(state.transactionId);
      break;
    case 'succeeded':
      sendReceipt(state.receiptUrl); // TypeScript knows receiptUrl exists here
      break;
    case 'failed':
      if (state.retryable) offerRetry(state.transactionId);
      else showFinalError(state.error);
      break;
    case 'refunded':
      showRefundConfirmation(state.refundId);
      break;
    default:
      const _exhaustive: never = state; // compile error if a case is missing
      throw new Error(`Unhandled state: ${_exhaustive}`);
  }
}
```

---

### Builder Pattern
Type-safe builder that prevents calling `.build()` before required fields are set:

```ts
type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];

class QueryBuilder<TFields extends string = never> {
  private query: Partial<Record<string, unknown>> = {};

  select<F extends string>(fields: F[]): QueryBuilder<TFields | F> {
    this.query.fields = fields;
    return this as unknown as QueryBuilder<TFields | F>;
  }

  from(table: string): QueryBuilder<TFields | 'table'> {
    this.query.table = table;
    return this as unknown as QueryBuilder<TFields | 'table'>;
  }

  where(condition: string): this {
    this.query.where = condition;
    return this;
  }

  // build() only available when both 'select' fields and 'table' are provided
  build(this: QueryBuilder<'table'>): string {
    return `SELECT * FROM ${this.query.table}${this.query.where ? ` WHERE ${this.query.where}` : ''}`;
  }
}

const q = new QueryBuilder()
  .from('users')
  .where('active = true')
  .build(); // OK

// new QueryBuilder().build(); // Error: 'build' doesn't exist on QueryBuilder<never>
```

---

### Result Type (No Thrown Exceptions)
```ts
type Result<T, E extends Error = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E extends Error>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Caller must check before accessing value
async function fetchUser(id: string): Promise<Result<User, UserNotFoundError | NetworkError>> {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (res.status === 404) return err(new UserNotFoundError(id));
    if (!res.ok) return err(new NetworkError(res.status));
    return ok(await res.json() as User);
  } catch (e) {
    return err(new NetworkError(0));
  }
}

// Usage — TypeScript enforces checking
const result = await fetchUser('usr_123');
if (!result.ok) {
  console.error(result.error.message);
  return;
}
// result.value is User here — TypeScript knows
console.log(result.value.name);
```

---

### Opaque Types for Domain Safety
```ts
// Stronger than branded types — forces using constructor functions
type Opaque<T, K extends string> = T & { readonly __opaque: K };

type Percentage = Opaque<number, 'Percentage'>;
type CurrencyAmount = Opaque<number, 'CurrencyAmount'>;

function percent(n: number): Percentage {
  if (n < 0 || n > 100) throw new RangeError(`Invalid percentage: ${n}`);
  return n as Percentage;
}

function currency(cents: number): CurrencyAmount {
  if (!Number.isInteger(cents)) throw new Error('Currency must be integer cents');
  return cents as CurrencyAmount;
}

// These cannot be mixed accidentally
function applyDiscount(price: CurrencyAmount, discount: Percentage): CurrencyAmount {
  return currency(Math.round(price * (1 - discount / 100)));
}

const price = currency(1000); // $10.00 in cents
const disc = percent(15);
const final = applyDiscount(price, disc); // OK

// applyDiscount(disc, price); // Error — types are reversed, caught at compile time
```

---

## Decision Framework

- Evaluate the complexity of the task.
- Identify structural bottlenecks.
- Choose the simplest abstraction that solves the problem.

## Anti-Patterns

- Over-engineering the solution.
- Ignoring context and copying blindly.
- Mixing concerns unnecessarily.

## Example in Action

Complete payment system domain modeled in TypeScript:

```ts
// Domain types — invalid states unrepresentable
type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover';

type PaymentMethod =
  | { type: 'card'; brand: CardBrand; last4: string; expiryMonth: number; expiryYear: number }
  | { type: 'bank_transfer'; accountLast4: string; routingLast4: string }
  | { type: 'wallet'; provider: 'apple_pay' | 'google_pay' };

type Money = Opaque<number, 'Money'>;
type OrderId = Opaque<string, 'OrderId'>;
type CustomerId = Opaque<string, 'CustomerId'>;

type PaymentRequest = {
  orderId: OrderId;
  customerId: CustomerId;
  amount: Money;
  currency: 'usd' | 'eur' | 'gbp';
  method: PaymentMethod;
  idempotencyKey: string; // prevents duplicate charges on retry
};

type PaymentResult =
  | { status: 'succeeded'; chargeId: string; amount: Money; receiptUrl: string }
  | { status: 'requires_action'; chargeId: string; clientSecret: string; actionUrl: string }
  | { status: 'failed'; code: 'card_declined' | 'insufficient_funds' | 'expired_card' | 'fraud_suspected'; retryable: boolean };

// Processing function — exhaustive result handling enforced
async function processPayment(request: PaymentRequest): Promise<PaymentResult> {
  // Implementation — returns discriminated union
  const response = await paymentGateway.charge(request);

  if (response.status === 'succeeded') {
    return {
      status: 'succeeded',
      chargeId: response.chargeId,
      amount: request.amount,
      receiptUrl: response.receiptUrl,
    };
  }

  if (response.status === 'action_required') {
    return {
      status: 'requires_action',
      chargeId: response.chargeId,
      clientSecret: response.clientSecret,
      actionUrl: response.actionUrl,
    };
  }

  return {
    status: 'failed',
    code: response.declineCode,
    retryable: response.declineCode !== 'fraud_suspected',
  };
}

// Usage — TypeScript forces handling every outcome
const result = await processPayment(paymentRequest);

switch (result.status) {
  case 'succeeded':
    await sendReceipt(result.receiptUrl);
    await updateOrderStatus(request.orderId, 'paid');
    break;
  case 'requires_action':
    redirectUser(result.actionUrl);
    break;
  case 'failed':
    if (result.retryable) {
      await scheduleRetry(request.orderId);
    } else {
      await notifyCustomerOfFailure(request.customerId, result.code);
    }
    break;
  default:
    const _never: never = result; // compile error if new status added without handling
}
```
