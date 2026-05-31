<!-- @keywords: science, Feynman, explanation, teaching, simplicity, understanding, mental models -->

# Science — Feynman Mode: Teaching as Understanding

## The Feynman Mindset

Richard Feynman had a rule: if you can't explain something simply, you don't understand it yet. He was famous for being able to explain quantum mechanics to a non-physicist in a way they could follow. But this wasn't a communication trick — it was a diagnostic tool. If he couldn't find simple words for a concept, he went back to study it more.

Feynman Mode: explain everything as if teaching it to a curious 12-year-old. If you can't, you don't understand it well enough to build it.

---

## The Feynman Technique

```
Step 1: Write down the concept you're trying to understand
  "Explain: how does our authentication system work?"

Step 2: Write an explanation as if teaching a curious beginner
  No jargon. No "it's basically just..." shortcuts.
  Use concrete analogies. Use specific examples.

Step 3: Identify where you get stuck or vague
  Where do you write "kind of" or "basically"?
  Where do you draw an arrow and write "→ magic happens here"?
  Where do you skip over a step?

Step 4: Go back and fill the gaps
  The gaps are where you don't actually understand.
  The gaps are also where bugs hide.
```

---

## Applied to Code Review

```typescript
// Feynman code review: can I explain this code simply?

// Code being reviewed:
const result = await Promise.all(
  items
    .filter(item => !processedIds.has(item.id))
    .map(async item => {
      const enriched = await enrich(item);
      processedIds.add(item.id);
      return enriched;
    })
);

// Feynman explanation attempt:
// "We take the items that haven't been processed yet,
//  enrich them all in parallel, and track which ones we've done."

// Where I get stuck: "enriched in parallel" is fine.
// But wait — we're modifying processedIds INSIDE the async map.
// If two items with the same ID are in the list, both pass the filter
// before either has been processed. Then both add to processedIds.
// Is this intentional? Is it safe?

// The explanation revealed an unclear race condition.
// Feynman: "If you can't explain why it's safe, it might not be."
```

---

## Applied to Architecture Decisions

```
Feynman explanation of a microservices proposal:

Bad explanation (can't be simplified):
  "We're implementing a distributed event-driven CQRS architecture with 
   hexagonal ports-and-adapters using eventual consistency and Saga patterns
   for distributed transactions."

This should trigger a Feynman alarm:
  Can you explain this to a new junior developer in 2 minutes?
  If not, is the complexity justified? Or is it complexity for its own sake?

Good explanation (Feynman-approved):
  "The checkout and inventory systems need to work independently.
   When an order is placed, the checkout service records the order and
   tells the inventory service via a message. The inventory service
   reserves the stock separately. If the stock reservation fails,
   the order is cancelled via a second message.
   This way, if inventory is slow, checkout isn't."

Now the architecture is understandable. And now you can ask:
  "Is this complexity worth it? What's the simpler alternative?"
```

---

## The Rubber Duck Protocol

```
Feynman's method for debugging: explain the problem out loud.
The act of forming sentences forces coherent thinking.

Standard rubber duck debugging:
  1. Describe what the code is supposed to do (be specific)
  2. Describe what it actually does (what you observe)
  3. Describe each line to the duck as you step through it
  4. The explanation usually reveals the bug before the duck responds

Extended Feynman duck:
  1. Explain the system architecture as simply as possible
  2. Explain the flow a user request takes through the system
  3. Explain where the bug "should" be based on symptoms
  4. Explain why your first fix attempt didn't work
  5. Explain what assumption must be wrong for the bug to exist

The point where your explanation becomes vague or uses "somehow" 
is exactly where the bug is hiding.
```

---

## Simplicity as Diagnostic

```typescript
// Feynman principle: if the code is hard to explain, it needs to be simplified

// Hard to explain:
const processedData = rawData
  .reduce((acc, item) => ({
    ...acc,
    [item.category]: [
      ...(acc[item.category] || []),
      { ...item, processed: true, value: item.raw * (item.multiplier ?? 1) }
    ]
  }), {} as Record<string, ProcessedItem[]>);

// Feynman explanation attempt: "We're... grouping items by category, and for each
// item we're spreading it and adding processed=true and computing value..."
// This took 30 seconds to explain. That's a signal.

// Simplified (explains itself):
const grouped = groupBy(rawData, 'category');
const processed = mapValues(grouped, items =>
  items.map(item => ({
    ...item,
    processed: true,
    value: item.raw * (item.multiplier ?? 1),
  }))
);
// Explanation: "Group items by category, then process each item in each group."
// 5 seconds. That's the Feynman signal of clarity.
```

---

## Teaching as Learning

```
Before a technical interview or design review, explain your system to someone else.
Not to show off — to find the gaps.

If they ask a question you can't answer simply:
  → You've found a design gap
  → You've found a documentation gap
  → You've found something you assumed without verifying

"The person who teaches learns the most."
— Applied to software: write documentation before you need it.
  The act of writing forces the clarity that builds better systems.
```

---

## Feynman Checklist

- [ ] Can explain this system to a non-technical person in < 2 minutes?
- [ ] All code readable without comments (if not, simplify the code)
- [ ] Technical proposal explained without jargon in first paragraph
- [ ] Rubber duck session done before asking for help
- [ ] Every "somehow" and "basically" in an explanation investigated
- [ ] Documentation written during development, not after
