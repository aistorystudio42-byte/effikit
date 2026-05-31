<!-- @keywords: API documentation, OpenAPI, changelog, endpoint docs, request response examples -->

# Documentation — API Documentation Standards

## API Docs as a Product

API documentation is a product used by developers integrating with your system. Incomplete or inaccurate docs create support tickets and erode trust. Every endpoint should be documented as if the reader has never seen your codebase.

---

## OpenAPI First vs Code First

```
Code-first: write code, generate docs from annotations
  + Documentation always in sync with code
  + Less duplication
  - Docs quality depends on annotation discipline
  - Less control over final doc structure

OpenAPI-first: write spec, generate code stubs
  + Forces API design thinking before implementation
  + Contract can be shared with frontend before backend is built
  - Additional file to maintain
  - Can drift from implementation if not enforced

Recommended for most teams: Code-first with strict annotation requirements.
Use zod-to-openapi or tsoa to generate spec from TypeScript.
```

---

## Endpoint Documentation Anatomy

Every endpoint must document:

```typescript
/**
 * @openapi
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     description: |
 *       Creates an order from the specified cart items.
 *       Validates stock availability before confirming.
 *       Triggers payment initiation and sends confirmation email.
 *
 *       **Rate limit:** 10 requests per minute per user.
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequest'
 *           examples:
 *             standard:
 *               summary: Standard order with coupon
 *               value:
 *                 items:
 *                   - productId: "prod_abc123"
 *                     quantity: 2
 *                 couponCode: "SAVE10"
 *                 shippingAddressId: "addr_xyz789"
 *     responses:
 *       '201':
 *         description: Order created successfully
 *         headers:
 *           Location:
 *             description: URL of the created order
 *             schema: { type: string, example: "/api/orders/ord_123" }
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       '400':
 *         description: Invalid request (malformed JSON, wrong types)
 *       '401':
 *         description: Not authenticated
 *       '409':
 *         description: Insufficient stock for one or more items
 *         content:
 *           application/json:
 *             example:
 *               error:
 *                 code: INSUFFICIENT_STOCK
 *                 message: "Product 'Widget Pro' has only 3 units in stock"
 *                 details:
 *                   productId: "prod_abc123"
 *                   requested: 5
 *                   available: 3
 *       '422':
 *         description: Validation error
 *       '429':
 *         description: Rate limit exceeded
 */
router.post('/orders', authenticate, validate(CreateOrderSchema), orderController.create);
```

---

## Error Code Documentation

```typescript
// Document ALL possible error codes — not just HTTP status
// Developers need to handle specific error cases programmatically

/**
 * @openapi
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       required: [error]
 *       properties:
 *         error:
 *           type: object
 *           required: [code, message]
 *           properties:
 *             code:
 *               type: string
 *               description: Machine-readable error identifier
 *               enum:
 *                 - VALIDATION_ERROR
 *                 - UNAUTHORIZED
 *                 - FORBIDDEN
 *                 - NOT_FOUND
 *                 - CONFLICT
 *                 - INSUFFICIENT_STOCK
 *                 - PAYMENT_FAILED
 *                 - RATE_LIMIT_EXCEEDED
 *                 - INTERNAL_ERROR
 *             message:
 *               type: string
 *               description: Human-readable error description
 *             details:
 *               type: object
 *               description: Additional error context (varies by error code)
 */
```

---

## Authentication Documentation

```markdown
## Authentication

All endpoints except `/auth/*` require a Bearer token.

### Getting a Token

```
POST /api/auth/login
{
  "email": "alice@example.com",
  "password": "your-password"
}
```

Response:
```json
{
  "data": {
    "accessToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

The `refreshToken` is set as an HttpOnly cookie automatically.

### Using the Token

Include in the `Authorization` header:
```
Authorization: Bearer eyJhbGc...
```

### Token Refresh

Access tokens expire after 15 minutes. Use the refresh endpoint:
```
POST /api/auth/refresh
```
(No body needed — uses the HttpOnly cookie automatically)

### Token Revocation (Logout)

```
POST /api/auth/logout
```
This invalidates the refresh token. Discard the access token client-side.
```

---

## Changelog Format

```markdown
# API Changelog

## [2.3.0] — 2024-03-15

### Added
- `GET /api/orders` now supports filtering by `status` query parameter
  - Valid values: `pending`, `processing`, `completed`, `cancelled`
  - Example: `GET /api/orders?status=pending&page=1`
- `POST /api/orders/bulk` endpoint for creating multiple orders in one request
  - Maximum 10 orders per request
  - All-or-nothing: if any item fails validation, no orders are created

### Changed
- `GET /api/products` response now includes `reviewCount` field
- Rate limit for `POST /api/auth/login` changed from 10/min to 5/min

### Deprecated
- `GET /api/users/:id/profile` — use `GET /api/users/:id` instead.
  The profile data is now included in the user response.
  **Removal date: 2024-09-15**

### Fixed
- `PATCH /api/users/:id` no longer requires `email` when updating only `name`

---

## [2.2.0] — 2024-02-01

### Breaking Changes
- `address` field in order responses changed from string to structured object
  - Old: `"address": "123 Main St, New York, NY 10001"`
  - New: `"address": { "street": "123 Main St", "city": "New York", "state": "NY", "zip": "10001" }`
  - Migration: update clients to read `address.street` instead of splitting the string

### Migration Guide
See [v2.2 Migration Guide](docs/migration/v2.2.md) for detailed migration steps.
```

---

## Documentation Checklist

- [ ] Every endpoint has: summary, full description, all parameters, all responses
- [ ] Request body schema includes all fields with types, constraints, and examples
- [ ] All error responses documented with specific error codes (not just 4xx generic)
- [ ] Authentication requirements explicit per endpoint
- [ ] Rate limits documented
- [ ] Examples are realistic (not placeholder data)
- [ ] Changelog maintained with breaking vs non-breaking distinction
- [ ] Breaking changes include migration guide and removal date
- [ ] Interactive docs available (Swagger UI, Redoc, or Postman collection)
