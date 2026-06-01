<!-- @keywords: testing strategy, test coverage, TDD, test pyramid, coverage thresholds, CI testing -->

# Target: > 70% mutation score on business logic

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to strategy.

## Principles

### The Testing Pyramid
```
        /\
       /E2E\         ← 5-10 critical user journeys
      /------\
     /Integr. \      ← all API endpoints, DB interactions
    /----------\
   /  Unit Tests \   ← all business logic, utilities, reducers
  /--------------\
```

Invert this pyramid (too many E2E, few unit tests) and you get a slow, brittle test suite that fails often for unrelated reasons.

---

### Test-Driven Development (TDD)
TDD is most valuable for business logic with clear requirements and edge cases.

```
Red → Green → Refactor cycle:

1. Red:    Write a failing test that describes desired behavior
2. Green:  Write the minimum code to make it pass
3. Refactor: Clean up — tests still pass
```

```typescript
// Step 1: Red — write test first
it('calculates shipping cost based on weight and zone', () => {
  const calculator = new ShippingCalculator();
  expect(calculator.calculate({ weightKg: 2.5, zone: 'domestic' })).toBe(8_99);
  expect(calculator.calculate({ weightKg: 10, zone: 'domestic' })).toBe(18_99);
  expect(calculator.calculate({ weightKg: 2.5, zone: 'international' })).toBe(24_99);
});

// Step 2: Green — implement just enough to pass
class ShippingCalculator {
  calculate({ weightKg, zone }: { weightKg: number; zone: string }): number {
    const base = zone === 'international' ? 15_00 : 5_00;
    const perKg = zone === 'international' ? 4_00 : 1_60;
    return base + Math.ceil(weightKg) * perKg;
  }
}

// Step 3: Refactor — extract constants, add types, etc.
```

**TDD is useful when:**
- Requirements are clear and stable
- Business logic is complex with many edge cases
- You're writing a library or utility

**TDD is less useful when:**
- Exploring/prototyping (requirements are unclear)
- UI components (hard to write tests before seeing the visual)
- Infrastructure code

---

### Mutation Testing
Regular coverage tells you which lines ran. Mutation testing tells you if your tests actually catch bugs.

```bash
npx stryker run

```

---

### Test Maintenance Guidelines
```
Flaky tests: Fix or delete — never ignore
  - Flaky test causes: timing, shared state, network dependency
  - Use deterministic time mocking, isolated state, stub network

When to delete tests:
  - Feature is removed
  - Test tests implementation, not behavior (brittle)
  - Test is permanently skipped (it.skip for > 1 sprint)
  - Test is a duplicate of an integration test

When a bug is found:
  1. Write a failing test that reproduces the bug
  2. Fix the bug
  3. Verify test passes
  4. Keep the test — it prevents regression

Test ownership:
  - Feature team owns feature tests
  - Platform team owns infrastructure tests
  - Every PR that introduces a bug must include a regression test
```

---

## Decision Framework

Coverage percentage is a vanity metric unless it reflects meaningful tests. 80% coverage with tests that don't assert anything is worse than 60% with strong assertions.

```
Must have coverage (high risk, high value):
  ✓ Authentication and authorization logic
  ✓ Payment processing, financial calculations
  ✓ Data transformation and validation
  ✓ State machine transitions
  ✓ Error handling paths
  ✓ Security-sensitive code

Lower priority:
  - Simple CRUD endpoints (covered by integration tests)
  - UI rendering (covered by E2E)
  - Configuration files
  - Type definitions
  - Third-party wrappers with no logic
```

### Recommended Coverage Thresholds
```json
// jest.config.ts
{
  "coverageThreshold": {
    "global": {
      "statements": 80,
      "branches": 75,
      "functions": 80,
      "lines": 80
    },
    "./src/services/": {
      "statements": 90,   // business logic — stricter
      "branches": 85
    },
    "./src/utils/": {
      "statements": 95    // pure functions — nearly complete
    }
  }
}
```

---

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npm run test:integration
        env:
          TEST_DATABASE_URL: postgresql://test:test@localhost:5432/testdb

  e2e:
    runs-on: ubuntu-latest
    needs: [unit, integration] # only run if others pass
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Anti-Patterns

- Over-engineering the solution.
- Ignoring context and copying blindly.
- Mixing concerns unnecessarily.

## Example in Action

- [ ] Test pyramid respected: many unit, moderate integration, few E2E
- [ ] Coverage thresholds configured and enforced in CI
- [ ] Business logic ≥ 90% branch coverage
- [ ] All tests pass with no skips in main branch
- [ ] Flaky tests tracked and resolved within one sprint
- [ ] Every bug fix includes a regression test
- [ ] E2E tests cover the top 5 revenue-critical user paths
- [ ] Mutation testing run quarterly on core business logic
