<!-- @keywords: CI/CD, GitHub Actions, pipeline, continuous integration, deployment, automation -->

# DevOps — CI/CD Pipeline Design

## Pipeline Philosophy

A CI/CD pipeline is a quality gate, not a deployment button. Every commit should either prove the code is ready to ship or clearly explain why it isn't. Fast feedback is the goal — developers shouldn't wait 20 minutes to find out they broke a test.

```
Ideal pipeline stages:
  Lint + type check    → < 1 minute  (fast fail, obvious errors)
  Unit tests           → < 2 minutes (isolated, parallelized)
  Integration tests    → < 5 minutes (with real DB via service containers)
  Build                → < 3 minutes (production artifact)
  E2E tests            → < 10 minutes (critical paths only, parallelized)
  Deploy staging       → < 5 minutes (auto on main branch)
  Deploy production    → manual gate or scheduled
```

---

## GitHub Actions — Complete Pipeline

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true  # cancel previous run when new commit pushed

env:
  NODE_VERSION: '20'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  quality:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  test-unit:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '${{ env.NODE_VERSION }}', cache: npm }
      - run: npm ci
      - run: npm run test:unit -- --coverage --ci
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  test-integration:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: quality
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
        options: --health-cmd "redis-cli ping" --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '${{ env.NODE_VERSION }}', cache: npm }
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379

  build:
    name: Build Image
    runs-on: ubuntu-latest
    needs: [test-unit, test-integration]
    permissions:
      contents: read
      packages: write
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      image-digest: ${{ steps.build.outputs.digest }}
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=sha-
            type=ref,event=branch
            type=semver,pattern={{version}}
      - uses: docker/build-push-action@v5
        id: build
        with:
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            BUILD_SHA=${{ github.sha }}

  deploy-staging:
    name: Deploy Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: |
          # Update image tag in K8s manifest or call deployment API
          kubectl set image deployment/api api=${{ needs.build.outputs.image-tag }} \
            --namespace=staging
          kubectl rollout status deployment/api --namespace=staging --timeout=5m

  deploy-production:
    name: Deploy Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment:
      name: production
      url: https://myapp.com
    steps:
      - name: Deploy to production
        run: |
          kubectl set image deployment/api api=${{ needs.build.outputs.image-tag }} \
            --namespace=production
          kubectl rollout status deployment/api --namespace=production --timeout=10m
```

---

## Dockerfile Best Practices

```dockerfile
# Multi-stage build — small production image
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Dependencies stage — cached separately
FROM base AS deps
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder
RUN npm ci
COPY . .
RUN npm run build

# Production stage — minimal image
FROM node:20-alpine AS production
WORKDIR /app

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeapp

COPY --from=deps --chown=nodeapp:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeapp:nodejs /app/dist ./dist
COPY --chown=nodeapp:nodejs package.json ./

USER nodeapp

EXPOSE 3000
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

---

## Branch Strategy

```
main        → production-ready code, protected branch
develop     → integration branch for features
feature/*   → individual feature branches
hotfix/*    → emergency fixes branched from main

PR rules:
  - At least 1 approval required
  - All CI checks must pass
  - Squash merge to keep history clean
  - Branch must be up to date with main

Commit convention (enables automatic changelog):
  feat:     new feature
  fix:      bug fix
  chore:    tooling, deps, config
  docs:     documentation only
  refactor: no feature or bug change
  test:     test additions/changes
  perf:     performance improvements
```

---

## Pipeline Checklist

- [ ] Pipeline fails fast (lint/type check before tests)
- [ ] Tests run in parallel across jobs
- [ ] Docker images built with multi-stage (small production image)
- [ ] Secrets stored in GitHub Secrets, never in code
- [ ] Staging deployed automatically on main merge
- [ ] Production deployment requires manual approval
- [ ] `cancel-in-progress: true` to avoid queue buildup
- [ ] Build artifacts cached between steps (npm cache, Docker layer cache)
