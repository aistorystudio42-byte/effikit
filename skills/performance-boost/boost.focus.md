<!-- @keywords: focus, deep work, flow state, distraction, context switching, productivity, concentration -->

# }

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to focus.

## Principles

### The Cost of Context Switching
Every interruption costs more than the interruption itself. The cognitive overhead of reloading a complex system into working memory after a distraction is 15-25 minutes. Four 2-hour blocks produce more than eight 1-hour blocks, even though the total time is identical.

```
Context loading costs:
  Simple task (writing a test): 5 minutes to reload
  Medium task (implementing a feature): 15 minutes to reload
  Complex task (debugging a race condition): 25 minutes to reload
  Architecture work (system design): 30+ minutes to reload

A Slack notification mid-deep-work doesn't cost 30 seconds.
It costs 30 seconds + 25 minutes of reloading = 25.5 minutes.
Six interruptions in a day = 2.5 hours of productive time lost
to the invisible tax of context switching.
```

---

### Entering Flow State
Flow is a mental state where difficulty and skill are matched, feedback is immediate, and the sense of self disappears into the work. It produces the highest quality output.

```
Conditions required for flow:
  1. Clear goal (what exactly am I building/fixing right now?)
  2. Immediate feedback (tests, type checker, browser refresh)
  3. Skill-challenge match (hard enough to engage, not so hard it paralyzes)
  4. No interruptions (30+ minutes without distraction)
  5. Environment primed (setup complete before you start)

Blockers to flow:
  - Unclear task definition (what am I actually trying to do?)
  - Environment setup taking time mid-task (install, configure)
  - Waiting for feedback (CI takes 20 min, tests take 5 min)
  - Multi-tasking (two tasks are worse than one at a time)
  - Notifications
```

---

### Deep Work Protocol
```
Pre-session (5 minutes):
  1. Define exactly one thing you're building or fixing
  2. Write it down: "I am implementing the coupon validation service"
  3. Identify what "done" looks like: "tests passing, PR ready"
  4. Close email, Slack, phone notifications
  5. Open only what you need: IDE, docs, terminal

Session (90-120 minutes):
  - Single task only
  - If a new idea occurs: write it in a quick-capture list, don't chase it
  - If blocked: 15 minutes of active attempts, then ask for help
  - If tired: take a break rather than powering through diminishing returns

Post-session (5 minutes):
  1. Note exactly where you are and what's next
  2. Leave a TODO comment in the code at your stopping point
  3. Record any questions or blockers to resolve
  
  This allows you to resume in 5 minutes instead of 30.
```

---

### Task Clarity Before Starting
The most common reason for context switching is unclear task definition. Clarifying the task takes 10 minutes and saves 2 hours.

```
Before starting any task, answer these:
  What problem am I solving? (specific, not vague)
  What does the solution look like? (output, not process)
  What's the smallest increment I can complete and ship?
  What are the acceptance criteria?
  What do I NOT know yet? (identify blockers before they interrupt you)

Example:
  Vague: "Fix the auth bug"
  Clear:  "Fix the bug where users are logged out when making a purchase 
           if their session was created > 14 minutes ago. Root cause: 
           client-side refresh timer doesn't account for server-side activity. 
           Fix: add /auth/heartbeat endpoint called during checkout, update 
           client timer on response. Done when checkout tests pass without logout."
```

---

### Reducing Friction
Every small friction point adds up. Eliminate the micro-costs of development.

```bash
alias gs='git status'
alias gd='git diff'
alias gl='git log --oneline -10'
alias t='npm test'
alias tw='npm run test:watch'
alias dev='npm run dev'

cat package.json # should include:
```

```typescript
// Hot reloading: near-instant feedback
// Without: edit → build → restart → test (45 seconds)
// With: edit → test (< 2 seconds)

// Nodemon configuration
// nodemon.json:
{
  "watch": ["src"],
  "ext": "ts",
  "exec": "ts-node src/main.ts",
  "delay": "100"
}

// Vitest: instant test feedback
// Tests re-run in < 500ms on file save
```

---

### Energy Management
```
Peak performance hours:
  Most developers have 4-6 hours of peak cognitive performance per day.
  This varies: some peak in morning, some in evening.
  Identify yours and protect them for deep work.

Energy allocation:
  Peak hours:        deep work (complex features, architecture, debugging)
  Medium energy:     code review, documentation, planning
  Low energy:        email, meetings, administrative tasks, dependency updates

The mistake: scheduling a 10am all-hands during your 9am-12pm peak window.
The consequence: your best cognitive hours are spent in meetings,
and you do your deepest work at 3pm when you're mentally depleted.
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

- [ ] Single task defined before starting (what exactly + what done looks like)
- [ ] Environment primed before the session starts (no setup during deep work)
- [ ] Notifications disabled during deep work blocks
- [ ] Peak hours identified and protected for complex work
- [ ] Stopping point noted at end of each session (resume in < 5 min)
- [ ] Quick-capture list for ideas that arrive during focus time
- [ ] Feedback loop fast (tests < 30s, reload < 2s, CI < 10min)
