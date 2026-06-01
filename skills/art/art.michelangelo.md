<!-- @keywords: art, Michelangelo, sculpture, essence, simplicity, remove the unnecessary, minimalism -->

# Art — Michelangelo Mode: Removing the Unnecessary

## Core Philosophy

## When to Activate

Michelangelo knew what to keep. He never removed a detail that served the composition.

```
Don't remove:
  - Error handling (it's marble, until it's the only thing protecting you)
  - Test coverage (it's marble, until a regression proves it isn't)
  - Accessibility (it looks like marble until 15% of your users can't use your product)
  - Security validation (definitely looks like marble until it isn't)
  - Documentation for non-obvious decisions (invisible marble — you'll need it in 6 months)
```

---

## Principles

### The Michelangelo Mindset
Michelangelo said the statue already existed inside the marble — he just removed everything that wasn't the statue. This is not a metaphor for laziness. It required extraordinary skill to know what to remove, and extraordinary discipline to stop before removing what was essential.

Michelangelo Mode: the work is done not when there's nothing left to add, but when there's nothing left to remove.

---

### The Removal Framework
```
Before removing anything, identify:
  What is the absolute minimum this must do?
  What would break if this element were removed?
  What would users miss if this feature disappeared?

After identifying the minimum:
  Remove everything else.
  Add back only what is genuinely missed.
```

---

### Applied to Feature Scope
```
Initial feature request: "Improve the user profile page"

Michelangelo inventory (what does the profile page HAVE to do?):
  ✓ Show the user who they are (name, avatar)
  ✓ Allow changing account settings (email, password)
  ✓ Show what they've done (order history, saved items)

Everything else is potentially marble to remove:
  ? Achievement badges (nice to have, no user asked)
  ? Activity feed (internal vanity, not user-requested)
  ? Profile completion meter (dark pattern, creates anxiety)
  ? Social sharing of profile (zero usage in analytics)
  ? Cover photo (copied from social media, irrelevant here)

Result: a profile page with 60% less content that does 100% of what users need.
```

---

### Applied to UI
```tsx
// Before: every stakeholder added their requirement
const ProductCard = ({ product }: { product: Product }) => (
  <div className="card">
    <div className="badge">{product.isNew ? 'NEW' : ''}</div>
    <div className="badge">{product.isSale ? 'SALE' : ''}</div>
    <div className="badge">{product.isFeatured ? 'FEATURED' : ''}</div>
    <img src={product.image} alt={product.name} />
    <div className="tags">{product.tags.map(t => <span key={t}>{t}</span>)}</div>
    <h3>{product.name}</h3>
    <p className="description">{product.description}</p>
    <div className="ratings">★★★★☆ ({product.reviewCount})</div>
    <div className="sku">SKU: {product.sku}</div>
    <div className="stock">In stock: {product.stockCount} units</div>
    <div className="price">
      <span className="original">${product.originalPrice}</span>
      <span className="current">${product.price}</span>
    </div>
    <button>Add to cart</button>
    <button>Save for later</button>
    <button>Quick view</button>
    <button>Compare</button>
    <button>Share</button>
  </div>
);

// After Michelangelo: reveal the statue
const ProductCard = ({ product }: { product: Product }) => (
  <div className="card">
    <img src={product.image} alt={product.name} />
    <h3>{product.name}</h3>
    <div className="price">${product.price}</div>
    <button>Add to cart</button>
  </div>
);
// User analytics show: 95% of clicks were on "Add to cart"
// The other 4 buttons had a combined 5% usage
// Removing them increased cart conversion by 18%
```

---

### The Minimum Viable API
```typescript
// API design: Michelangelo asks "what must exist?"

// Bloated API (everything requested in sprint planning):
interface UserAPI {
  getUser(id: string): Promise<User>;
  getUserFull(id: string): Promise<UserFull>;
  getUserSummary(id: string): Promise<UserSummary>;
  getUserWithOrders(id: string): Promise<UserWithOrders>;
  getUserWithPermissions(id: string): Promise<UserWithPermissions>;
  getUserStats(id: string): Promise<UserStats>;
  getUserActivity(id: string, from: Date, to: Date): Promise<Activity[]>;
}

// Michelangelo API: what do callers actually need?
interface UserAPI {
  getById(id: string): Promise<User>;        // callers specify what fields they need via projection
  list(filters: UserFilters): Promise<User[]>;
  create(data: CreateUserDto): Promise<User>;
  update(id: string, data: UpdateUserDto): Promise<User>;
  delete(id: string): Promise<void>;
}
// Six endpoints became five. Three "get" variants became one.
// Callers get what they need via sparse fieldsets or include params.
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

```typescript
// Before Michelangelo: full of marble
class UserService {
  private logger: Logger;
  private cache: CacheService;
  private eventBus: EventBus;
  private analyticsService: AnalyticsService;
  private notificationService: NotificationService;
  private auditService: AuditService;

  async getUser(id: string): Promise<User> {
    this.logger.debug('Getting user', { id });
    this.analyticsService.track('user.fetched', { id }); // tracking a read?
    const cached = await this.cache.get(`user:${id}`);
    if (cached) {
      this.logger.debug('Cache hit', { id });
      return cached;
    }
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundError('User');
    await this.cache.set(`user:${id}`, user, 300);
    this.auditService.log('user.read', { userId: id }); // audit on every read?
    return user;
  }
}

// After Michelangelo: the statue revealed
class UserService {
  async getUser(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundError('User');
    return user;
  }
}
// Caching: add when you have a performance problem
// Audit logging: add for writes, not reads
// Analytics: let the API layer track requests
// The function now says exactly what it does and nothing else
```

---

- [ ] Feature scope: what is the absolute minimum it must do?
- [ ] Every element in the UI: would users notice if this disappeared?
- [ ] Every function: does it do exactly one thing and nothing else?
- [ ] Every dependency: is it used, or added "just in case"?
- [ ] Every API endpoint: does it exist because callers need it, or because we thought they might?
- [ ] After removing: tested that nothing genuinely needed was removed
