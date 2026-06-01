<!-- @keywords: coding standards, team standards, automated enforcement, ESLint, Prettier, TypeScript config, RFC process, living documentation, standard categories, style guide -->

# RFC: [Standard Name Change]

## Core Philosophy

A coding standard that lives in a Google Doc nobody reads is not a standard — it is aspirational documentation. A standard that lives in ESLint, TypeScript strict mode, and CI is one that enforces itself. Standards are only real when the build breaks if you violate them.

The second failure mode: standards that are too rigid to evolve. A standard that cannot be updated through a transparent process will be worked around in secret. Build a standards change process before you need it.

---

**1. Automate the boring standards.** Every standard that can be automated must be automated. If a human is reviewing formatting, a human is wasting time that could be spent on logic.

**2. tsconfig strict is non-negotiable.** `"strict": true` in tsconfig.json eliminates entire categories of runtime bugs at compile time. The short-term pain of fixing strict errors is worth it exactly once.

**3. Standards must have rationale.** "We don't use default exports" with no explanation gets ignored or argued against. "We don't use default exports because rename refactors break silently and named exports are always explicit about what they're importing" gets adopted.

**4. Living documentation beats static docs.** Standards that can be PRed and discussed evolve with the team. Standards that require an approval meeting don't.

**5. RFC for standard changes.** Any change to enforced standards requires: 1) Problem statement, 2) Proposed change, 3) Migration plan for existing code, 4) 48-hour comment window. This prevents arbitrary standard changes while allowing evolution.

---

## When to Activate

- Starting a new team or project
- Onboarding a developer who keeps writing code that "feels off"
- After a production incident caused by inconsistent patterns
- Preparing to scale a codebase across multiple teams

---

## Principles

**1. Enforced automatically (zero human review needed):**
- Formatting: Prettier, EditorConfig
- Import ordering: eslint-plugin-import
- Type safety: tsconfig strict mode + no-explicit-any rule
- Dead code: unused-vars, no-unreachable
- Security: eslint-plugin-security basics

**2. Enforced in code review (human judgment required):**
- Naming conventions (can't be linted perfectly)
- Abstraction level appropriateness
- Test quality and coverage of meaningful cases
- Architecture decisions (right layer for the logic)

**3. Documented but not enforced (team culture):**
- Commit message format (suggest: Conventional Commits)
- PR size guidelines (suggest: < 400 lines changed)
- Documentation standards for public APIs

---

### Problem
What existing behavior or gap is this addressing?

### Proposed Change
What exactly changes? Before/after code example.

### Migration Plan
How do we update existing code that violates the new standard?
Automated codemod? Manual? Gradual?

### Comment Period
Open until [DATE + 48 hours]. Decisions made by team consensus or tech lead.
```

## Decision Framework

```
Can a linter enforce this standard automatically?
├── YES → add it to ESLint/tsconfig, remove from review checklist
└── NO  → is it important enough to be a hard requirement?
    ├── YES → add to PR template checklist, train reviewers on it
    └── NO  → document as guideline, not rule

Is a developer repeatedly violating the same standard?
├── YES → can it be automated now? → automate first
│         if not → pair session, not code review comments
└── NO  → standard is being followed, verify it's still relevant

Does a new tool or pattern conflict with an existing standard?
└── RFC process: write the proposal, 48-hour window, team discussion, decision
```

---

## Anti-Patterns

- Standards document that no one knows exists
- Linting disabled for "legacy" code permanently — tech debt that compounds
- Different standards per developer or per PR — inconsistency is worse than imperfect consistency
- Standards enforced in code review that could be automated — trust the tools
- Standards that have no rationale — "because X said so" gets overridden when X leaves
- Requiring perfect coverage metrics — coverage of bad tests is meaningless
- Blocking PRs over style violations that Prettier would fix automatically

---

## Example in Action

TypeScript coding standard a 5-person team would actually adopt:

---

**`.eslintrc.json` — The automated enforcer:**
```json
{
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/strict"],
  "plugins": ["@typescript-eslint", "import"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-non-null-assertion": "error",
    "no-console": ["warn", { "allow": ["error"] }],
    "import/no-default-export": "error",
    "import/order": ["error", {
      "groups": ["builtin", "external", "internal", "parent", "sibling"],
      "newlines-between": "always"
    }]
  }
}
```

**`tsconfig.json` — Strict mode required:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Human-review checklist (in PR template):**
```markdown

- [ ] Functions have a single responsibility — describe it in one sentence
- [ ] Error cases are handled explicitly, not swallowed
- [ ] New public functions have a JSDoc comment with @param and @returns
- [ ] No TODO comments without a linked issue
- [ ] Tests cover the failure path, not just the happy path
```

**RFC template for standard changes:**
```markdown
