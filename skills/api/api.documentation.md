<!-- @keywords: api documentation, OpenAPI, swagger, JSDoc, endpoint docs, schema documentation -->

# openapi.yaml

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to documentation.

## Principles

### Why Documentation Is Not Optional
An undocumented API is a black box. Consumers waste hours guessing request formats, error codes, and edge cases. Good API documentation is a force multiplier: it reduces support burden, enables faster integration, and serves as a contract that breaks loudly when violated.

---

OpenAPI (formerly Swagger) is the industry standard for describing REST APIs. Define it once, generate client SDKs, test suites, and interactive docs automatically.

```yaml
openapi: 3.0.3
info:
  title: MyApp API
  version: 2.0.0
  description: |
    Core API for MyApp. All requests require authentication unless marked otherwise.
    
    **Base URL:** `https://api.myapp.com/v2`
    
    **Rate limits:** 100 requests/minute per API key. Headers `X-RateLimit-*` indicate current usage.
  contact:
    email: api@myapp.com
  license:
    name: MIT

servers:
  - url: https://api.myapp.com/v2
    description: Production
  - url: https://staging-api.myapp.com/v2
    description: Staging

security:
  - BearerAuth: []

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    User:
      type: object
      required: [id, email, name, createdAt]
      properties:
        id:
          type: string
          format: uuid
          example: "550e8400-e29b-41d4-a716-446655440000"
        email:
          type: string
          format: email
          example: "alice@example.com"
        name:
          type: string
          example: "Alice Smith"
        createdAt:
          type: string
          format: date-time
          example: "2024-01-15T09:00:00Z"

    Error:
      type: object
      required: [error]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code:
              type: string
              example: "VALIDATION_ERROR"
            message:
              type: string
              example: "Request validation failed"
            details:
              type: object
              additionalProperties:
                type: array
                items:
                  type: string

paths:
  /users:
    get:
      summary: List users
      description: Returns paginated list of users. Requires admin role.
      operationId: listUsers
      tags: [Users]
      security:
        - BearerAuth: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: role
          in: query
          schema:
            type: string
            enum: [user, admin, moderator]
      responses:
        '200':
          description: Paginated list of users
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
                  meta:
                    type: object
                    properties:
                      total:
                        type: integer
                      page:
                        type: integer
                      limit:
                        type: integer
        '401':
          description: Missing or invalid authentication
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          description: Insufficient permissions (admin role required)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
```

---

### Inline Documentation with Zod + OpenAPI
```typescript
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

const CreateUserSchema = z.object({
  name: z.string()
    .min(2)
    .max(100)
    .openapi({ example: 'Alice Smith', description: 'Full display name' }),
    
  email: z.string()
    .email()
    .openapi({ example: 'alice@example.com' }),
    
  password: z.string()
    .min(8)
    .openapi({ description: 'Minimum 8 characters. Never returned in responses.' }),
    
  role: z.enum(['user', 'admin'])
    .default('user')
    .openapi({ description: 'Assigned role. Defaults to "user".' }),
});

// Auto-generate OpenAPI schema from Zod — single source of truth
```

---

### Changelog Documentation
Every API change should be documented in a human-readable changelog.

```markdown

### [2.1.0] — 2024-03-15
### Added
- `GET /users` now supports filtering by `createdAfter` and `createdBefore` query params
- `POST /users/bulk` endpoint for creating up to 50 users in a single request
- `X-Request-ID` header echoed in all responses for request tracing

### Changed
- `GET /users/:id` response now includes `lastLoginAt` field
- Rate limit window increased from 1 minute to 5 minutes (limits unchanged)

### Deprecated
- `GET /users/:id/profile` — use `GET /users/:id` which now includes profile data
  Will be removed in v3.0.0

### Fixed
- `PATCH /users/:id` no longer requires `email` field when only updating `name`

### [2.0.0] — 2024-01-01
### Breaking Changes
- `name` field split into `firstName` and `lastName`
- `address` field changed from string to structured object `{ street, city, country }`
- `DELETE /users/:id` now returns 204 instead of 200

### Migration Guide
See: https://docs.myapp.com/api/migration/v1-to-v2
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

When the API is defined in code, generate docs from annotations.

```typescript
/**
 * Create a new user account.
 *
 * @route   POST /users
 * @access  Public
 *
 * @example Request body
 * ```json
 * {
 *   "name": "Alice Smith",
 *   "email": "alice@example.com",
 *   "password": "securePassword123"
 * }
 * ```
 *
 * @example Success response (201)
 * ```json
 * {
 *   "data": {
 *     "id": "550e8400-e29b-41d4-a716-446655440000",
 *     "name": "Alice Smith",
 *     "email": "alice@example.com",
 *     "createdAt": "2024-01-15T09:00:00Z"
 *   }
 * }
 * ```
 *
 * @throws {409} If email is already registered
 * @throws {422} If request body fails validation
 */
router.post('/users', validate(CreateUserSchema), userController.create);
```

---

- [ ] Every endpoint has: description, all parameters, all possible responses
- [ ] All error codes documented with example response body
- [ ] Authentication requirements explicitly stated per endpoint
- [ ] Request/response examples are real (not placeholder data)
- [ ] Breaking changes documented with migration guide
- [ ] Changelog maintained with semantic versioning
- [ ] Interactive sandbox available (Swagger UI, Redoc, or Postman collection)
- [ ] Rate limits, pagination behavior, and auth flow documented separately in guides
