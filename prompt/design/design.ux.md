<!-- @keywords: UX design, user experience, wireframe, user flow, interaction design, usability, prototype -->
<!-- @domain: UX Design Prompts -->

# UX Design Prompts

## User Journey Mapping

```
Map the user journey for: [goal or task]

**User:** [persona — job title, goals, tech-savviness, context]
**Goal:** [what they're trying to accomplish]
**Starting point:** [where the journey begins]
**End state:** [what success looks like for the user]

**Journey phases:**
For each phase, describe:

Phase 1 — Awareness / Entry:
- What brought them here? [search / recommendation / direct / ad]
- What's their initial expectation?
- What questions are they asking?
- Emotional state: [hopeful / skeptical / rushed / confused]

Phase 2 — Discovery / Evaluation:
- What are they looking for?
- What information helps them trust the product?
- Friction points: [what might make them leave?]

Phase 3 — Action / Conversion:
- What's the key action?
- What hesitations might they have?
- What reassurance do they need?

Phase 4 — Result / Follow-through:
- What confirmation do they get?
- What's next?
- Are expectations met?

**Pain points to eliminate:**
[list friction in the current journey]

**Design implications:**
[what the UI must do at each phase]
```

---

## Onboarding Flow Design

```
Design an onboarding flow for: [product]

**Product:** [what it does]
**New user goal:** [what they need to accomplish to get value]
**"Aha moment":** [the moment a user first experiences core value]

**Onboarding design principles:**
- Defer non-essential setup (profile photo, notifications, etc.)
- Show value before asking for effort
- Progressive disclosure: reveal features as needed

**Flow structure:**

**Step 1 — Welcome (15 seconds):**
- One clear benefit statement (not a feature list)
- Minimal friction to continue
- Skip option if returning user / already set up

**Step 2 — Essential setup (2 minutes max):**
- Only what's required to reach the aha moment
- Smart defaults for everything optional
- Inline validation (not just on submit)
- Progress indicator if >2 steps

**Step 3 — Aha moment delivery:**
- Take them directly to the core value
- Show a sample/template if blank canvas is intimidating
- Celebrate completion (but don't be cheesy)

**Step 4 — Next best action:**
- One suggested next step, not a list of features
- Contextual — based on what they just did

**Empty state design:**
What do they see when the product is empty?
This is the most important screen — replace emptiness with invitation:
- "Your first [thing] starts here"
- Sample content option
- Direct call to action

Design the onboarding for: [your product].
```

---

## Error State Design

```
Design all error states for: [feature / flow]

**Error categories to design:**

**1. Form validation errors:**
```
Trigger: user submits form or leaves field
Placement: directly below the relevant input
Format: red text, field outline turns red
Content: specific + actionable
  ✅ "Email must be in format name@domain.com"
  ❌ "Invalid email"
Timing: on blur (when leaving field), re-validate on each keystroke after first error
```

**2. Network / API errors:**
```
Trigger: request fails
Placement: inline (near action) or toast (for background operations)
Content: friendly + action options
  ✅ "Couldn't save changes. [Try again] or [Save draft]"
  ❌ "Error 500: Internal Server Error"
Retry: provide retry button, auto-retry for idempotent operations
```

**3. Not found / empty states:**
```
When: resource doesn't exist or search returns no results
Content: explain what happened + what to do
  ✅ "No posts found for 'typescript'" + [Create one] or [Clear filter]
  ❌ blank page or generic "404"
Visual: illustration or icon that matches the context
```

**4. Permission errors:**
```
When: user lacks access to resource
Content: explain why + offer a path forward
  ✅ "This page is for team admins. [Contact your admin] to get access."
  ❌ "Access denied"
```

**5. Loading states (not an error, but critical UX):**
```
Short wait (<300ms): no indicator (flashing is worse than waiting)
300ms-2s: spinner or inline indicator
2s+: skeleton screen
5s+: progress indicator with estimated time
Infinite: something is wrong — add a timeout state
```

Design all error states for: [your specific feature].
```

---

## Interaction Design Patterns

```
Design interaction patterns for: [UI component or feature]

**Component:** [dropdown / modal / form / table / infinite scroll / etc.]

**Interaction states to design:**

**Mouse interactions:**
- Default cursor: [pointer / default / text]
- Hover: [visual feedback — color, shadow, scale]
- Click: [active state visual — compressed, darker]
- Drag: [cursor, ghost element, drop target highlight]

**Keyboard interactions:**
- Tab focus: [visible focus ring — which elements are in tab order?]
- Enter: [activates primary action]
- Escape: [closes / cancels]
- Arrow keys: [navigates list / changes value]
- Space: [toggles / opens dropdown]

**Touch interactions:**
- Tap: [same as click]
- Long press: [context menu / hold action]
- Swipe: [direction → action mapping]
- Pinch: [zoom in/out if applicable]

**Feedback for each interaction:**
- Immediate (0ms): visual feedback (state change)
- Near-immediate (< 100ms): animation starts
- Short wait (100-300ms): transition completes
- Medium wait (300ms-2s): loading indicator
- Long wait (2s+): progress indicator + cancel option

**Micro-animations:**
- Hover lift: [0px → -2px translateY, 50ms]
- Click press: [100% → 98% scale, 50ms]
- Menu open: [height 0 → auto, opacity 0 → 1, 150ms ease-out]
- Error shake: [3 cycles ±4px, 300ms]

Design interaction patterns for: [your component].
```

---

## Accessibility-First Design

```
Design with accessibility as a first-class requirement.

**Component:** [what you're designing]
**WCAG Level:** AA (minimum) — target AAA where possible

**Design checklist:**

**Visual:**
- Color contrast: text ≥ 4.5:1, large text ≥ 3:1, UI components ≥ 3:1
- Not color-only: error states use both color AND icon/text
- Focus visible: focus ring is visible (never outline: none without alternative)
- Text resizable: layout works at 200% browser zoom without horizontal scroll

**Structure:**
- Semantic HTML: use the right element for the job
  ```html
  ✅ <button> for actions
  ✅ <a href="..."> for navigation
  ✅ <nav>, <main>, <aside>, <footer> landmarks
  ✅ <h1>-<h6> proper hierarchy
  ❌ <div onclick="..."> for actions
  ```

**Keyboard:**
- All interactive elements reachable via Tab
- Custom components implement full keyboard pattern (ARIA Authoring Practices)
- No keyboard traps (unless intentional: modal must trap focus)

**Screen reader:**
- Images: descriptive alt text (or alt="" for decorative)
- Icons: aria-label on icon-only buttons
- Form fields: always label associated with input
- Dynamic content: aria-live for status updates
- Loading states: aria-busy="true" while loading

**Motion:**
- Honor prefers-reduced-motion
- No animations that flash more than 3 times/second

Produce: accessible implementation for [your component].
```
