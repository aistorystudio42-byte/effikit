<!-- @keywords: README, documentation, project setup, onboarding, getting started, architecture overview -->

# ADR-001: Use PostgreSQL as Primary Database

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to readme.

## Principles

### README as Onboarding
The README is the first thing a new developer reads. A good README answers every question needed to get from zero to running the project in under 30 minutes — without asking anyone for help.

```
README must answer:
  ✓ What does this project do? (1 sentence)
  ✓ How do I run it locally? (exact commands, no guessing)
  ✓ What are the environment variables? (with .env.example)
  ✓ How do I run the tests?
  ✓ What's the overall structure?
  ✓ How do I deploy?
  ✓ Where do I go for help?
```

---

### README Structure
```markdown

> One-sentence description of what it does.

### Overview
What problem this solves, who uses it, and why it exists.
Link to design docs, PRD, or architecture decision records.

### Quick Start
\`\`\`bash
git clone https://github.com/org/repo.git
cd repo
npm install

cp .env.example .env

docker-compose up -d  # starts postgres, redis

npm run db:migrate

npm run dev
\`\`\`

### Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✓ | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | ✓ | — | Min 32 chars. Generate: `openssl rand -hex 32` |
| `REDIS_URL` | ✓ | — | Redis connection string |
| `STRIPE_SECRET_KEY` | ✓ | — | Stripe secret key (sk_test_... for dev) |
| `LOG_LEVEL` | — | `info` | `debug` / `info` / `warn` / `error` |

### Project Structure
\`\`\`
src/
  modules/        ← Feature modules (users, orders, products)
    users/
      users.controller.ts
      users.service.ts
      users.repository.ts
  shared/         ← Cross-cutting concerns
    middleware/
    errors/
    database/
  app.ts          ← Express app configuration
  main.ts         ← Entry point
\`\`\`

### Development Commands
| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type check |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:rollback` | Rollback last migration |
| `npm run db:seed` | Seed development data |

### Testing
\`\`\`bash
npm run test:unit

npm run test:integration

npm run test:e2e
\`\`\`

### Deployment
See [deployment guide](docs/deployment.md).

Short version:
1. Merge to `main` → auto-deploys to staging
2. Create a release tag (`v1.2.3`) → manual approval → production deploy

### Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md).

### License
MIT
```

---

### CONTRIBUTING.md Template
```markdown

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make changes with tests
4. Ensure all checks pass: `npm run ci`
5. Submit a PR against `main`

### Commit Convention
We use [Conventional Commits](https://conventionalcommits.org):

\`\`\`
feat: add coupon system
fix: prevent negative order totals
chore: upgrade Node to 20
docs: update API documentation
refactor: extract payment service
test: add integration tests for checkout
\`\`\`

### PR Guidelines
- PR title follows Conventional Commits format
- Description explains WHY (link issue, describe motivation)
- Screenshots for UI changes
- Breaking changes called out explicitly
- Self-review before requesting review

### Branch Naming
\`\`\`
feat/short-description
fix/what-is-broken
chore/dependency-update
docs/what-is-documented
\`\`\`
```

---

### Status
Accepted (2024-01-15)

### Context
We need to choose a database for storing user and order data.
The data has relational structure and consistency is critical for financial data.

### Consequences
**Positive:**
- ACID transactions for financial operations
- Rich query capabilities (JSON, full-text search, window functions)
- Mature ecosystem, strong TypeScript support

**Negative:**
- Requires schema migrations for every change
- More complex horizontal sharding if scale requires it (not expected in 2 years)

### Alternatives Considered
- MongoDB: Flexible schema, but eventual consistency risks for financial data
- MySQL: Similar capabilities, but PostgreSQL has richer feature set
```

---

## Decision Framework

See [architecture overview](docs/architecture.md) for system design.

Key decisions:
- **Database**: PostgreSQL (relational, ACID, mature)
- **Cache**: Redis (session store, rate limiting, job queue)
- **Auth**: JWT (access token 15m, refresh token 7d in HttpOnly cookie)

```markdown

Use PostgreSQL as the primary database.

## Anti-Patterns

- Over-engineering the solution.
- Ignoring context and copying blindly.
- Mixing concerns unnecessarily.

## Example in Action

- TypeScript strict mode enabled
- ESLint + Prettier enforce formatting automatically
- Run `npm run lint --fix` to auto-fix

- [ ] README has Quick Start that works from zero (tested on fresh clone)
- [ ] All environment variables documented (name, required, default, description)
- [ ] Project structure explained (key directories and their purpose)
- [ ] All `npm run` commands documented
- [ ] Architecture overview and key decisions documented
- [ ] CONTRIBUTING.md explains workflow, commit convention, PR process
- [ ] ADRs written for significant technical decisions
- [ ] README kept up to date — stale README is worse than no README
