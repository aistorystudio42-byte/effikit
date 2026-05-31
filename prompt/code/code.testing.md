<!-- @keywords: test, unit test, write tests, jest, vitest, mock, test coverage, test suite -->
<!-- @domain: Test Writing Prompts -->

# Test Writing Prompts

## Unit Tests for a Function

```
Write unit tests for the following function.

**Function under test:**
[paste function]

**Test framework:** [Jest / Vitest]

**Coverage requirements:**
- Happy path: all expected inputs and outputs
- Edge cases: [empty input, zero, null, max values, etc.]
- Error cases: what throws, what returns null/undefined
- Type edge cases if TypeScript generics are involved

**Structure:**
describe('[functionName]', () => {
  describe('happy path', () => { ... })
  describe('edge cases', () => { ... })
  describe('error handling', () => { ... })
})

**Rules:**
- Each test has a single assertion (or related group)
- Test names read as sentences: "returns empty array when input is null"
- No implementation details leaked into tests — test behavior, not code
- No test depends on another test
- Total: minimum 10 tests
```

---

## React Component Tests

```
Write tests for this React component: [ComponentName]

**Component:**
[paste component]

**Test library:** React Testing Library + [Jest / Vitest]

**Test cases to cover:**
1. Renders correctly with minimal required props
2. Renders correctly with all props
3. [interaction]: clicking [element] calls [callback] with [args]
4. [state change]: after [action], shows [expected UI]
5. Loading state: shows skeleton/spinner when isLoading=true
6. Error state: shows error message when error is provided
7. Empty state: shows empty message when data=[]
8. Accessibility: [key element] has correct aria attributes

**Rules:**
- Query by accessible roles/labels, not CSS selectors or test IDs
- userEvent over fireEvent for interactions
- Don't test implementation (state vars, internal functions)
- Mock only what you can't control (network, timers, external libs)
```

---

## API Integration Tests

```
Write integration tests for this API endpoint: [method] [path]

**Framework:** [Supertest + Jest / Vitest / Playwright API testing]

**Setup:**
- Database: [in-memory / test DB / mocked repository]
- Auth: [how to generate a valid test token]
- Seed data: [what data must exist before tests run]

**Test cases:**
- 200: successful response with correct shape
- 400: missing required field → validation error with field name
- 400: invalid format → specific error message
- 401: missing auth token → 401 response
- 403: authenticated but wrong role → 403 response
- 404: resource doesn't exist → 404 with message
- 500: database error → 500 with no sensitive info leaked

**After each test:** clean up created test data (use transactions or truncate)

**Response shape validation:** use Zod or explicit field assertions, 
not just status code checks.
```

---

## Mock Factories

```
Create test mock factories for these types:

**Types to mock:**
[paste TypeScript types]

**Requirements:**
- Factory function: createMock[TypeName](overrides?: Partial<TypeName>): TypeName
- Provides realistic defaults (not empty strings, not zeros everywhere)
- Overrides are deeply merged, not shallow
- IDs are unique per call (use a counter or uuid)
- Dates are fixed (use a fixed test date, not Date.now())
- Nested objects also have factories

**Example target:**
function createMockUser(overrides?: Partial<User>): User {
  return {
    id: `user-${counter++}`,
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    createdAt: new Date('2025-01-01'),
    ...overrides,
  };
}

Produce factories for all listed types.
```

---

## Test Coverage Gap Analysis

```
Analyze this code and list what tests are missing.

**Code under test:**
[paste function/class/module]

**Existing tests (if any):**
[paste or describe]

**Analysis format:**
For each missing test case:
- Scenario: [what situation is untested]
- Why it matters: [what bug it could catch]
- Test sketch:
  it('[test name]', () => {
    // [brief pseudocode of the test]
  })

Focus on: untested branches (if/else), error paths, boundary values,
concurrent or async race conditions, and dependency failure scenarios.

Sort by risk: High / Medium / Low.
```
