<!-- @keywords: creativity, Disney, brainstorming, dreamer, realist, critic, ideation, creative process -->

# Creativity — Disney Method: Dreamer, Realist, Critic

## The Three Rooms

Walt Disney used three distinct thinking modes for creative problem-solving. He physically moved between rooms representing each mode. The power of the method is strict separation — you cannot be a Dreamer and a Critic simultaneously.

```
Room 1 — The Dreamer:  Anything is possible. No constraints. Pure vision.
Room 2 — The Realist:  How do we actually build this? Practical planning.
Room 3 — The Critic:   What could go wrong? What's weak? Devil's advocate.
```

Apply this to: designing new features, solving architectural problems, writing technical proposals.

---

## Room 1: The Dreamer

**Rules:** No "but," no "can't," no "realistic." Every idea is valid. Build on ideas, don't cut them.

```
When designing a new onboarding flow, the Dreamer says:
  "What if the onboarding knew everything about the user from day one?"
  "What if the product taught itself to the user through play, not forms?"
  "What if we never showed a blank state — it was always populated with relevant examples?"
  "What if the first experience felt like a magic trick?"
  "What if users could onboard by importing from another tool?"
  "What if we skipped onboarding entirely and learned by watching?"

Write everything down. Evaluate nothing. Fill a page.

Dreamer prompts for technical problems:
  "What would the perfect version of this look like?"
  "If we had 10x the resources, how would we do this?"
  "What would a user with zero technical knowledge expect?"
  "What does this look like in 5 years?"
  "What if we could break all the current constraints?"
```

---

## Room 2: The Realist

**Rules:** Take the best Dreamer ideas and plan how to build them. Focus on execution, not evaluation.

```
Taking the Dreamer idea: "The product should feel like a magic trick on first use"

The Realist builds a plan:
  Week 1: Auto-populate workspace with industry-specific templates
           → Detect industry from email domain during signup
           → Map domain to template library (10 industries, 5 templates each)

  Week 2: Pre-fill with realistic sample data
           → Create sample data generator per industry
           → Show data that looks like the user's actual data

  Week 3: Smart defaults
           → Most used features surfaced first
           → Tooltips appear only at natural discovery moments

The Realist asks:
  "Who builds each piece?"
  "What are the dependencies?"
  "What do we need to learn before we start?"
  "What's the critical path?"
  "What can we ship in week 1 to test the core assumption?"
```

---

## Room 3: The Critic

**Rules:** Find weaknesses in the Realist's plan. The goal is to make the plan better, not to kill the idea.

```
Critical questions for the plan above:
  "What if the industry detection is wrong? (Gmail users, consultants)"
  "Sample data that looks real but isn't — does this confuse users?"
  "What are the 10 industries? How were they chosen? What about edge cases?"
  "How do we maintain 50 templates? Who updates them?"
  "What if a user never moves past the sample data state?"
  "What's the fallback experience when detection fails?"
  "Privacy: are we storing email domains? GDPR implications?"

The Critic is NOT:
  "This will never work" (killing the idea, not improving it)
  "That's too expensive" (that's the Realist's job)
  
The Critic IS:
  Finding specific weaknesses that have specific solutions
```

---

## Full Disney Method Session

```
Session structure (60-90 minutes):

Phase 1 — Dreamer (15 min):
  Facilitator: "We're building X. What's your vision?"
  Rules: no criticism, build on each other's ideas
  Output: 20-30 ideas, a vision statement

Phase 2 — Realist (30 min):
  Pick the 3-5 most interesting Dreamer ideas
  For each: "How would we actually build this?"
  Output: rough implementation plan for each idea

Phase 3 — Critic (15 min):
  For each Realist plan: "What are the weak points?"
  Each criticism must be specific and solvable
  Output: list of risks and questions to resolve

Phase 4 — Integration (15 min):
  Return to Dreamer room with Critic's feedback
  Revise plan to address weaknesses
  Output: refined approach
```

---

## Solo Disney Method

```typescript
// Useful for architectural decisions when working alone

// Step 1: Write as the Dreamer
// "The ideal authentication system would..."
// - Remember passwords forever across devices
// - Never interrupt the user with verification
// - Instantly know if a login is suspicious
// - Never have false positives (blocking legitimate users)
// - Zero friction for returning users

// Step 2: Write as the Realist
// Implementation plan:
// - Persistent sessions with refresh token rotation
// - Risk-based auth: extra verification only when risk score > threshold
// - Device fingerprinting for trusted device recognition
// - Behavioral baseline for anomaly detection

// Step 3: Write as the Critic
// Weaknesses to address:
// - Risk-based auth requires training data — what's the behavior until then?
// - Device fingerprinting has privacy implications (GDPR)
// - What if behavioral baseline is established with compromised account?
// - False negative risk: missed suspicious login

// Step 4: Revise
// Better plan addresses all critical points above
```

---

## Disney Method Checklist

- [ ] Three phases run in strict sequence (no mixing)
- [ ] Dreamer phase: no evaluation, all ideas written down
- [ ] Realist phase: practical plan, not dream validation
- [ ] Critic phase: specific weaknesses, each one addressable
- [ ] Integration: plan revised to address critical weaknesses
- [ ] Output: concrete next action, not just ideas
