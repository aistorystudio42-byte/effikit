<!-- @keywords: api versioning, breaking changes, backward compatibility, deprecation, migration -->

# API — Versioning and Breaking Changes

## Core Philosophy

## When to Activate

Not every change requires a version bump. Understand what constitutes a breaking change first.

### Non-Breaking Changes (No Version Needed)
```
✓ Adding new optional fields to responses
✓ Adding new optional query parameters
✓ Adding new endpoints
✓ Adding new values to enums (if client uses allowlist pattern)
✓ Relaxing validation rules (accepting more formats)
✓ Performance improvements
✓ Bug fixes that don't change contract
```

### Breaking Changes (Require New Version)
```
✗ Removing fields from responses
✗ Renaming fields
✗ Changing field types (string → number)
✗ Changing URL structure
✗ Changing authentication mechanism
✗ Making optional fields required
✗ Changing error response format
✗ Removing endpoints
✗ Changing semantic meaning of a status code
```

---

## Principles

### Versioning Strategies
### Strategy 1: URL Path Versioning (Recommended)
```
/api/v1/users
/api/v2/users

Advantages:
- Explicit and visible
- Easy to route at proxy/load balancer level
- Curl-friendly, easy to test
- Clear in browser history and logs

Disadvantages:
- URL is "polluted" with infrastructure concern
- Resources at different versions are technically different URLs
```

### Strategy 2: Header Versioning
```
GET /api/users
API-Version: 2

Advantages:
- Clean URLs
- Same URL, different version

Disadvantages:
- Not visible in browser bar or logs
- Harder to test with simple curl
- Caching complications
```

### Strategy 3: Content Negotiation
```
GET /api/users
Accept: application/vnd.myapi.v2+json

Disadvantages:
- Verbose
- Unusual for most consumers
- Proxy caching complications
```

**Recommendation:** URL path versioning for public APIs. Header versioning for internal APIs where URL cleanliness matters.

---

### Version Lifecycle Management
```typescript
// Version metadata — track version status
const API_VERSIONS = {
  v1: {
    status: 'deprecated',
    deprecatedAt: '2024-01-01',
    sunsetAt: '2024-07-01',    // when it will be removed
    successorVersion: 'v2',
  },
  v2: {
    status: 'stable',
    releasedAt: '2024-01-01',
  },
  v3: {
    status: 'beta',
    releasedAt: '2024-06-01',
  },
} as const;

// Deprecation middleware — inform clients via headers
const versionMiddleware = (version: string) =>
  (req: Request, res: Response, next: NextFunction) => {
    const versionInfo = API_VERSIONS[version as keyof typeof API_VERSIONS];
    
    if (versionInfo.status === 'deprecated') {
      res.setHeader('Deprecation', versionInfo.deprecatedAt);
      res.setHeader('Sunset', versionInfo.sunsetAt);
      res.setHeader('Link', `</api/${versionInfo.successorVersion}>; rel="successor-version"`);
    }
    
    next();
  };

// Route registration
app.use('/api/v1', versionMiddleware('v1'), v1Router);
app.use('/api/v2', versionMiddleware('v2'), v2Router);
```

---

### Version Migration Pattern
When introducing a breaking change, provide migration path.

```typescript
// v1 response
{
  "id": "123",
  "fullName": "Alice Smith",       // v2 will split this
  "address": "123 Main St, NYC"    // v2 will structure this
}

// v2 response
{
  "id": "123",
  "name": {                        // structured
    "first": "Alice",
    "last": "Smith"
  },
  "address": {
    "street": "123 Main St",
    "city": "NYC"
  }
}

// Transformer — maintain both versions from same data
class UserTransformer {
  toV1(user: UserEntity): UserV1Response {
    return {
      id: user.id,
      fullName: `${user.firstName} ${user.lastName}`,
      address: `${user.street}, ${user.city}`,
    };
  }

  toV2(user: UserEntity): UserV2Response {
    return {
      id: user.id,
      name: { first: user.firstName, last: user.lastName },
      address: { street: user.street, city: user.city },
    };
  }
}
```

---

### Deprecation Communication
```typescript
// OpenAPI deprecation annotation
paths:
  /api/v1/users:
    get:
      deprecated: true
      description: |
        **Deprecated.** Use `/api/v2/users` instead.
        This endpoint will be removed on 2024-07-01.

// Changelog entry format
const CHANGELOG = {
  'v2.0.0': {
    breaking: [
      'GET /users now returns name as object { first, last } instead of string fullName',
      'DELETE /users/:id now returns 204 instead of 200',
    ],
    added: [
      'GET /users supports filtering by role',
      'POST /users/bulk for batch creation',
    ],
    deprecated: [
      'v1 API — sunset date: 2024-07-01',
    ],
  },
};
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

- [ ] Breaking vs non-breaking changes classified before any API change
- [ ] URL path versioning used (or documented reason for alternative)
- [ ] Deprecated versions communicate sunset date via `Sunset` header
- [ ] Migration guide published before deprecation announcement
- [ ] At least 6 months notice given before removing a version
- [ ] Changelog maintained with categorized changes (breaking/added/deprecated)
- [ ] Version documentation linked from deprecated version responses
