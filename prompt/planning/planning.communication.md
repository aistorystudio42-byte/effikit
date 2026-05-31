<!-- @keywords: communication, technical writing, stakeholder update, PR description, incident report, documentation writing -->
<!-- @domain: Technical Communication Prompts -->

# Technical Communication Prompts

## PR Description

```
Write a pull request description for this change.

**Branch:** [branch name]
**Tickets:** [JIRA-123 / GitHub issue #456]

**Changes made:**
[paste diff summary or describe what changed]

**Format:**
## What changed and why
[2-4 bullet points — the "what" and the "why" — not the "how"]

## How to test
1. [Concrete step the reviewer can take to verify this works]
2. [Step]
3. [Edge case to check]

## Screenshots (if UI change)
[Add before/after screenshots]

## Checklist
- [ ] Tests added or updated
- [ ] No console.log left in production code
- [ ] Migration is reversible (if DB change)
- [ ] Accessible (keyboard navigable, proper ARIA)
- [ ] Mobile-tested at 375px
- [ ] Changelog updated

## Notes for reviewer
[Anything that makes review harder without context — design decisions, 
things intentionally left out, areas to focus review attention]
```

---

## Incident Report

```
Write an incident report for this outage/incident.

**Incident:** [one-line description]
**Severity:** [P0 / P1 / P2]
**Duration:** [start time] → [end time] = [N minutes/hours]
**Affected:** [N users / % of traffic / which features]

**Report structure:**

## Summary
[2-3 sentences: what happened, how it was detected, how it was resolved]

## Timeline (UTC)
| Time | Event |
|------|-------|
| HH:MM | [first symptom observed] |
| HH:MM | [alert fired / customer report] |
| HH:MM | [on-call paged] |
| HH:MM | [investigation started] |
| HH:MM | [root cause identified] |
| HH:MM | [fix deployed] |
| HH:MM | [incident resolved / monitoring confirmed stable] |

## Root Cause
[The specific technical root cause — not the symptom]

## Impact
- Users affected: [N]
- Requests failed: [N]
- Features degraded: [list]
- Revenue impact: [if quantifiable]

## What we did right
[things that helped resolve faster]

## What we could improve
[things that slowed resolution or allowed the incident]

## Action items
| Action | Owner | Due |
|--------|-------|-----|
| [prevent recurrence] | [name] | [date] |
| [add monitoring] | [name] | [date] |
| [fix underlying issue] | [name] | [date] |
```

---

## Stakeholder Technical Update

```
Write a technical update for non-technical stakeholders.

**Audience:** [PM / executive / client / business team]
**What to communicate:** [feature progress / incident / technical decision / delay]

**Tone:** Clear, jargon-free, outcome-focused (not code-focused)

**Template:**

## Status: [On Track / At Risk / Delayed / Complete]

## What we accomplished this week
- [outcome, not activity — "Users can now X" not "We implemented Y"]
- [outcome]
- [outcome]

## What's coming next
- [N things planned for next week]
- Expected completion: [date]

## Risks and blockers
- [Risk]: [likelihood] — we're addressing by [action]
- [Blocker]: waiting on [who/what] — expected by [date]

## Decisions needed from you
- [specific decision needed]: [option A vs option B, implications of each]

## Questions / FYI
[anything they should know that doesn't need a decision]

**Length target:** fits on one screen. No jargon. If a technical term must appear, define it in parentheses immediately.
```

---

## Technical Proposal / RFC

```
Write a technical proposal (RFC) for: [idea / change]

**RFC title:** [descriptive name]
**Author:** [name]
**Date:** [date]
**Status:** Draft / Under Discussion / Accepted / Rejected

## Problem Statement
[What problem does this solve? Why does it need solving now?
Be specific: include data, metrics, user feedback, or incident count.]

## Proposed Solution
[Describe the solution clearly. Include:
- What changes
- How it works at a high level
- Key implementation decisions]

## Detailed Design
[Technical details: APIs, data models, component changes, migration plan]

## Alternatives Considered
### Alternative A: [name]
[describe + why rejected]

### Alternative B: [name]
[describe + why rejected]

## Drawbacks / Risks
[What's bad or risky about this approach?
Don't hide trade-offs — they'll be discovered anyway.]

## Success Criteria
[How will we know this worked? Specific, measurable outcomes.]

## Open Questions
- [Unresolved question that needs input from the team]
- [Question]

## Timeline
- [Milestone 1]: [date]
- [Milestone 2]: [date]

**Feedback requested by:** [date]
```

---

## Code Comment / Documentation

```
Write clear documentation for this code.

**Code to document:**
[paste function / class / module]

**Audience:** [future team members / library users / API consumers]

**Documentation level:**
- [ ] Inline comments (why, not what)
- [ ] JSDoc function documentation
- [ ] Module-level README section
- [ ] API endpoint documentation

**JSDoc format:**
/**
 * [One-sentence description of what this does]
 *
 * [Optional: longer explanation for non-obvious behavior, 
 *  algorithm, or domain knowledge needed to understand it]
 *
 * @param paramName - [what it is, valid values, side effects of edge values]
 * @param options.field - [if options object, document each field]
 * @returns [what it returns — type + meaning, not just the type]
 * @throws {ErrorType} [when it throws and why]
 *
 * @example
 * // [realistic usage example — not foo/bar]
 * const result = myFunction(realInputValue, { option: true });
 * // result: { expected output }
 */

**Rules:**
- Don't document what the code obviously does ("increments i by 1")
- Do document WHY a non-obvious approach was chosen
- Do document business rules or domain constraints embedded in the code
- Keep examples realistic — use domain values, not placeholder data
```
