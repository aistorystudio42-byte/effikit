<!-- @keywords: UX review, UI review, usability, accessibility, design review, user flow, feedback -->
<!-- @domain: UX & UI Review Prompts -->

# UX & UI Review Prompts

## User Flow Review

```
Review this user flow for friction and failure points.

**Flow:** [login / checkout / onboarding / form submission / etc.]

**Steps as implemented:**
1. [step with current UI behavior]
2. [step]
3. [step]
4. [step — completion]

**User goals:**
- Primary: [what the user is trying to accomplish]
- Secondary: [secondary goal]
- Context: [user's mental state — hurried / uncertain / first-time / expert]

**Review for:**
1. Unnecessary steps: which steps could be removed or combined?
2. Missing feedback: where does the user not know if their action worked?
3. Error recovery: if step N fails, what happens? Can the user recover easily?
4. Cognitive load: is the user asked to make decisions they shouldn't have to?
5. Progress visibility: does the user know how far along they are?
6. Abandonment risk: which step is most likely to lose the user?

**Output:**
For each friction point: current behavior → better behavior → why it helps.
```

---

## Accessibility Review

```
Review this UI for accessibility issues.

**Component / Page:**
[paste JSX/HTML or describe the UI]

**WCAG 2.1 Level AA compliance check:**

**Perceivable:**
- [ ] All images have alt text (descriptive for content, empty for decorative)
- [ ] Color is not the only way information is conveyed
- [ ] Text contrast ratio ≥ 4.5:1 (normal text), 3:1 (large text)
- [ ] Content doesn't rely on sensory characteristics (shape, color, location)

**Operable:**
- [ ] All interactive elements reachable via keyboard (Tab order)
- [ ] No keyboard traps (focus can always leave a component)
- [ ] Skip navigation link for pages with repeated content
- [ ] No timing requirements that can't be extended

**Understandable:**
- [ ] Form inputs have visible, associated labels
- [ ] Error messages identify the field and explain how to fix it
- [ ] Language of page declared in <html lang="">
- [ ] Consistent navigation across pages

**Robust:**
- [ ] ARIA roles used correctly (not added unnecessarily)
- [ ] Custom components have role, aria-label, aria-expanded, etc. as needed
- [ ] Focus visible on all interactive elements

For each issue: WCAG criterion + severity + specific fix.
```

---

## Form UX Review

```
Review this form for usability and error handling quality.

**Form:**
[paste form JSX or describe fields and behavior]

**Review checklist:**

**Labels & Placeholders:**
- Are all inputs labeled? (not just placeholder text — that disappears on focus)
- Does the label describe what to enter, not just the field name?
- Is there helper text for non-obvious formats (phone, date, password requirements)?

**Validation:**
- Is validation triggered at the right time? (on blur, not on every keystroke)
- Are error messages specific? ("Email must be valid" not "Invalid input")
- Are errors shown next to the relevant field, not just at the top?
- Does the form remember values after a failed submit?

**Progress & Feedback:**
- Does the submit button show loading state?
- Is there a success state that confirms what happened?
- For multi-step: is there a progress indicator?

**Submission:**
- Is the form accidentally submittable with Enter on a text field?
- Are repeated submits prevented (double-click)?
- Is the primary CTA button correctly labeled (not just "Submit")?

For each issue: why it hurts users + specific fix.
```

---

## Mobile Responsiveness Review

```
Review this layout for mobile usability.

**Code:**
[paste component/page CSS or Tailwind classes]

**Breakpoints used:**
[mobile: 375px / tablet: 768px / desktop: 1280px]

**Review for:**

**Touch targets:**
- Are all interactive elements ≥ 44×44px on mobile?
- Are nearby targets spaced enough to avoid mis-taps?

**Layout:**
- Does content reflow correctly, or does it overflow horizontally?
- Are any fixed widths breaking the mobile layout?
- Is text readable without zooming? (min 16px base)
- Are modals/dialogs full-screen on mobile?

**Navigation:**
- Is the mobile nav accessible via hamburger or bottom bar?
- Are deep navigation items reachable on small screens?

**Images & Media:**
- Are images sized with max-width: 100%?
- Are videos/embeds responsive?

**Performance:**
- Are desktop-only assets (large images) loaded on mobile?

For each issue: affected screen size + specific Tailwind/CSS fix.
```

---

## Error State Review

```
Review all error states in this application.

**Application area:**
[describe the feature or pages covered]

**Find and review every error state:**
For each error state found:

1. **Trigger:** how does the user get here?
2. **Message shown:** [paste current error text]
3. **Clarity:** does the user know WHAT went wrong and WHAT to do next?
4. **Tone:** is the language apologetic/helpful, or technical/blaming?
5. **Recovery:** is there a clear action (retry, go back, contact support)?
6. **Logging:** is this error logged for the developer?

**Error state types to check:**
- Network failure (offline, API down)
- Validation errors (form fields)
- Auth errors (session expired)
- Permission errors (not allowed)
- Not found errors (resource deleted)
- Server errors (500 — something unexpected)
- Empty states (no results — not really an error, but often feels like one)

**For each weak error state:** improved message text + recovery action to add.
```
