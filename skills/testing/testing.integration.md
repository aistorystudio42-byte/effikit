<!-- @keywords: integration testing, API testing, database testing, supertest, test containers, real database -->

# Testing — Integration Tests

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to integration.

## Principles

### Integration vs Unit Tests
Integration tests verify that components work together correctly — the interactions between your code and external systems (database, HTTP, file system, message queues).

```
Unit tests ask:     "Does this function produce the right output?"
Integration tests ask: "Does this endpoint do the right thing end-to-end?"

Unit: fast, isolated, many
Integration: slower, uses real dependencies, fewer but higher confidence
```

---

### API Integration Testing with Supertest
```typescript
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/database';
import { createTestUser, createTestToken } from './helpers';

describe('POST /api/orders', () => {
  beforeEach(async () => {
    await db.migrate.rollback();
    await db.migrate.latest();
    await db.seed.run(); // seed base data
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('creates order and returns 201 with order data', async () => {
    const user = await createTestUser({ role: 'user' });
    const token = createTestToken(user.id);

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: 'prod_123', quantity: 2 }],
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          country: 'US',
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      status: 'pending',
      items: expect.arrayContaining([
        expect.objectContaining({ productId: 'prod_123', quantity: 2 }),
      ]),
    });
    expect(response.headers.location).toMatch(/\/api\/orders\/.+/);
  });

  it('returns 401 when not authenticated', async () => {
    const response = await request(app)
      .post('/api/orders')
      .send({ items: [] });

    expect(response.status).toBe(401);
  });

  it('returns 422 when items array is empty', async () => {
    const user = await createTestUser();
    const token = createTestToken(user.id);

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [] });

    expect(response.status).toBe(422);
    expect(response.body.error.details.items).toBeDefined();
  });
});
```

---

### Database Integration Testing
```typescript
// Use a real test database — not mocks
// Why: mocks don't catch constraint violations, migration issues, query correctness

// Test database setup: separate DB per test suite, reset between tests
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL!;

class TestDatabase {
  async reset(): Promise<void> {
    // Truncate all tables in reverse dependency order
    await db.raw(`
      TRUNCATE TABLE order_items, orders, products, users
      RESTART IDENTITY CASCADE
    `);
  }

  async seed(fixtures: Partial<DatabaseFixtures>): Promise<DatabaseFixtures> {
    const users = fixtures.users
      ? await db('users').insert(fixtures.users).returning('*')
      : [];

    const products = fixtures.products
      ? await db('products').insert(fixtures.products).returning('*')
      : [];

    return { users, products };
  }
}

describe('UserRepository', () => {
  const testDb = new TestDatabase();
  let userRepo: UserRepository;

  beforeEach(async () => {
    await testDb.reset();
    userRepo = new UserRepository(db);
  });

  it('findByEmail returns user when exists', async () => {
    await testDb.seed({
      users: [{ email: 'alice@example.com', name: 'Alice', password_hash: 'hash' }],
    });

    const user = await userRepo.findByEmail('alice@example.com');

    expect(user).not.toBeNull();
    expect(user!.email).toBe('alice@example.com');
  });

  it('findByEmail returns null when user does not exist', async () => {
    const user = await userRepo.findByEmail('nobody@example.com');
    expect(user).toBeNull();
  });

  it('create enforces unique email constraint', async () => {
    await testDb.seed({
      users: [{ email: 'alice@example.com', name: 'Alice', password_hash: 'hash' }],
    });

    await expect(
      userRepo.create({ email: 'alice@example.com', name: 'Alice 2', passwordHash: 'hash2' })
    ).rejects.toThrow(/unique constraint/i);
  });
});
```

---

### Test Containers (Ephemeral Database)
For CI environments without a persistent test database:

```typescript
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Client } from 'pg';

let container: StartedTestContainer;
let dbClient: Client;

beforeAll(async () => {
  container = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
      POSTGRES_DB: 'testdb',
    })
    .withExposedPorts(5432)
    .start();

  const port = container.getMappedPort(5432);
  const connectionString = `postgresql://test:test@localhost:${port}/testdb`;

  // Run migrations on fresh container
  await runMigrations(connectionString);

  dbClient = new Client({ connectionString });
  await dbClient.connect();
}, 60_000); // allow time for container to start

afterAll(async () => {
  await dbClient.end();
  await container.stop();
});
```

---

### Test Helpers and Factories
```typescript
// factories/user.factory.ts — create valid test data consistently
import { faker } from '@faker-js/faker';

export function buildUser(overrides: Partial<CreateUserDto> = {}): CreateUserDto {
  return {
    email: faker.internet.email(),
    name: faker.person.fullName(),
    password: 'Test1234!',
    role: 'user',
    ...overrides,
  };
}

export async function createTestUser(
  overrides: Partial<CreateUserDto> = {},
  db = testDb
): Promise<User> {
  const dto = buildUser(overrides);
  const hashedPassword = await bcrypt.hash(dto.password, 1); // low cost for tests
  return db('users').insert({ ...dto, password_hash: hashedPassword }).returning('*').then(r => r[0]);
}

export function createTestToken(userId: string, role = 'user'): string {
  return jwt.sign({ sub: userId, role }, process.env.JWT_TEST_SECRET!, { expiresIn: '1h' });
}
```

---

### Testing External Services (HTTP Mocking)
```typescript
import nock from 'nock';

describe('PaymentService', () => {
  afterEach(() => nock.cleanAll());

  it('processes payment successfully', async () => {
    // Mock Stripe API response
    nock('https://api.stripe.com')
      .post('/v1/payment_intents')
      .reply(200, {
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 5000,
      });

    const result = await paymentService.charge({ amount: 5000, currency: 'usd' });

    expect(result.status).toBe('succeeded');
    expect(result.stripePaymentIntentId).toBe('pi_test_123');
  });

  it('handles Stripe API errors gracefully', async () => {
    nock('https://api.stripe.com')
      .post('/v1/payment_intents')
      .reply(402, { error: { code: 'card_declined', message: 'Card declined' } });

    await expect(
      paymentService.charge({ amount: 5000, currency: 'usd' })
    ).rejects.toThrow(PaymentDeclinedError);
  });
});
```

---

## Decision Framework

```
What to test with integration tests:
  ✓ Full request-response cycle (auth → validation → business logic → DB → response)
  ✓ Database constraint violations
  ✓ Migration correctness (does your code work with the current schema?)
  ✓ Real query correctness (joins, aggregations, edge cases)
  ✓ External API error handling

What to leave for unit tests:
  ✗ Business logic edge cases (too slow with DB setup)
  ✗ Calculation correctness (pure logic, no DB needed)
  ✗ Validation rules (already tested in unit tests)
```

---

## Anti-Patterns

- Over-engineering the solution.
- Ignoring context and copying blindly.
- Mixing concerns unnecessarily.

## Example in Action

- [ ] Each integration test uses a real database (not mocked)
- [ ] Database reset between tests (no state leaks)
- [ ] Test factories produce valid, realistic data
- [ ] Auth flow tested (401 without token, 403 insufficient permissions)
- [ ] Error paths tested (not just happy path)
- [ ] External HTTP calls mocked with realistic payloads
- [ ] Tests can run in any order (no dependency between tests)
