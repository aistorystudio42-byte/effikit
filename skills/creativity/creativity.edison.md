<!-- @keywords: creativity, Edison, iteration, prototyping, experimentation, fail fast, invention -->

# Creativity — Edison Mode: Systematic Experimentation

## The Edison Mindset

Thomas Edison didn't "fail 10,000 times" finding the lightbulb — he ran 10,000 experiments. Each result was data, not failure. Edison Mode is the mindset of systematic, rapid experimentation where every dead end reveals something useful.

Apply this when: you're stuck on a problem with no clear solution, exploring unknown territory, or when the first obvious approach hasn't worked.

---

## The Experiment Framework

```
Define:
  What are you trying to prove or disprove?
  What is the cheapest way to test this hypothesis?
  How will you know if it worked?

Run:
  Build the smallest possible test
  Set a time limit (Edison had 24-hour experiment cycles)
  Record what you observe — not what you expected

Learn:
  What did this tell you?
  What does this rule out?
  What should the next experiment be?
```

---

## Applied to Software Problems

### Stuck on a Bug?

```typescript
// Edison approach: systematic hypothesis testing, not random changes

// Step 1: Form explicit hypothesis
// Hypothesis: "The race condition occurs because the cache is read before
//              the write transaction commits."

// Step 2: Design minimal test
// Add explicit delay after write, before cache read
await db.transaction(async (trx) => {
  await userRepo.update(id, data, trx);
  // Hypothesis test: if delay fixes it, the hypothesis is correct
  await sleep(100); // temporary diagnostic
});
const user = await cache.get(id);

// Step 3: Observe result
// If fixed → root cause confirmed → now design proper fix (invalidate cache in transaction)
// If not fixed → hypothesis wrong → form new hypothesis

// Step 4: Never leave diagnostic code in — remove after learning
```

### Exploring an Unknown API or Library

```typescript
// Instead of reading all documentation first:
// 1. Build a minimal playground
// 2. Try one capability at a time
// 3. Verify your understanding with an assertion

// Edison exploration of a new payment SDK
async function exploreStripeSDK() {
  // Experiment 1: Basic payment intent creation
  const intent = await stripe.paymentIntents.create({ amount: 1000, currency: 'usd' });
  console.assert(intent.status === 'requires_payment_method', 'Initial status');

  // Experiment 2: Confirm with test card
  const confirmed = await stripe.paymentIntents.confirm(intent.id, {
    payment_method: 'pm_card_visa',
  });
  console.assert(confirmed.status === 'succeeded', 'After confirm');

  // Experiment 3: What happens with declined card?
  try {
    await stripe.paymentIntents.confirm(intent.id, {
      payment_method: 'pm_card_chargeDeclined',
    });
  } catch (err) {
    console.log('Decline error type:', (err as any).type); // record the exact error shape
  }
}
```

---

## Ideation: Volume Before Quality

Edison's notebooks show hundreds of ideas per day — most were discarded. Volume precedes quality in creative problem-solving.

```
When designing a feature, generate 10 approaches before evaluating any:

Problem: "How do users discover relevant products?"

Idea 1: Search with filters
Idea 2: Curated collections by human editors
Idea 3: Collaborative filtering (users like you bought...)
Idea 4: Visual similarity (show similar-looking items)
Idea 5: Purchase history pattern matching
Idea 6: Trending items by category
Idea 7: Social proof (what friends bought)
Idea 8: Price-based recommendations
Idea 9: Restock notifications for previous items
Idea 10: Bundle recommendations (frequently bought together)

Now evaluate. Now combine. Now pick the best for your constraints.
Evaluating before generating kills 80% of good ideas before they're born.
```

---

## The Minimum Viable Experiment (MVE)

Before building a feature, test the core assumption with the least possible work.

```typescript
// Assumption: "Users will click a 'Save for later' button"

// Wrong approach: build full save-for-later system, then measure usage
// 5 days of engineering, then discover nobody uses it

// MVE: measure intent before building
// Day 1: Add a "Save for later" button that shows a toast:
//        "Coming soon! We'll let you know when this is ready."
// Measure click rate for 1 week

// If < 1% click rate → assumption was wrong → don't build it
// If > 10% click rate → assumption validated → now build it properly

const SaveButton = () => (
  <button onClick={() => {
    analytics.track('save_for_later_intent'); // measure intent
    toast.info("We're working on this! You'll be notified when it launches.");
  }}>
    Save for later
  </button>
);
```

---

## Edison Mode Applied: Problem-Solving Steps

```
1. State the problem precisely (what exactly isn't working?)
2. Generate 5+ possible causes (don't stop at the first one)
3. Rank by probability (most likely first)
4. Design a test for the most likely cause
5. Run the test — minimal, reversible
6. Record the result
7. Update your probability ranking
8. Repeat until cause identified
9. Fix the root cause, not the symptom
10. Add a test so this can't regress silently
```

---

## Edison Mode Checklist

- [ ] Problem stated precisely before experimenting
- [ ] Multiple hypotheses generated before testing any
- [ ] Each experiment tests exactly one variable
- [ ] Results recorded (not just observed)
- [ ] Diagnostic code removed after learning
- [ ] Root cause addressed (not just symptoms)
- [ ] New knowledge shared with team (the learning has value)
