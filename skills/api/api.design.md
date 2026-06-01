<!-- @keywords: api, REST, endpoint design, HTTP methods, status codes, resource naming, URL structure -->

# API — RESTful Design Principles

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to design.

## Principles

### Resource-Oriented Design
REST is about resources, not actions. The URL identifies the resource; the HTTP method describes the action.

```
Wrong (action-oriented):
  POST /createUser
  GET  /getUserById?id=123
  POST /deleteUser
  POST /updateUserEmail

Correct (resource-oriented):
  POST   /users              → create user
  GET    /users/123          → get user
  DELETE /users/123          → delete user
  PATCH  /users/123          → partial update user
```

---

### URL Structure
### Hierarchy Reflects Relationships
```
/users                        → all users
/users/123                    → specific user
/users/123/orders             → orders belonging to user 123
/users/123/orders/456         → specific order of user 123
/users/123/orders/456/items   → items in that order

Rule: Maximum 3 levels deep. Deeper = design smell.
/users/123/orders/456/items/789/reviews → too deep
Better: /reviews/789?orderId=456
```

### Query Parameters — Filtering, Sorting, Pagination
```
Filtering:    GET /products?category=electronics&minPrice=100
Sorting:      GET /products?sortBy=price&sortOrder=asc
Pagination:   GET /products?page=2&limit=20
Search:       GET /products?q=laptop
Date range:   GET /orders?from=2024-01-01&to=2024-03-31
```

### Avoid These URL Anti-Patterns
```
/getUsers        → verb in URL (use HTTP method)
/users/get-all   → verb in URL
/user            → singular for collections (use /users)
/Users           → inconsistent casing (always lowercase)
/users_list      → underscores (use hyphens or nothing)
/api/v1/users/123/get-profile → double verb
```

---

### HTTP Methods
| Method | Use Case | Body | Idempotent | Safe |
|--------|----------|------|------------|------|
| GET | Read | No | Yes | Yes |
| POST | Create | Yes | No | No |
| PUT | Full replace | Yes | Yes | No |
| PATCH | Partial update | Yes | No | No |
| DELETE | Remove | Optional | Yes | No |

### PUT vs PATCH
```typescript
// PUT — full replacement, client sends entire resource
// Missing fields get reset to default
PUT /users/123
{ "name": "Alice", "email": "alice@example.com", "role": "admin" }
// If role is omitted, it resets to default

// PATCH — partial update, only send what changes
PATCH /users/123
{ "name": "Alice Updated" }
// Other fields remain untouched

// PATCH with JSON Patch standard (RFC 6902)
PATCH /users/123
[
  { "op": "replace", "path": "/name", "value": "Alice Updated" },
  { "op": "add", "path": "/tags/0", "value": "premium" }
]
```

---

### Response Format
Consistent response structure across all endpoints.

```typescript
// Success responses
{
  "data": { ... },           // single resource
  "meta": { ... }            // optional metadata
}

// Collection responses
{
  "data": [ ... ],
  "meta": {
    "total": 150,
    "page": 2,
    "limit": 20,
    "hasNext": true,
    "hasPrev": true
  }
}

// Error responses
{
  "error": {
    "code": "VALIDATION_ERROR",   // machine-readable
    "message": "...",             // human-readable
    "details": { ... }            // optional field-level errors
  }
}
```

### Envelope vs Direct
```typescript
// Envelope (wraps in data key) — consistent, extensible
GET /users/123 → { "data": { "id": "123", "name": "Alice" } }

// Direct — simpler but hard to add metadata later
GET /users/123 → { "id": "123", "name": "Alice" }

// Recommendation: Use envelope. Adding metadata later is a breaking change.
```

---

### Headers
```typescript
// Always include
Content-Type: application/json
Accept: application/json

// Auth
Authorization: Bearer <token>

// Caching
Cache-Control: public, max-age=300
ETag: "abc123"
Last-Modified: Thu, 01 Jan 2024 00:00:00 GMT

// Rate limiting
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1704067200

// CORS
Access-Control-Allow-Origin: https://yourdomain.com
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
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

Use the right code — don't return `200 OK` with `{ "error": "not found" }` in the body.

```
2xx Success
  200 OK              → GET, PUT, PATCH success
  201 Created         → POST success (include Location header)
  204 No Content      → DELETE success, no response body
  202 Accepted        → Async operation started (job queued)

3xx Redirection
  301 Moved Permanently → Resource URL changed
  304 Not Modified      → Cached response still valid (ETag/If-None-Match)

4xx Client Errors
  400 Bad Request     → Malformed syntax, invalid JSON
  401 Unauthorized    → Not authenticated (missing/invalid token)
  403 Forbidden       → Authenticated but not authorized
  404 Not Found       → Resource doesn't exist
  409 Conflict        → State conflict (duplicate email, optimistic lock)
  422 Unprocessable   → Valid syntax but failed validation
  429 Too Many Requests → Rate limit exceeded

5xx Server Errors
  500 Internal Server Error → Unexpected server error
  503 Service Unavailable   → Maintenance, overloaded
```

### Common Status Code Mistakes
```
201 → Location header must be included
  Location: /users/123

401 vs 403:
  401 = "I don't know who you are" (not logged in)
  403 = "I know who you are but you can't do this" (no permission)

404 vs 403:
  Sometimes returning 404 for unauthorized resources is intentional
  (don't reveal existence of private resources)
```

---

- [ ] URLs are nouns, not verbs
- [ ] Collections are plural (`/users`, not `/user`)
- [ ] HTTP methods match the semantics of the operation
- [ ] Status codes are semantically correct (not just 200/400/500)
- [ ] Response format is consistent across all endpoints
- [ ] Error responses include machine-readable code + human-readable message
- [ ] Pagination is implemented for all collection endpoints
- [ ] No sensitive data in URL (tokens, passwords)
