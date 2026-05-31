<!-- @keywords: UX, user experience, interaction design, feedback, affordance, mental model, usability -->

# Design — UX Principles and Interaction Design

## Core UX Heuristics

Nielsen's 10 heuristics are the foundation of usable interface design. Apply them as questions, not rules.

```
1. Visibility of system status       → Is the user always informed?
2. Match real world                  → Does the UI use familiar language/concepts?
3. User control and freedom          → Can users undo/redo mistakes easily?
4. Consistency and standards         → Do similar things look and behave the same?
5. Error prevention                  → Does the UI prevent errors before they happen?
6. Recognition over recall           → Are options visible rather than memorized?
7. Flexibility and efficiency        → Can experts work faster than beginners?
8. Aesthetic and minimalist design   → Does every element earn its place?
9. Help users recover from errors    → Are error messages clear and actionable?
10. Help and documentation           → Is help available without leaving the flow?
```

---

## Feedback Design

Every user action should produce a visible response within:
```
< 100ms  → feels instant (no feedback indicator needed)
100ms–1s → acknowledge with visual change (button state, cursor change)
1s–10s   → show spinner/progress
> 10s    → show progress bar with estimated time
```

```typescript
// Loading states — never leave the user wondering
const SubmitButton = ({ isLoading, children }: SubmitButtonProps) => (
  <button disabled={isLoading} aria-busy={isLoading}>
    {isLoading ? (
      <>
        <Spinner size="sm" aria-hidden />
        <span>Processing...</span>
      </>
    ) : children}
  </button>
);

// Optimistic UI — update immediately, revert on error
const toggleLike = async (postId: string) => {
  // Update UI immediately — feels instant
  setLiked(prev => !prev);
  setLikeCount(prev => liked ? prev - 1 : prev + 1);

  try {
    await api.toggleLike(postId);
  } catch {
    // Revert on failure
    setLiked(prev => !prev);
    setLikeCount(prev => liked ? prev + 1 : prev - 1);
    toast.error('Could not save. Try again.');
  }
};

// Toast notifications — non-blocking feedback
// Success: 3s auto-dismiss
// Error: persistent until dismissed (user needs to read and act)
// Warning: 5s auto-dismiss with action button
```

---

## Error Message Design

Users read error messages in high-stress moments. Design them for recovery, not explanation.

```
Bad error message:
  "Error 422: Unprocessable Entity"
  "An unexpected error occurred"
  "Invalid input"

Good error message structure:
  What happened: "We couldn't process your payment"
  Why (if helpful): "Your card was declined by your bank"
  What to do: "Try a different card or contact your bank"

Validation errors:
  Field-level, specific, and actionable
  ✗ "Invalid email"
  ✓ "Enter a valid email address, like name@example.com"

  ✗ "Password too short"
  ✓ "Password must be at least 8 characters"
```

```typescript
// Error message component — clear, styled, actionable
interface ErrorStateProps {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

const ErrorState = ({ title, description, action }: ErrorStateProps) => (
  <div role="alert" className="error-state">
    <ErrorIcon aria-hidden />
    <h3>{title}</h3>
    <p>{description}</p>
    {action && <button onClick={action.onClick}>{action.label}</button>}
  </div>
);

// Usage
<ErrorState
  title="Payment failed"
  description="Your card ending in 4242 was declined. This may be due to insufficient funds or a bank restriction."
  action={{ label: 'Try a different card', onClick: openPaymentModal }}
/>
```

---

## Empty States

Empty states are opportunities, not voids. They guide users to their first action.

```typescript
// Empty state anatomy:
// 1. Illustration (optional) — humanizes, reduces anxiety
// 2. Headline — what is missing
// 3. Description — why it's empty and what it means
// 4. Primary action — what to do next

const EmptyOrderHistory = () => (
  <div className="empty-state">
    <PackageOpenIcon className="empty-icon" aria-hidden />
    <h3>No orders yet</h3>
    <p>When you place your first order, it will appear here.</p>
    <Button variant="primary" onClick={() => router.push('/shop')}>
      Start shopping
    </Button>
  </div>
);
```

---

## Progressive Disclosure

Show only what users need for their current task. Reveal complexity on demand.

```typescript
// Progressive form — start simple, expand when needed
const AddressForm = () => {
  const [showOptional, setShowOptional] = useState(false);

  return (
    <form>
      {/* Required fields always visible */}
      <Input label="Street address" required />
      <Input label="City" required />
      <Select label="Country" required />

      {/* Optional fields — hidden until requested */}
      {!showOptional ? (
        <button type="button" onClick={() => setShowOptional(true)}>
          + Add apartment, suite, or floor
        </button>
      ) : (
        <Input label="Apartment, suite, floor (optional)" autoFocus />
      )}
    </form>
  );
};
```

---

## Affordance and Signifiers

Affordances are what an element can do. Signifiers are visual cues that communicate affordances.

```
Clickable buttons:
  ✓ Elevated (shadow), distinct background, pointer cursor, hover state
  ✗ Flat text with no hover state — looks like a label

Draggable items:
  ✓ Drag handle icon, cursor changes to grab on hover
  ✗ No visual indicator — user must discover by accident

Input fields:
  ✓ Bordered rectangle, placeholder text, focus ring
  ✗ Underline only — ambiguous whether it's editable

Links vs buttons:
  Links: navigate to a new page/URL
  Buttons: trigger an action (submit, toggle, open modal)
  Never style a button like a link that performs a destructive action
```

---

## UX Checklist

- [ ] Every action has a response within 100ms (visual change)
- [ ] Loading states implemented for all async operations
- [ ] Error messages are human-readable, specific, and actionable
- [ ] Empty states guide users to their next action
- [ ] Forms show inline, field-level validation errors
- [ ] Destructive actions require confirmation (delete, cancel)
- [ ] Users can undo critical actions (soft delete, 5s undo toast)
- [ ] No information is conveyed by color alone (accessibility)
- [ ] Interactive elements are visually distinguishable (buttons look clickable)
