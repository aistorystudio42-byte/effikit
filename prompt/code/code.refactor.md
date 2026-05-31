<!-- @keywords: refactor, clean up, improve code, restructure, extract function, dry, solid -->
<!-- @domain: Code Refactoring Prompts -->

# Code Refactoring Prompts

## General Refactor

```
Refactor the following code. Preserve all existing behavior exactly.

**Goals (in priority order):**
1. [readability / performance / type safety / DRY / testability]
2. [second goal]
3. [third goal]

**Constraints:**
- Do NOT change the public API (function signatures, exported names)
- Do NOT add new dependencies
- Do NOT add features not already present
- TypeScript strict — no `any` introduced

**Code:**
[paste code here]

**Output:**
Refactored code only. If you changed something non-obvious, add a single 
inline comment on that line explaining why.
```

---

## Extract and Modularize

```
This file is doing too much. Break it into focused modules.

**Current file:** [filename — paste content below]

**Problem:** [describe what's tangled — e.g., "auth logic mixed with UI state"]

**Target structure:**
- [module-name.ts] → [what it should contain]
- [module-name.ts] → [what it should contain]
- [original-file.ts] → [what remains]

**Rules:**
- No circular imports
- Each module has a single clear responsibility
- Maintain all existing exports from the original file (re-export if needed)
- No behavior changes

[paste file content]
```

---

## Remove Duplication

```
These [N] files/functions have significant duplication. Extract the shared logic.

**Files/functions involved:**
[list them]

**What's duplicated:**
[describe the repeated pattern]

**What varies between them:**
[describe the differences — these become parameters]

**Requirements:**
- The shared abstraction must handle all [N] cases
- Each call site should be simpler after the refactor
- Generic TypeScript — callers shouldn't lose type safety
- If the abstraction is a hook/utility, show updated call sites too

[paste duplicated code]
```

---

## Improve Naming

```
Rename variables, functions, and types in this code for clarity.

**Problems with current names:**
- [name] → unclear because [reason]
- [name] → too abbreviated
- [name] → misleading (implies [X] but actually does [Y])

**Naming rules to follow:**
- Functions: verb phrases describing what they DO (getUser, calculateTotal)
- Booleans: is/has/can prefix (isLoading, hasPermission, canDelete)
- Types: PascalCase noun describing the shape (UserProfile, not IUser or TUser)
- Constants: UPPER_SNAKE for truly constant values, camelCase for config objects
- Avoid: data, info, item, obj, temp, result as standalone names

[paste code]

Output: renamed code. Include a mapping table at the top:
old name → new name (reason)
```

---

## Async / Promise Refactor

```
Refactor this async code to be cleaner and more resilient.

**Current problems:**
- [ ] Unhandled promise rejections
- [ ] Nested .then() chains (callback hell)
- [ ] Missing loading/error state management
- [ ] No abort/cancellation support
- [ ] Race conditions possible
- [x mark the ones that apply]

**Requirements:**
- Convert to async/await throughout
- Add proper error typing (no `catch (e: any)`)
- Add AbortController support if this runs in React
- Ensure no race conditions for overlapping calls
- Return type must be explicit

[paste code]
```
