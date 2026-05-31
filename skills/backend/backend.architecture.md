<!-- @keywords: backend, architecture, layered, service, repository, clean architecture, separation of concerns -->

# Backend — Architecture and Layer Design

## Core Principle: Separation of Concerns

Every backend system eventually faces the same failure: business logic bleeds into the wrong layer. Controllers start making database calls. Services start formatting HTTP responses. The codebase becomes impossible to test or change without side effects.

The solution is explicit, enforced layer boundaries.

---

## Layered Architecture

```
HTTP Layer (Controllers/Routes)
    ↓  ← only knows about HTTP: req, res, status codes
Service Layer (Business Logic)
    ↓  ← only knows about domain objects and operations
Repository Layer (Data Access)
    ↓  ← only knows about database queries
Database
```

### Controller Layer — HTTP Only
```typescript
// Controller responsibility: parse input, call service, return response
// No business logic, no database calls

class UserController {
  constructor(private readonly userService: UserService) {}

  async createUser(req: Request, res: Response): Promise<void> {
    const dto = CreateUserDto.parse(req.body); // validate at boundary
    const user = await this.userService.createUser(dto);
    res.status(201).json(user);
  }

  async getUser(req: Request, res: Response): Promise<void> {
    const user = await this.userService.getUserById(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  }
}
```

**Rule:** Controllers should be so thin that testing them directly provides almost no value. All logic lives in services.

### Service Layer — Business Logic
```typescript
// Service responsibility: orchestrate business operations
// No HTTP concepts, no raw SQL

class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly emailService: EmailService,
    private readonly eventBus: EventBus,
  ) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) throw new ConflictError('Email already registered');

    const hashedPassword = await hashPassword(dto.password);
    const user = await this.userRepo.create({ ...dto, password: hashedPassword });

    await this.emailService.sendWelcome(user.email);
    this.eventBus.emit('user.created', { userId: user.id });

    return user;
  }
}
```

### Repository Layer — Data Access
```typescript
// Repository responsibility: abstract database operations
// No business rules, no HTTP — just queries

class UserRepository {
  constructor(private readonly db: Database) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.db.query<User>('SELECT * FROM users WHERE email = $1', [email]);
  }

  async create(data: CreateUserData): Promise<User> {
    return this.db.queryOne<User>(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING *',
      [data.email, data.password, data.name]
    );
  }
}
```

---

## Dependency Injection

Layers depend on abstractions, not implementations. This enables testing and swapping implementations.

```typescript
// Interface — the contract
interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
}

// Real implementation
class PostgresUserRepository implements IUserRepository {
  async findByEmail(email: string) { /* real DB query */ }
}

// Test implementation
class InMemoryUserRepository implements IUserRepository {
  private users = new Map<string, User>();
  async findByEmail(email: string) {
    return [...this.users.values()].find(u => u.email === email) ?? null;
  }
}

// Service depends on interface, not implementation
class UserService {
  constructor(private readonly userRepo: IUserRepository) {}
  // Works with both Postgres and InMemory implementations
}
```

---

## Error Handling Strategy

Define a domain error hierarchy. Catch at the boundary (controller), handle in the middle (service), throw from the bottom (repository).

```typescript
// Domain errors — typed and meaningful
class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) { super(message); }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

class ValidationError extends AppError {
  constructor(message: string, public readonly fields: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', 422);
  }
}

// Global error handler — single place to handle all errors
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message }
    });
  }
  
  // Unknown errors — don't leak details to client
  logger.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
};
```

---

## Module Structure

```
src/
  modules/
    users/
      users.controller.ts
      users.service.ts
      users.repository.ts
      users.dto.ts
      users.types.ts
      users.module.ts     ← wires everything together
    orders/
      orders.controller.ts
      ...
  shared/
    middleware/
    errors/
    database/
    events/
  app.ts
  main.ts
```

**Co-location rule:** Keep everything related to a feature in one module. Cross-cutting concerns (auth middleware, logging, DB connection) go in `shared/`.

---

## Async Patterns

```typescript
// Always handle Promise rejections
// Wrong: fire-and-forget without catch
emailService.sendWelcome(user.email); // if this throws, it's an unhandled rejection

// Correct: await or explicit error handling
await emailService.sendWelcome(user.email);
// or if non-critical:
emailService.sendWelcome(user.email).catch(err => logger.warn('Email failed', err));

// Parallel independent operations
const [user, permissions, settings] = await Promise.all([
  userRepo.findById(id),
  permissionRepo.findByUser(id),
  settingsRepo.findByUser(id),
]);
```

---

## Checklist

- [ ] Controllers contain zero business logic
- [ ] Services have no direct database calls
- [ ] Repositories return domain objects, not raw DB rows
- [ ] All layers depend on interfaces, not concrete classes
- [ ] Error hierarchy defined and used consistently
- [ ] No unhandled Promise rejections
- [ ] Input validated at system boundary (controller/DTO), not inside services
