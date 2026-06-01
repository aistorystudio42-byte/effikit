<!-- @keywords: Docker, containers, docker-compose, Kubernetes, orchestration, environment, deployment -->

# Kubernetes probes

## Core Philosophy

Containers solve "works on my machine" — the runtime environment is packaged with the code. Every environment (local, staging, production) runs the same image. Differences between environments come only from configuration, not from installed software.

---

## When to Activate

> This skill should be activated when you need to resolve issues related to docker.

## Principles

### Docker Compose for Local Development
```yaml
version: '3.9'

services:
  api:
    build:
      context: .
      target: development   # use dev stage with hot reload
    volumes:
      - .:/app              # mount source for hot reload
      - /app/node_modules   # don't override node_modules from image
    ports:
      - '3000:3000'
      - '9229:9229'         # Node.js debugger port
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:postgres@db:5432/myapp
      REDIS_URL: redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: npm run dev

  db:
    image: postgres:16-alpine
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 3s
      retries: 5

  mailhog:
    image: mailhog/mailhog
    ports:
      - '1025:1025'   # SMTP server
      - '8025:8025'   # Web UI to view sent emails

volumes:
  postgres_data:
  redis_data:
```

```yaml
services:
  api:
    environment:
      DEBUG: '*'
      LOG_LEVEL: debug
```

---

### Multi-Target Dockerfile
```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
RUN npm install
COPY . .
EXPOSE 3000 9229
CMD ["npm", "run", "dev"]

FROM development AS test
CMD ["npm", "test"]

FROM base AS builder
RUN npm ci
COPY . .
RUN npm run build && npm prune --production

FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app

COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --chown=app:app package.json ./

USER app
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
```

---

### Container Security
```dockerfile

FROM node:20.11.0-alpine3.19@sha256:abc123... AS base

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

FROM node:20-alpine  # NOT node:20 (2x smaller, fewer vulnerabilities)

```

```
.git
.github
node_modules
.env*
*.log
coverage/
.nyc_output/
dist/
docs/
*.md
.DS_Store
```

---

### Docker Image Optimization
```dockerfile
COPY package*.json ./         # changes rarely → cache hit most of the time
RUN npm ci                    # cached when package.json unchanged
COPY . .                      # changes often → only this layer rebuilds
RUN npm run build
```

```bash
docker images myapp
docker history myapp --format "{{.Size}}\t{{.CreatedBy}}"

docker run --rm -it wagoodman/dive:latest myapp

docker scout cves myapp
trivy image myapp
```

---

### Health Checks and Readiness
```typescript
// Health check endpoint — must respond quickly
// Checks: is the app running and can serve requests?
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness endpoint — checks all dependencies
app.get('/ready', async (req, res) => {
  const checks = await Promise.allSettled([
    db.query('SELECT 1'),           // DB connected
    redis.ping(),                   // Redis connected
  ]);

  const allReady = checks.every(c => c.status === 'fulfilled');

  res.status(allReady ? 200 : 503).json({
    ready: allReady,
    checks: {
      database: checks[0].status,
      redis: checks[1].status,
    },
  });
});
```

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 3
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

- [ ] Multi-stage build (dev/prod stages separate)
- [ ] Non-root user in production image
- [ ] `.dockerignore` excludes `.env`, `node_modules`, `.git`
- [ ] No secrets baked into image (no `ENV SECRET=...`)
- [ ] Health check defined in Dockerfile
- [ ] Base image pinned to specific version (not `latest`)
- [ ] Image scanned for CVEs before deployment (trivy / docker scout)
- [ ] Docker Compose used for local dev with health checks on services
