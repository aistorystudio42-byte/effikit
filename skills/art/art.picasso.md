<!-- @keywords: art, Picasso, deconstruction, abstraction, perspective, reimagining, bold decisions -->

# Art — Picasso Mode: Deconstruction and Reimagining

## The Picasso Mindset

Picasso broke objects into geometric planes and showed multiple perspectives simultaneously in a single image. He didn't represent reality — he deconstructed it to reveal a deeper truth. Cubism asked: "What if we didn't have to follow the rules of perspective?"

Picasso Mode: identify the rules you've been following without questioning. Break them deliberately. Rebuild from first principles.

---

## Deconstruct Before You Design

Picasso studied classical technique for years before breaking from it. He broke rules he had mastered, not rules he didn't understand.

```
Applied to API design:

Classical (REST convention):
  GET  /api/users/:id
  POST /api/users
  PUT  /api/users/:id

Picasso question: "What if we showed ALL perspectives at once?"
  → GraphQL: ask for exactly what you need, from one endpoint
  → Tradeoff: complexity of the schema vs flexibility of queries

Picasso question: "What if the client controlled the shape of data?"
  → JSON:API specification: relationships, includes, sparse fieldsets
  → Tradeoff: standardization vs simplicity

Picasso question: "What if there were no endpoints at all?"
  → RPC style: call functions, not resources
  → tRPC: type-safe remote function calls, no HTTP verbs
  → Tradeoff: tight coupling vs developer ergonomics

None of these is "correct." Each is a different perspective on the same data.
Picasso Mode ensures you've considered them before defaulting to convention.
```

---

## Multiple Perspectives Simultaneously

Cubism showed the front AND side of a face at once. What do your users see from different angles?

```
Feature: notification system

Perspective 1: The power user
  → Too many notifications is spam
  → Needs granular control per notification type
  → Wants keyboard shortcuts to dismiss/act

Perspective 2: The casual user
  → Doesn't know what most notifications mean
  → Overwhelmed by options
  → Just wants "important stuff only"

Perspective 3: The mobile user
  → Interruptions at the wrong time are hostile
  → Push notifications compete with real-life context
  → Batching (daily digest) might be better than real-time

Perspective 4: The admin
  → Needs audit trail of what was sent to whom
  → Needs to see if users are ignoring all notifications
  → Needs to test notifications without annoying users

Picasso Mode design synthesizes all four perspectives in one system:
  - Smart defaults that work for casual users
  - Full control available for power users
  - Do-not-disturb / quiet hours for mobile
  - Admin view with delivery analytics
```

---

## Deliberate Rule-Breaking

```
Rule: "Forms should have a submit button"
Break it: real-time save (Notion, Figma) — no explicit submit needed
Result: removes the cognitive overhead of "have I saved?"
Question to ask: "What would be lost if we removed this?"

Rule: "Users need to register before using the product"
Break it: guest checkout, read-only trial, demo environment
Result: removes the commitment barrier for exploration
Question to ask: "Why do we actually need this?"

Rule: "Error messages should explain what went wrong"
Break it: make errors instructive rather than diagnostic
Original: "Error 422: email is invalid"
Picasso: "Looks like a typo — did you mean alice@gmail.com?"
Question to ask: "What would be more useful than correct?"

Rule: "The dashboard should show all the data"
Break it: show nothing until the user asks
Original: overwhelming dashboard with 20 metrics on load
Picasso: empty canvas, user composes their own view
Question to ask: "What if the default was empty, not full?"
```

---

## Abstraction Levels

Picasso's series on "The Bull" shows progressive abstraction — from a realistic bull to a simple line drawing. Each step removed detail while preserving essence.

```typescript
// Level 0: Raw implementation (the realistic painting)
function processCheckout(req: Request, res: Response) {
  const { items, userId, couponCode, paymentMethodId, shippingAddress } = req.body;
  if (!items || items.length === 0) return res.status(422).json({ error: 'No items' });
  const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const subtotal = items.reduce((sum: number, item: any) => sum + item.price * item.qty, 0);
  let discount = 0;
  if (couponCode) {
    const coupon = await db.query('SELECT * FROM coupons WHERE code = $1', [couponCode]);
    if (coupon && coupon.active) discount = coupon.type === 'pct' ? subtotal * coupon.val / 100 : coupon.val;
  }
  // ... 80 more lines
}

// Level 3: High abstraction (the line drawing — essence only)
async function processCheckout(req: Request, res: Response) {
  const dto = CheckoutSchema.parse(req.body);
  const order = await checkoutService.execute(dto);
  res.status(201).json({ data: order });
}
// Each level is correct. Choose the level that matches the context.
```

---

## The Ugly Phase Is Required

Every Picasso painting went through an unrecognizable ugly phase. He didn't skip it.

```
In software: the ugly phase is the first working version.
It's not a failure to ship something ugly internally.
It IS a failure to:
  a) Never move past the ugly phase
  b) Show the ugly phase to users
  c) Pretend the ugly phase didn't happen

The ugly phase serves to:
  - Validate that the approach is fundamentally sound
  - Reveal unexpected complexity before you're committed
  - Give something concrete to react to (abstractions are easier to argue about than code)
  - Build understanding of the domain before you simplify it
```

---

## Picasso Mode Checklist

- [ ] Existing conventions identified and explicitly questioned
- [ ] Multiple user perspectives mapped (at least 3)
- [ ] At least one "rule" deliberately broken and evaluated
- [ ] Abstraction level chosen deliberately (not just "whatever I wrote first")
- [ ] Ugly phase accepted and documented (what did we learn from the messy version?)
- [ ] Final design synthesizes insights from multiple perspectives
