<!-- @keywords: infrastructure, IaC, Terraform, environment, secrets, scaling, load balancing, cloud -->

# DevOps — Infrastructure and Environment Management

## Infrastructure as Code

Infrastructure defined in code is reproducible, reviewable, and version-controlled. Manual click-ops creates snowflake environments that are impossible to recreate or audit.

---

## Terraform Patterns

```hcl
# main.tf — production infrastructure
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket = "myapp-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
    encrypt = true
    dynamodb_table = "terraform-state-lock"  # prevent concurrent applies
  }
}

# Variables — never hardcode, always parameterize
variable "environment" {
  type        = string
  description = "Deployment environment (staging | production)"
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be staging or production."
  }
}

variable "instance_count" {
  type    = number
  default = 2
}

# Resources
resource "aws_ecs_service" "api" {
  name            = "${var.environment}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.instance_count

  deployment_circuit_breaker {
    enable   = true
    rollback = true   # auto-rollback on deployment failure
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }
}

# Outputs — expose values needed by other modules
output "api_url" {
  value = "https://${aws_lb.main.dns_name}"
}
```

---

## Environment Configuration Strategy

```typescript
// Never hardcode configuration. Hierarchy:
// 1. Process environment (from secrets manager / K8s secrets)
// 2. .env file (local dev only, not committed)
// 3. Defaults (non-sensitive only)

// config/index.ts — single source of truth for config
import { z } from 'zod';

const ConfigSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MAX: z.coerce.number().default(10),

  // Auth
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  // External services
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  REDIS_URL: z.string().url(),

  // Feature flags
  ENABLE_EXPERIMENTAL_FEATURES: z.coerce.boolean().default(false),
});

// Validate at startup — fail fast with clear error if misconfigured
function loadConfig() {
  const result = ConfigSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Configuration error:');
    result.error.issues.forEach(issue => {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
```

---

## Secrets Management

```bash
# Development: .env file (local only)
# .env.example is committed as a template
# .env is in .gitignore

# Staging/Production: AWS Secrets Manager or HashiCorp Vault
# Inject at container start:

# Kubernetes secret (base64 encoded)
kubectl create secret generic api-secrets \
  --from-literal=JWT_ACCESS_SECRET=$(openssl rand -hex 32) \
  --from-literal=DATABASE_URL="postgresql://..." \
  --namespace=production

# Reference in deployment
env:
  - name: JWT_ACCESS_SECRET
    valueFrom:
      secretKeyRef:
        name: api-secrets
        key: JWT_ACCESS_SECRET
```

---

## Zero-Downtime Deployment

```yaml
# Kubernetes rolling update strategy
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # one extra pod during update
      maxUnavailable: 0  # never reduce below desired count
  template:
    spec:
      containers:
        - name: api
          image: myapp:sha-abc123
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
          lifecycle:
            preStop:
              exec:
                # Wait for in-flight requests before stopping
                command: ["/bin/sh", "-c", "sleep 15"]
```

```typescript
// Graceful shutdown — don't drop in-flight requests
const server = app.listen(config.PORT);

let isShuttingDown = false;

// Readiness probe returns 503 during shutdown
app.get('/ready', (req, res) => {
  if (isShuttingDown) return res.status(503).json({ ready: false });
  res.json({ ready: true });
});

async function gracefulShutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully`);
  isShuttingDown = true;

  // Stop accepting new connections
  server.close(async () => {
    await db.pool.end();
    await redis.quit();
    console.log('Shutdown complete');
    process.exit(0);
  });

  // Force exit after 30 seconds
  setTimeout(() => { console.error('Forced shutdown'); process.exit(1); }, 30_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

---

## Resource Limits

```yaml
# Kubernetes: always set resource requests and limits
containers:
  - name: api
    resources:
      requests:
        memory: "256Mi"   # guaranteed allocation
        cpu: "250m"       # 0.25 CPU cores guaranteed
      limits:
        memory: "512Mi"   # hard cap — OOMKilled if exceeded
        cpu: "1000m"      # 1 CPU core max (can be throttled)

# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70   # scale up when CPU > 70%
```

---

## Infrastructure Checklist

- [ ] Infrastructure defined in Terraform / Pulumi (no manual click-ops)
- [ ] State stored remotely with locking (S3 + DynamoDB)
- [ ] Secrets injected at runtime (not in image or code)
- [ ] Config validated at startup (fail fast on missing/invalid config)
- [ ] Zero-downtime deployments via rolling update + readiness probe
- [ ] Graceful shutdown handles in-flight requests
- [ ] Resource limits set on all containers
- [ ] HPA configured for traffic-variable services
- [ ] Separate secrets per environment (staging can't read production secrets)
