<!-- @keywords: migration, tech migration, database migration, framework migration, monolith to microservices, breaking change -->
<!-- @domain: Technology Migration Prompts -->

# Technology Migration Prompts

## Framework Migration Plan

```
Plan the migration from [Old Framework] to [New Framework].

**Current state:**
- Framework: [e.g., Create React App / Pages Router / Express v4]
- App size: [N pages / N routes / N components]
- Test coverage: [X%]
- Team size: [N engineers]
- Timeline: [acceptable downtime / zero-downtime / no external deadline]

**Target:**
- Framework: [e.g., Next.js App Router / Vite / Fastify v5]

**Migration strategy options:**

**Option A — Big Bang:**
Rewrite all at once on a branch, merge when complete.
Risk: [high — divergence grows over time]
Timeline: [longer, blocks features]

**Option B — Incremental coexistence:**
Run both frameworks simultaneously, migrate page by page.
Risk: [medium — routing complexity]
Timeline: [can ship features while migrating]

**Recommended approach:** [A or B] because [reason]

**Migration phases:**
Phase 1 — Foundation (week 1-2): [what to do first]
Phase 2 — Core pages (week 3-6): [migration order by complexity]
Phase 3 — Complex features (week 7-N): [hardest parts]
Phase 4 — Cleanup (week N+1): [remove old framework, final tests]

**For each phase:** what breaks, what to test, rollback procedure.
```

---

## Database Migration Plan

```
Plan the migration from [Source DB] to [Target DB].

**Source:** [PostgreSQL 13 / MySQL 5.7 / MongoDB 4.4 / SQLite]
**Target:** [PostgreSQL 16 / Supabase / PlanetScale / etc.]

**Migration scope:**
- Tables/collections: [N]
- Data volume: [N GB / N rows in largest table]
- Active connections: [N concurrent — must migrate with zero downtime?]

**Phase 1 — Schema migration:**
- Map source types → target types (note incompatibilities)
- Recreate constraints, indexes, triggers in target schema
- Validate: all objects exist, types are compatible

**Phase 2 — Data migration:**
- Tool: [pg_dump / DMS / custom ETL / Supabase migration tool]
- Strategy: [bulk copy / streaming / batched by ID range]
- Estimated duration at [N GB/hour transfer rate]
- Data validation: checksums, row counts, sample spot-checks

**Phase 3 — Cutover:**
- Dual-write period: application writes to both DBs
- Verify replica is caught up (replication lag <1s)
- Traffic cutover: [DNS / feature flag / connection string update]
- Rollback window: keep old DB running for [N days]

**Risks:**
- Data type incompatibilities: [list specific ones]
- Missing features in target: [list any capability gaps]
- Application changes required: [connection string / query syntax / ORM config]
```

---

## Breaking API Change Plan

```
Plan a non-breaking rollout of this breaking API change.

**The change:**
[describe what needs to change in the API — field rename, shape change, 
behavior change, endpoint removal]

**Clients affected:**
- [Web app] — version [X] — update timeline: [can update immediately]
- [Mobile app] — version [X] — update timeline: [can't force update, N% of users on old version]
- [Third-party integrations] — [N partners] — update timeline: [need 90 days notice]

**Non-breaking migration strategy:**

**Step 1 — Additive change (ship immediately):**
Add the new field/endpoint alongside the old one.
Both work simultaneously.

**Step 2 — Communicate deprecation:**
- Add Deprecation header to old endpoint/field
- Document migration guide
- Set sunset date: [90 days from now]
- Notify third-party consumers

**Step 3 — Update all internal clients:**
Update web app to use new API.
Update internal services.

**Step 4 — Sunset old API:**
After sunset date: remove old field/endpoint.
Return 410 Gone with migration documentation URL.

**Step 5 — Monitoring:**
Track usage of deprecated endpoint/field to know when it's safe to remove.

Show: specific code changes for each step.
```

---

## Dependency Upgrade Plan

```
Plan the upgrade of [dependency name] from [old version] to [new version].

**Package:** [name]
**Current version:** [X.Y.Z]
**Target version:** [A.B.C]
**Breaking changes:** [list from CHANGELOG]

**Impact analysis:**
1. Direct usage: search codebase for how the package is used
2. Changed APIs: which of our usages touch the breaking changes?
3. Transitive impact: does this change require other packages to upgrade?

**Test strategy:**
- Which tests cover the affected functionality?
- Do we need to add tests before upgrading?
- How to detect regressions: [specific test commands]

**Upgrade steps:**
1. Update package.json: npm install [package]@[version]
2. Fix TypeScript type errors
3. Update usage of deprecated/removed APIs
4. Run full test suite
5. Manual testing of [specific flows that use this package]

**Rollback:** if issues found after merge, [how to revert quickly]

**For major version upgrades (X → Y):**
Consider upgrading on a feature branch, not directly on main.
Require passing CI + manual QA before merge.
```

---

## Auth System Migration

```
Plan migration from [old auth] to [new auth].

**From:** [custom JWT / session cookies / Passport.js / Firebase Auth]
**To:** [Auth0 / Clerk / Supabase Auth / NextAuth / custom OAuth2]

**Why migrating:**
[reason: security / features / maintenance / compliance]

**Users affected:**
- Total users: [N]
- Active users (last 30 days): [N]
- Can't force logout: [yes/no — how much disruption is acceptable?]

**Migration phases:**

**Phase 1 — Parallel auth (2 weeks):**
- Deploy new auth system alongside old
- New registrations go to new auth system
- Old users can still log in via old system

**Phase 2 — Migration endpoint (4 weeks):**
- Create endpoint: "upgrade your account"
- User logs in with old credentials → old auth validates → creates new auth account
- Link old user ID to new auth ID

**Phase 3 — Incentivize migration:**
- Show banner to users still on old auth
- Send email campaign for "new security features"

**Phase 4 — Force migration (last resort):**
- Set sunset date for old auth
- Force users to verify and migrate on next login
- Keep old password hash for verification during transition

**Data to migrate per user:**
- What carries over: [email, name, verified status]
- What doesn't map: [list]
- What needs special handling: [social logins, 2FA, passkeys]
```
