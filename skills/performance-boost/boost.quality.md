<!-- @keywords: code quality, standards, craftsmanship, clean code, technical excellence, quality mindset -->

# Full test suite + coverage + security scan

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to quality.

## Principles

### Quality and Speed Are Not Opposites
The belief that quality slows you down is a short-term illusion. Low-quality code creates rework, debugging time, and merge conflicts that cost far more time than the quality shortcuts saved.

```
Quality debt accumulation rate:
  Day 1: skip tests → save 30 minutes
  Week 1: bug found in untested code → 2 hours to debug
  Month 1: bug caused by untested code interaction → 4 hours to debug
  Month 3: refactor impossible without tests → sprint delayed

The math:
  30 minutes saved once vs 6+ hours lost over 3 months
  = -5.5 hours net from skipping tests

Quality isn't slow. Rework is slow.
```

---

### The Quality Ratchet
The quality ratchet: each piece of code you write must not make the codebase worse.

```
Quality ratchet rules:
  1. Leave code cleaner than you found it (Boy Scout Rule)
     → Fix one thing you notice while passing through (not a full refactor)
     → Rename one unclear variable, extract one unnamed expression

  2. Never merge without tests for the new behavior
     → If it's too hard to test → the design needs improvement
     → Hard-to-test code is coupled, not modular

  3. Never merge code you wouldn't want to maintain 6 months from now
     → If you'd be embarrassed to own this in 6 months, don't merge it now

  4. Never suppress linting warnings with `// eslint-disable`
     → Fix the issue or add an explicit exception with explanation
     → `// eslint-disable-next-line no-console` is fine
     → `// eslint-disable-file` is a warning sign

  5. One definition of "done": code works + code is right
```

---

### Fast Quality Checks
```bash

npm run lint       # ESLint + type check (10 seconds)
npm run test:unit  # Run unit tests (15 seconds)

npm run test       # All tests including integration (2 min)

```

---

### TypeScript Strictness as Quality Gate
```typescript
// tsconfig.json — quality through type strictness
{
  "compilerOptions": {
    "strict": true,              // enables all strict checks
    "noImplicitAny": true,       // all vars must be typed
    "strictNullChecks": true,    // null/undefined handled explicitly
    "noUncheckedIndexedAccess": true, // array[i] might be undefined
    "noImplicitReturns": true,   // all code paths must return
    "exactOptionalPropertyTypes": true, // optional ≠ undefined-able
    "noUnusedLocals": true,      // no dead variables
    "noUnusedParameters": true,  // no unused function params
  }
}

// Every `any` removed = one potential runtime crash prevented
// Every strict null check = one `Cannot read property of undefined` prevented
// Every unused variable removed = one source of confusion eliminated
```

---

### Automated Quality Enforcement
```json
// package.json — quality as automation, not discipline
{
  "scripts": {
    "lint": "eslint src --ext .ts,.tsx --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --coverage",
    "quality": "npm run lint && npm run typecheck && npm run test",
    "precommit": "lint-staged"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

```javascript
// .eslintrc.js — quality rules enforced automatically
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/strict',
    'plugin:jsx-a11y/recommended',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    'no-console': ['warn', { allow: ['error', 'warn'] }],
  }
};
```

---

### Quality Metrics That Matter
```
Useful quality metrics:
  Test coverage on business logic: target > 90%
  TypeScript strict mode: 0 errors
  ESLint warnings: 0 on main branch
  Dependency vulnerabilities: 0 high/critical
  Bundle size: tracked, budget enforced

Misleading quality metrics:
  Total test coverage %: can inflate with trivial tests
  Lines of code: more ≠ better
  Number of PRs merged: more ≠ better
  PR velocity: faster ≠ higher quality

Real quality indicator: time to add a new feature
  Fast codebase: new feature in 2 days
  Slow codebase: same feature in 2 weeks (same complexity)
  The difference is accumulated quality debt
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

```
Self-review protocol before submitting PR:

1. Read the diff as if you're a stranger (are you)
   What's confusing? What requires a comment to understand?

2. Run the mental test:
   "If this code fails in production at 2am, can I understand it
    well enough to fix it quickly while half asleep?"

3. Check the test quality:
   Do the tests describe behavior? ("creates order with pending status")
   Or just existence? ("order is created")

4. Check the naming:
   Can you read each function name and understand what it does?
   Would a new team member understand the variable names?

5. Check the abstractions:
   Is every abstraction earning its existence?
   Is there anything that could be simplified?

6. Check for future you:
   Is there any decision that future-you will not understand?
   Document it with a WHY comment.
```

---

- [ ] Codebase left cleaner than it was found (Boy Scout Rule)
- [ ] Pre-commit hooks installed and running (lint + type check + unit tests)
- [ ] TypeScript strict mode enabled — zero errors
- [ ] No `any` types in business logic
- [ ] All new behavior covered by tests
- [ ] Self-review done before requesting review
- [ ] Decisions that would confuse future-you are documented with WHY
- [ ] Quality debt logged and prioritized (not ignored)
