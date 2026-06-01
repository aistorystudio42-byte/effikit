<!-- @keywords: changelog, release notes, versioning, semantic versioning, release management -->

# - Update SDK documentation

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to changelog.

## Principles

### Why a Changelog Matters
A changelog is a curated, human-readable record of changes. Unlike git log — which records every commit — a changelog records changes that matter to users and other developers. It answers: "What changed, and does it affect me?"

---

### Keep a Changelog Format
```markdown

All notable changes to this project are documented here.
Format: [Semantic Versioning](https://semver.org)

### [Unreleased]
Changes staged but not yet released go here.

---

### [2.3.0] — 2024-03-15
### Added
- User avatar upload (`POST /api/users/:id/avatar`)
- Coupon stacking: multiple coupons can now be applied to a single order
- `GET /api/orders` supports `dateFrom` and `dateTo` query parameters

### Changed
- Order confirmation emails now include itemized receipt
- Default pagination limit changed from 20 to 25

### Deprecated
- `PUT /api/users/:id` — use `PATCH /api/users/:id` for partial updates
  The PUT endpoint will be removed in v3.0.0

### Removed
- Removed `GET /api/v1/legacy-orders` (deprecated in v2.0.0)

### Fixed
- Fixed: PATCH `/api/users/:id` accepted empty string for `name`
- Fixed: Order total displayed incorrectly when currency is JPY (no cents)

### Security
- Updated `jsonwebtoken` to 9.0.2 (fixes CVE-2022-23529)
- Added brute-force protection to password reset endpoint

---

### [2.2.1] — 2024-02-20
### Fixed
- Fixed: checkout fails when cart has more than 50 items
- Fixed: race condition when two users claim the last unit of a product simultaneously

---

### [2.2.0] — 2024-02-01
### Breaking Changes

> ⚠️ **Breaking:** These changes require client updates.

**`address` field restructured**
- Old: `"address": "123 Main St, New York, NY 10001"` (string)
- New: `"address": { "street": "123 Main St", "city": "New York", "state": "NY", "zip": "10001" }`
- Affected endpoints: `GET /orders/:id`, `GET /orders`
- Migration: see [v2.2 Migration Guide](docs/migration/v2.2.md)

**`price` field renamed to `priceCents`**
- Was: `"price": 19.99` (float, dollars)
- Now: `"priceCents": 1999` (integer, cents)
- Rationale: eliminates floating-point precision issues in financial calculations

### Added
- `POST /api/orders/bulk` — create up to 10 orders in a single request

---

### [2.1.0] — 2024-01-10
### Added
- Two-factor authentication (TOTP via authenticator apps)
- `POST /api/auth/2fa/setup` — initiate 2FA setup
- `POST /api/auth/2fa/verify` — verify TOTP code
- `POST /api/auth/2fa/backup` — generate backup codes
```

---

### Release Process
```bash
npm version minor  # or major / patch

git add package.json CHANGELOG.md
git commit -m "chore: release v2.3.0"

git tag -a v2.3.0 -m "Release v2.3.0"

git push origin main --tags

```

---

### Generating Changelog from Commits
```javascript
// Conventional Commits → auto-generate changelog
// Using: conventional-changelog-cli or release-it

// .releaserc.json (semantic-release)
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    ["@semantic-release/release-notes-generator", {
      "preset": "conventionalcommits",
      "presetConfig": {
        "types": [
          { "type": "feat",     "section": "Added" },
          { "type": "fix",      "section": "Fixed" },
          { "type": "perf",     "section": "Changed" },
          { "type": "refactor", "hidden": true },
          { "type": "chore",    "hidden": true }
        ]
      }
    }],
    "@semantic-release/changelog",
    "@semantic-release/npm",
    "@semantic-release/git"
  ]
}
```

---

### Deprecation Notice Template
```markdown

### Deprecation Notice: `GET /api/v1/users/:id/profile`
**Deprecated:** 2024-03-01
**Removal date:** 2024-09-01 (6 months notice)

**Reason:** Profile data is now included in the main user response (`GET /api/v1/users/:id`),
making this endpoint redundant.

**Migration:**
- Old: `GET /api/v1/users/123/profile` → `{ "bio": "...", "avatarUrl": "..." }`
- New: `GET /api/v1/users/123` → `{ "id": "123", ..., "profile": { "bio": "...", "avatarUrl": "..." } }`

The `Sunset` response header will be set to `2024-09-01` on this endpoint until removal.
```

---

## Decision Framework

```
MAJOR (2.0.0): Breaking change — existing integrations may break
  - Removing or renaming an endpoint
  - Changing field names or types in responses
  - Changing authentication mechanism
  - Removing support for a parameter

MINOR (2.1.0): New functionality, backward compatible
  - Adding new endpoints
  - Adding new optional fields to responses
  - Adding new optional query parameters
  - Adding new enum values (if clients use allow-lists)

PATCH (2.1.1): Bug fixes, no API change
  - Fixing incorrect calculation results
  - Fixing validation that was too strict
  - Performance improvements
  - Documentation fixes

Security patches: use PATCH for non-breaking, MINOR for behavioral changes
```

---

## Anti-Patterns

- Over-engineering the solution.
- Ignoring context and copying blindly.
- Mixing concerns unnecessarily.

## Example in Action

- [ ] `[Unreleased]` section updated with every merged PR
- [ ] Breaking changes clearly marked with ⚠️ and migration guide linked
- [ ] Each entry describes user impact (not just technical details)
- [ ] Security fixes listed in `Security` section with CVE reference if applicable
- [ ] Deprecated items include removal date (minimum 6 months notice)
- [ ] Version tags pushed to git (enables linking commits to releases)
- [ ] GitHub Release created with changelog notes for every version
