<!-- @keywords: typescript, types, generics, interface, type safety, infer, conditional type, utility type -->
<!-- @domain: TypeScript Type System Prompts -->

# TypeScript Type System Prompts

## Design Types for a Domain

```
Design TypeScript types for: [domain name]

**Entities involved:**
- [Entity1]: [description]
- [Entity2]: [description]
- [Relation]: [how they relate]

**Requirements:**
- Discriminated unions for [states/variants that differ structurally]
- No `any`, no `object`, no `{}` as catch-all
- Readonly where mutation shouldn't happen
- Optional vs required fields must be intentional
- Branded types for IDs (prevent passing UserId where PostId is expected)

**API contract types:**
- Request DTOs (what comes in from the client)
- Response DTOs (what goes out — may differ from DB shape)
- Internal domain types (what the service layer uses)

Show: all types + a few example values that prove the types work.
```

---

## Generic Utility Type

```
Create a TypeScript generic utility type: [TypeName]

**What it does:**
[describe the transformation — e.g., "Makes all properties optional except those in K"]

**Signature:**
type [Name]<T, [additional generics]> = [...]

**Examples:**
type A = [Name]<{ id: string; name: string; age: number }, 'id'>
// A should be: { id: string; name?: string; age?: number }

type B = [Name]<[...], [...]>
// B should be: [...]

**Constraints:**
- Must work with any object type T
- Preserve readonly modifiers
- Distribute over union types if applicable

Show: the type definition + at minimum 3 example usages proving correctness.
```

---

## Strict API Response Typing

```
Create a type-safe API response wrapper for this endpoint:

**Endpoint:** [method] [path]
**Success response shape:** [describe or paste JSON]
**Error cases:** [list possible error types]

**Requirements:**
- Discriminated union for success/error states:
  { success: true; data: T } | { success: false; error: ApiError }
- ApiError has a typed `code` field (not just a string)
- All response fields explicitly typed — no `any`
- Zod schema for runtime validation that derives the TypeScript type
  (use z.infer<typeof schema>)

Output:
1. Zod schema
2. Derived TypeScript type
3. Type guard function: isSuccessResponse(r): r is SuccessResponse<T>
4. Example usage in a fetch function
```

---

## Conditional & Mapped Types

```
Explain and implement this type-level logic:

**Goal:** [describe what the type should do]

**Input types:**
type Input = [paste or describe]

**Expected output types:**
When Input is [X] → result should be [Y]
When Input is [A] → result should be [B]

**Techniques that might apply:**
- Conditional types: T extends X ? Y : Z
- Mapped types: { [K in keyof T]: ... }
- Template literal types: `${string}Id`
- Infer keyword for type extraction
- Recursive types for nested structures

Show:
1. The type definition with inline comments explaining each line
2. 5 concrete examples proving it works
3. One edge case that might fail and how to handle it
```

---

## Migrate JS to TypeScript

```
Add TypeScript types to this JavaScript code. Do not change behavior.

**Strictness level:** strict (tsconfig strict: true)

**Rules:**
- No `any` — use `unknown` with type guards if shape is uncertain
- No type assertions (`as X`) unless absolutely unavoidable — prefer type guards
- Function parameters and return types must be explicit
- Object shapes must be interfaces or named types (not inline)
- Generics where the function works on multiple types

**Existing code:**
[paste JavaScript]

**Output:**
TypeScript version only. List new types/interfaces at the top of the file.
If you had to make assumptions about a type, add a comment: 
// ASSUMPTION: [what you assumed and why]
```
