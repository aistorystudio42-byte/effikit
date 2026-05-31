<!-- @keywords: validation, zod, dto, input sanitization, schema, request validation, type guard -->

# Backend — Input Validation and Data Integrity

## Why Validation at the Boundary Matters

Every piece of data that enters your system from the outside is untrusted. A well-typed TypeScript codebase still accepts garbage at runtime if the boundary isn't guarded. Validation at the entry point (HTTP request, message queue consumer, file upload) prevents corrupt data from ever reaching business logic.

Validate once, at the boundary. Inside the system, trust the types.

---

## Schema Validation with Zod

Zod provides runtime validation that produces TypeScript types — no duplication between type definition and validation logic.

```typescript
import { z } from 'zod';

// Define once, get runtime validation + TypeScript type
const CreateUserSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
  role: z.enum(['user', 'admin']).default('user'),
  birthDate: z.string().date().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type CreateUserDto = z.infer<typeof CreateUserSchema>;
// TypeScript type auto-derived — no manual interface needed

// Parsing — throws ZodError with detailed field errors
const dto = CreateUserSchema.parse(req.body);

// Safe parsing — returns { success, data } or { success: false, error }
const result = CreateUserSchema.safeParse(req.body);
if (!result.success) {
  return res.status(422).json({
    error: 'Validation failed',
    fields: result.error.flatten().fieldErrors,
  });
}
const dto = result.data; // Fully typed, validated
```

---

## Validation Middleware

Centralizing validation in middleware keeps controllers clean.

```typescript
import { AnyZodObject, ZodError } from 'zod';

// Generic validation middleware factory
const validate = (schema: AnyZodObject, target: 'body' | 'query' | 'params' = 'body') =>
  async (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    
    if (!result.success) {
      return res.status(422).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
    }

    // Replace raw input with validated/transformed data
    req[target] = result.data;
    next();
  };

// Route definition — validation is declarative
router.post(
  '/users',
  validate(CreateUserSchema),
  authenticate,
  userController.create
);

router.get(
  '/users',
  validate(GetUsersQuerySchema, 'query'),
  userController.list
);
```

---

## Common Validation Schemas

```typescript
// Pagination
const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// UUID parameter
const IdParamSchema = z.object({
  id: z.string().uuid(),
});

// Date range
const DateRangeSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
}).refine(data => new Date(data.from) <= new Date(data.to), {
  message: 'from must be before to',
  path: ['from'],
});

// Nested object with conditional validation
const CreateOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(999),
  })).min(1).max(50),
  
  deliveryType: z.enum(['standard', 'express', 'pickup']),
  
  shippingAddress: z.object({
    street: z.string().min(5),
    city: z.string().min(2),
    postalCode: z.string().regex(/^\d{5}(-\d{4})?$/),
    country: z.string().length(2), // ISO 3166-1 alpha-2
  }).optional(),
}).refine(
  (data) => data.deliveryType === 'pickup' || !!data.shippingAddress,
  { message: 'shippingAddress is required for non-pickup orders', path: ['shippingAddress'] }
);
```

---

## Sanitization

Validation checks format; sanitization removes dangerous content.

```typescript
import DOMPurify from 'isomorphic-dompurify';
import { escape } from 'html-escaper';

// For user-generated content that will be rendered as HTML
const sanitizeHtml = (input: string): string =>
  DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
  });

// For plain text displayed in HTML context
const escapeHtml = (input: string): string => escape(input);

// For SQL — use parameterized queries, never string concat
// Wrong:
const query = `SELECT * FROM users WHERE name = '${name}'`; // SQL injection!

// Correct:
const query = 'SELECT * FROM users WHERE name = $1';
await db.query(query, [name]); // Driver handles escaping

// For file paths — prevent directory traversal
import path from 'path';

const safeFilePath = (userInput: string, baseDir: string): string => {
  const resolved = path.resolve(baseDir, userInput);
  if (!resolved.startsWith(baseDir)) {
    throw new ValidationError('Invalid file path');
  }
  return resolved;
};
```

---

## Business Rule Validation

Schema validation handles format; business rules validate domain logic.

```typescript
class OrderValidator {
  async validate(dto: CreateOrderDto): Promise<ValidationResult> {
    const errors: string[] = [];

    // Stock check
    for (const item of dto.items) {
      const product = await this.productRepo.findById(item.productId);
      if (!product) errors.push(`Product ${item.productId} not found`);
      else if (product.stock < item.quantity) {
        errors.push(`Insufficient stock for ${product.name}: requested ${item.quantity}, available ${product.stock}`);
      }
    }

    // User order limit
    const todayOrderCount = await this.orderRepo.countTodayByUser(dto.userId);
    if (todayOrderCount >= 10) errors.push('Daily order limit reached');

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
```

---

## Validation Error Response Format

Consistent error format enables frontend to handle errors generically.

```typescript
// Standard validation error response
interface ValidationErrorResponse {
  error: 'VALIDATION_ERROR';
  message: string;
  fields: {
    [fieldName: string]: string[]; // multiple messages per field
  };
}

// Example response body
{
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "fields": {
    "email": ["Invalid email format"],
    "password": ["Password must be at least 8 characters", "Password must contain a number"],
    "items": ["At least one item is required"]
  }
}
```

---

## Checklist

- [ ] All external inputs validated with a schema (HTTP body, query, params)
- [ ] TypeScript types derived from schemas (not duplicated)
- [ ] User-generated HTML sanitized before storage and rendering
- [ ] All SQL uses parameterized queries (zero string concatenation)
- [ ] File paths validated against allowed base directory
- [ ] Validation error responses are consistent and field-level
- [ ] Business rule validation separated from schema validation
