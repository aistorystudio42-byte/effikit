<!-- @keywords: copywriting, UI copy, microcopy, button text, error message, onboarding copy, tone of voice -->
<!-- @domain: UI Copywriting Prompts -->

# UI Copywriting Prompts

## Microcopy Audit

```
Audit and rewrite the UI copy for: [feature / page]

**Copy to review:**
[paste all text visible in the UI — buttons, labels, messages, tooltips, placeholders]

**Copy principles:**
- Clear: users understand what will happen before they act
- Concise: no word that isn't earning its place
- Actionable: CTAs say what the button does, not generic "Submit"
- Human: sounds like a person talking, not a legal document
- Consistent: same words for same concepts throughout

**Common copy problems to find:**

**Vague CTAs:**
```
❌ "Submit" → ✅ "Create account"
❌ "OK" → ✅ "Delete post" or "Got it"
❌ "Cancel" (in delete confirmation) → ✅ "Keep post"
❌ "Click here" → ✅ "Download report"
```

**Technical error messages:**
```
❌ "Error 422: Unprocessable Entity"
✅ "We couldn't save your changes — please check the highlighted fields"

❌ "Invalid input"
✅ "Your email address doesn't look right — it should have an @ symbol"

❌ "Network request failed"
✅ "Couldn't connect. Check your internet connection and try again."
```

**Generic empty states:**
```
❌ "No data found"
✅ "You haven't created any projects yet. [Start your first project →]"

❌ "No results"
✅ "No posts match 'typescript hooks'. Try a different search or [browse all posts]."
```

**Rewrite all copy found. Follow the principles above.**
```

---

## Onboarding Copy

```
Write onboarding copy for: [product]

**Product name:** [name]
**Core value proposition:** [one sentence — what problem does it solve?]
**Target user:** [describe persona]
**Tone:** [friendly / professional / playful / minimal]

**Copy to write:**

**Welcome screen:**
Headline: [8-12 words — value-focused, not feature-focused]
Subtext: [2 sentences — what they'll be able to do]
CTA button: [verb phrase — "Start creating" / "Set up my account"]

**Step 1 — Account setup:**
Heading: [imperative — "Add your name"]
Supporting text: [one sentence why this matters]
Input placeholder: [contextual example, not "Enter text"]
CTA: "[specific action] →"

**Progress indicator:**
[Step X of Y — "Almost there" / "One more thing"]

**Completion screen:**
Headline: [celebrate — but be specific about what they accomplished]
Subtext: [what they can do now]
CTA: ["Go to dashboard" / "See your workspace" / specific action]

**Tone guidelines for this product:**
[Describe — e.g., "Direct but warm. No exclamation marks on errors. 
Celebrate wins simply. Never condescending."]
```

---

## Error Message Library

```
Write error messages for: [application area]

**Error scenarios to cover:**

**Form validation:**
| Field | Error condition | Message |
|-------|----------------|---------|
| Email | Empty | "Email is required to create your account" |
| Email | Invalid format | "Check your email — it should look like name@domain.com" |
| Password | Too short | "Password must be at least 12 characters" |
| Password | No number | "Add at least one number to your password" |
| Credit card | Invalid number | "That card number doesn't look right" |
| Credit card | Expired | "This card expired. Use a different card." |

**Network errors:**
| Situation | Message | Action offered |
|-----------|---------|----------------|
| No internet | "You're offline. Changes will save when you reconnect." | [Try again] |
| Server error | "Something went wrong on our end. We're looking into it." | [Try again] |
| Timeout | "That took too long. Try again?" | [Try again] |
| Not found | "[Resource] doesn't exist or was deleted." | [Go back] |

**Auth errors:**
| Situation | Message |
|-----------|---------|
| Wrong password | "That password isn't right. [Forgot your password?]" |
| Account doesn't exist | "We don't have an account for that email. [Sign up instead?]" |
| Session expired | "You've been signed out. Sign back in to continue." |
| Too many attempts | "Too many attempts. Try again in 15 minutes." |

**Principles for all messages:**
- Never blame the user
- Tell them what to do next (not just what went wrong)
- No technical codes or internal error names in user-facing messages
- Offer a way forward whenever possible

Write messages for: [your specific error scenarios].
```

---

## Feature Announcement Copy

```
Write copy to announce: [new feature]

**Feature:** [name and description]
**Benefit:** [what problem it solves for users]
**Target:** [which users — all users / specific segment]
**Channel:** [in-app tooltip / email / banner / modal / release notes]

**In-app tooltip:**
Headline: [5-7 words — benefit focused]
Body: [1-2 sentences — what it does and why it helps]
CTA: [try it / learn more / dismiss]
Placement: [near the feature button]

**Email announcement:**
Subject line: [A/B test these 2 options]
Option A: "[Specific thing] just got easier"
Option B: "New: [Feature name] — [one-line benefit]"

Body:
[One paragraph — the problem this solves]
[One paragraph — how the feature works, briefly]
[CTA button]: "Try [feature name] now"
[One line]: "This is available to [tier] users. [Upgrade to access?]"

**In-app modal (first-time exposure):**
Headline: "Introducing [feature name]"
Visual: [screenshot or illustration]
Subtext: [2-3 sentences — benefit + how to use]
Primary CTA: "[action]"
Secondary: "Maybe later" (not "Dismiss")
```

---

## Empty State Copy

```
Write empty state copy for: [list of empty states in the app]

**Empty states to write:**

For each state:
- Icon/illustration: [what visual accompanies this]
- Heading: [direct — "No [things] yet" or value-framed "Your [things] live here"]
- Body: [optional — 1 sentence why this is empty + what to do]
- CTA: [specific action — not "Get started"]

**Templates:**

**Zero state (first time, no content):**
```
Icon: [relevant illustration]
Heading: "Create your first project"
Body: "Projects organize your work. Start one now and invite your team."
CTA: "New project"
```

**Search/filter returns nothing:**
```
Icon: [search/magnifier]
Heading: "No results for '[query]'"
Body: "Try different keywords, or [browse all posts]."
CTA: "Clear search"
```

**After completing all items:**
```
Icon: [checkmark / celebration]
Heading: "You're all caught up!"
Body: "New tasks will appear here."
(No CTA needed — this is a positive state)
```

**Filtered view with no matching items:**
```
Heading: "No [items] match your filters"
Body: "Try removing a filter to see more results."
CTA: "Clear filters"
```

Write empty state copy for: [your specific empty states].
```
