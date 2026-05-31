<!-- @keywords: release, launch, deployment plan, rollout, go-live, release checklist, post-launch -->
<!-- @domain: Release & Launch Planning Prompts -->

# Release Planning Prompts

## Release Checklist

```
Create a pre-release checklist for: [feature / product version]

**Release type:** [feature flag rollout / staged rollout / full deploy / hotfix]
**Target date:** [date]
**Engineer on call:** [name]

**Code quality:**
- [ ] All acceptance criteria verified
- [ ] Code reviewed and approved
- [ ] No TypeScript errors (`tsc --noEmit` passes)
- [ ] All tests passing (unit + integration + E2E)
- [ ] No `console.log` / debug code left behind
- [ ] No `any` types introduced
- [ ] Linter passes (`npm run lint`)

**Database:**
- [ ] Migrations written and tested
- [ ] Migrations are reversible (has down migration)
- [ ] Migration tested on a production-size dataset
- [ ] No breaking schema changes without backward-compatible transition

**Security:**
- [ ] No secrets committed to code
- [ ] New endpoints have auth applied
- [ ] New endpoints have rate limiting if public
- [ ] User input is validated and sanitized

**Observability:**
- [ ] Key operations are logged (structured logs)
- [ ] Error monitoring captures new error types
- [ ] Performance metrics in place for new critical paths
- [ ] Alerting rules updated if new failure modes exist

**Documentation:**
- [ ] API changes documented
- [ ] Changelog updated
- [ ] Runbook updated if operational behavior changed

**Rollback:**
- [ ] Rollback procedure documented
- [ ] Migration rollback tested
- [ ] Feature flag ready to turn off if needed
- [ ] On-call knows the rollback steps

**Sign-off:**
- [ ] PM sign-off
- [ ] QA sign-off
- [ ] Engineering lead sign-off
```

---

## Deployment Plan

```
Write a deployment plan for: [release]

**Environment progression:**
[dev → staging → production]

**Step 1 — Staging deployment:**
Time: [T+0]
- Run migration: `[exact command]`
- Deploy application: `[exact command]`
- Smoke test: [list 5-10 critical paths to test manually]
- Verify: [what metrics to check — error rate, latency, logs]
- Wait: [N minutes to confirm stability]

**Step 2 — Production deployment:**
Time: [T+30min if staging passed]
- Pre-deploy: [notify team / notify users if there's downtime / enable maintenance mode]
- Run migration: `[exact command]`
  - Expected duration: [N seconds]
  - Is the table locked during migration? [yes/no]
- Deploy application: `[exact command]`
  - Rolling deploy: [N pods at a time]
- Post-deploy smoke test: [list critical paths]
- Monitor for: [N minutes] — watching: [error rate / latency / DB query time]

**Rollback triggers:**
Roll back immediately if:
- Error rate exceeds [X%]
- P99 latency exceeds [Y ms]
- Any [critical business operation] fails

**Rollback procedure:**
1. [exact rollback command]
2. Run down migration: [exact command]
3. Verify system restored: [how to confirm]
4. Notify team: [who / how]

**Post-deploy:**
- [ ] Update status page if downtime occurred
- [ ] Archive deployment artifacts
- [ ] Close release ticket
```

---

## Hotfix Plan

```
Plan an emergency hotfix for: [bug description]

**Severity:** P0 (production down) / P1 (major feature broken) / P2 (degraded)
**Impact:** [N users affected / % of traffic / which feature broken]
**Started:** [when the issue began]

**Immediate actions (first 15 minutes):**
- [ ] Confirm the bug is reproducible
- [ ] Identify the scope: isolated or widespread?
- [ ] Notify: [who needs to know — oncall, PM, stakeholders]
- [ ] Can we mitigate without a deploy? [feature flag off / config change / DB update]

**If code fix required:**

**Investigation (30 min max):**
- [ ] Identify the specific commit/PR that introduced the bug
- [ ] Understand the root cause in [N sentences]
- [ ] Identify the minimal fix (not a refactor — a surgical change)

**Fix and deploy:**
- [ ] Create hotfix branch from main/production tag
- [ ] Make minimal fix
- [ ] Write a test that would have caught this
- [ ] Code review (async, don't wait — but must be reviewed)
- [ ] Deploy to staging: verify fix works, verify no regressions
- [ ] Deploy to production
- [ ] Monitor for [N minutes]

**Post-incident:**
- [ ] Write incident report (timeline, root cause, fix, prevention)
- [ ] Create follow-up ticket for permanent solution if hotfix was a patch
- [ ] Update runbook with new monitoring rule
- [ ] Schedule team retrospective
```

---

## Feature Flag Strategy

```
Design a feature flag strategy for: [feature name]

**Feature:** [description]
**Flag name:** [FEATURE_NAME_ENABLED — UPPER_SNAKE_CASE]
**Default:** [off]

**Flag lifecycle:**

**Stage 1 — Development (flag off by default):**
- Who sees it: developers only (via local .env)
- Purpose: build without affecting production

**Stage 2 — Internal testing (flag on for internal users):**
- Enable for: [team email domain / admin accounts / specific user IDs]
- Purpose: integration testing in production environment

**Stage 3 — Beta rollout:**
- Enable for: [X% of users / specific user cohort / opted-in beta users]
- Monitor: [error rate, engagement, performance vs control group]
- Success criteria to proceed to full rollout: [specific metrics]
- Duration: [N days at this stage]

**Stage 4 — Full rollout:**
- Enable for: 100% of users
- Monitor for: [N days]
- Clean up: set a reminder to remove the flag and the code branch in [N weeks]

**Implementation:**
```typescript
// Check flag (server-side)
const isEnabled = await getFeatureFlag('FEATURE_NAME_ENABLED', {
  userId: user.id,
  defaultValue: false,
});

// Check flag (client-side, Next.js)
const { data: flags } = useFeatureFlags();
if (!flags?.FEATURE_NAME_ENABLED) return null;
```

**Cleanup criteria:**
Remove the flag when: [100% rollout stable for N days + no rollback events].
```

---

## Post-Launch Review Template

```
Write a post-launch review for: [feature / product]

**Launch date:** [date]
**Reviewer:** [name]
**Review period:** [N weeks post-launch]

**Objectives vs Outcomes:**

| Objective | Target | Actual | Status |
|-----------|--------|--------|--------|
| [metric 1] | [target] | [actual] | ✅/⚠️/❌ |
| [metric 2] | [target] | [actual] | |

**What went well:**
- [specific thing that worked — be concrete, not generic]
- [specific thing]
- [specific thing]

**What didn't go well:**
- [specific problem] — root cause: [why] — next time: [what to do differently]
- [specific problem]

**Surprises (good or bad):**
- [unexpected thing that happened — positive]
- [unexpected thing — negative]

**Technical learnings:**
- [what we learned about the system / tech / process]
- [what we'd do differently architecturally]

**User feedback themes:**
- Positive: [top 3 things users said they liked]
- Negative: [top 3 things users complained about]
- Requests: [top features users asked for]

**Action items:**
- [ ] [specific follow-up] — owner: [name] — due: [date]
- [ ] [specific follow-up]
```
