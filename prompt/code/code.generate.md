<!-- @keywords: generate code, implement feature, write function, create component, build module -->
<!-- @domain: Code Generation Prompts -->

# Code Generation Prompts

## Full Feature Implementation

```
Implement [feature name] with the following requirements:

**Context:**
- Tech stack: [Next.js 14 / React / Node / etc.]
- Existing patterns in this codebase: [brief description]
- Must integrate with: [auth system / database / API]

**Functional requirements:**
1. [requirement]
2. [requirement]
3. [requirement]

**Non-functional requirements:**
- TypeScript strict mode, no `any`
- Accessible (WCAG 2.1 AA)
- Mobile-responsive
- Error states handled

**Output:**
- Component file(s) with full implementation
- TypeScript interfaces/types
- Props with JSDoc where non-obvious
- No placeholder logic — fully working code
```

---

## React Component

```
Create a React component: [ComponentName]

**Purpose:** [one sentence — what it does]

**Props:**
- `data: [Type]` — [description]
- `onAction: (id: string) => void` — [when it fires]
- `variant?: 'default' | 'compact'` — [visual difference]
- `className?: string` — style override passthrough

**Behavior:**
- [state behavior 1]
- [state behavior 2]
- Loading state: [what happens while loading]
- Empty state: [what shows when data is empty]
- Error state: [how errors are displayed]

**Tech:**
- Tailwind CSS for styling
- shadcn/ui primitives where applicable
- Framer Motion for [specific animation]
- Forward ref support

Produce: component file + TypeScript types.
No test file needed.
```

---

## API Route / Endpoint

```
Implement a [GET/POST/PATCH/DELETE] API endpoint: [route path]

**Purpose:** [what this endpoint does]

**Request:**
- Auth required: [yes/no — if yes, how: JWT / session / API key]
- Body schema: { field: type, field: type }
- Query params: [none / ?page=&limit=]
- Path params: [none / :id]

**Response:**
- 200: { data: [...], meta: { total, page } }
- 400: validation error with field details
- 401: not authenticated
- 404: resource not found
- 500: internal error with error ID for tracing

**Business logic:**
1. [step]
2. [step]
3. [step]

**Tech:**
- Framework: [Next.js API route / Express / Fastify]
- Validation: Zod
- DB: [Prisma / Supabase / Drizzle]

Include: input validation, error handling, response shaping.
```

---

## TypeScript Utility / Helper

```
Write a TypeScript utility function: [functionName]

**Signature:**
function [name]<T extends [constraint]>(
  input: [InputType],
  options?: [OptionsType]
): [ReturnType]

**What it does:**
[Clear description of the transformation or computation]

**Edge cases to handle:**
- Empty input → [expected behavior]
- Null/undefined values → [expected behavior]
- [specific edge case] → [expected behavior]

**Examples:**
Input:  [example input]
Output: [expected output]

Input:  [edge case input]
Output: [expected output]

**Constraints:**
- Pure function (no side effects)
- Generic where possible
- Full TypeScript inference — no `any`
- JSDoc with @param, @returns, @example

Do not create a class. Return the function directly.
```

---

## Database Query / Data Layer

```
Write the data layer for: [operation name]

**Operation:** [describe what data operation is needed]

**Schema involved:**
- Table: [table name]
- Relevant columns: [col: type, col: type]
- Foreign keys: [relation description]

**Query requirements:**
- Filter by: [field conditions]
- Sort by: [field, direction]
- Paginate: [yes/no — cursor or offset]
- Joins: [which tables and how]

**Performance constraints:**
- Expected row count: [number]
- Must use indexed columns for WHERE
- Max acceptable query time: [ms]

**Tech:**
- ORM/Client: [Prisma / Drizzle / Supabase / raw SQL]
- Return type: [TypeScript type expected]

Include: the query function, TypeScript return type, and a comment 
explaining any non-obvious optimization.
```
