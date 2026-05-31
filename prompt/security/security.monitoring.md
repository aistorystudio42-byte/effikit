<!-- @keywords: security monitoring, audit log, anomaly detection, intrusion detection, alerting, SIEM, log analysis -->
<!-- @domain: Security Monitoring Prompts -->

# Security Monitoring Prompts

## Audit Logging System

```
Design and implement an audit logging system for: [application]

**Events to audit:**
- Authentication: login success/failure, logout, password change, MFA enable/disable
- Authorization: permission denied, privilege escalation attempts
- Data access: read of sensitive data (PII, financial), bulk exports
- Data modification: create/update/delete of important resources
- Admin actions: user management, config changes, role assignments
- Security events: rate limit hit, suspicious patterns, lockouts

**Log entry structure:**
```typescript
interface AuditEvent {
  id: string;              // UUID
  timestamp: Date;         // ISO8601 — always UTC
  eventType: AuditEventType;
  
  actor: {
    userId: string | null;
    email: string | null;
    role: string | null;
    ip: string;            // from X-Forwarded-For (trust proxy)
    userAgent: string;
  };
  
  resource: {
    type: string;          // 'User' | 'Post' | 'Order' etc.
    id: string | null;
    name: string | null;   // human-readable identifier
  };
  
  action: 'create' | 'read' | 'update' | 'delete' | 'auth' | 'admin';
  outcome: 'success' | 'failure' | 'blocked';
  
  changes?: {              // for update events — what changed
    field: string;
    before: unknown;       // avoid logging sensitive values
    after: unknown;
  }[];
  
  metadata: Record<string, unknown>; // event-specific extra context
}
```

**Storage:**
- Write to a separate `audit_logs` table (not same table as app data)
- This table should be append-only (no UPDATE, no DELETE)
- Retention: 90 days hot, 7 years cold (compliance requirement varies)

**Implementation:**
```typescript
async function audit(event: Omit<AuditEvent, 'id' | 'timestamp'>) {
  await db.auditLog.create({
    data: {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      // Never log: passwords, tokens, card numbers
    },
  });
}

// Middleware usage
app.use('/api/admin', (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    audit({
      eventType: 'ADMIN_ACTION',
      actor: { userId: req.user.id, ... },
      resource: { type: 'AdminAction', id: null, name: req.path },
      action: 'admin',
      outcome: res.statusCode < 400 ? 'success' : 'failure',
    });
    return originalJson(data);
  };
  next();
});
```

Build for: [your specific events and compliance requirements].
```

---

## Anomaly Detection Rules

```
Design anomaly detection rules for: [application]

**Threat scenarios to detect:**

**1. Credential stuffing / brute force:**
Rule: >10 failed logins to same account within 10 minutes
Alert: lock account, notify user, alert security team
```sql
SELECT user_id, COUNT(*) as failures, MIN(created_at) as first_failure
FROM audit_logs
WHERE event_type = 'LOGIN_FAILURE'
AND created_at > NOW() - INTERVAL '10 minutes'
GROUP BY user_id
HAVING COUNT(*) >= 10;
```

**2. Account takeover pattern:**
Rule: login from new country + immediate bulk data access
Alert: require re-authentication, flag for review
```sql
SELECT al.user_id, al.ip, al.metadata->>'country' as country
FROM audit_logs al
WHERE al.event_type = 'LOGIN_SUCCESS'
AND al.metadata->>'country' NOT IN (
  SELECT DISTINCT metadata->>'country'
  FROM audit_logs
  WHERE user_id = al.user_id
  AND event_type = 'LOGIN_SUCCESS'
  AND created_at < al.created_at - INTERVAL '30 days'
)
AND created_at > NOW() - INTERVAL '1 hour';
```

**3. Data exfiltration:**
Rule: single user downloads >N records within Y minutes
Alert: flag account, notify security team

**4. Privilege escalation attempt:**
Rule: user calls admin endpoint more than 3 times and receives 403
Alert: flag account for review

**5. Unusual hour access:**
Rule: user (non-API) accesses system between 2am-6am local time (unusual for their pattern)
Alert: send verification email to user

For each rule: SQL or code + alerting action + tuning guidance to reduce false positives.
```

---

## Security Alerting Setup

```
Design a security alerting system for: [application]

**Alert channels:**
- P1 (critical — respond in 15 min): [PagerDuty / phone / SMS]
- P2 (high — respond in 1 hour): [Slack #security-alerts]
- P3 (medium — respond in 24h): [email / ticketing system]
- P4 (low — weekly review): [dashboard / report]

**P1 Alerts — immediate response:**
- [ ] Active brute force attack on login (>100 attempts/minute)
- [ ] Successful login from impossible location (two logins 1h apart from NYC and Tokyo)
- [ ] Admin account compromised (admin login + immediately changes other admin's password)
- [ ] Data breach indicators (mass SELECT * on user table from non-admin)
- [ ] Critical vulnerability CVE published for a library we use

**P2 Alerts — investigate within 1 hour:**
- [ ] Account lockout rate spike (>10x baseline in 5 minutes)
- [ ] API error rate spike (>5% 5xx in 5 minutes)
- [ ] Unusual bulk data export by a single user
- [ ] New admin account created outside of change window

**P3 Alerts — investigate within 24 hours:**
- [ ] [N] failed password resets to same email address
- [ ] New dependency with known CVE in pull request
- [ ] SSL certificate expires in 30 days

**Alert implementation (Slack webhook):**
```typescript
async function sendSecurityAlert(
  severity: 'P1' | 'P2' | 'P3',
  title: string,
  details: Record<string, string>
) {
  const webhookUrl = process.env.SECURITY_SLACK_WEBHOOK!;
  const colors = { P1: '#FF0000', P2: '#FF8C00', P3: '#FFD700' };
  
  await fetch(webhookUrl, {
    method: 'POST',
    body: JSON.stringify({
      attachments: [{
        color: colors[severity],
        title: `[${severity}] ${title}`,
        fields: Object.entries(details).map(([k, v]) => ({ 
          title: k, value: v, short: true 
        })),
        footer: `Security Alert • ${new Date().toISOString()}`,
      }],
    }),
  });
}
```

Build for: [your specific threat scenarios and team structure].
```

---

## Rate Limit & Abuse Detection

```
Implement multi-layer abuse detection for: [API / application]

**Abuse patterns to detect:**

**Layer 1 — Per-IP rate limiting (nginx/edge):**
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

location /api/ {
    limit_req zone=api burst=10 nodelay;
    limit_req_status 429;
}

location /api/auth/ {
    limit_req zone=auth burst=3 nodelay;
}
```

**Layer 2 — Per-user rate limiting (application):**
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 req/min per user
  analytics: true,
});

// In your API middleware
const identifier = req.user?.id ?? req.ip;
const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

if (!success) {
  return Response.json(
    { error: 'Rate limit exceeded' },
    { 
      status: 429,
      headers: {
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(reset),
        'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
      }
    }
  );
}
```

**Layer 3 — Behavioral detection:**
- Same action repeated >N times (not just rate, but pattern)
- Accounts created in sequence (registration farms)
- Shared fingerprint across many accounts

Build for: [your specific abuse patterns and infrastructure].
```

---

## Dependency Security Monitoring

```
Set up continuous dependency vulnerability monitoring.

**Automated scanning:**

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
  schedule:
    - cron: '0 8 * * 1'  # every Monday at 8am UTC

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: npm audit
        run: npm audit --audit-level=high
        # Fails CI if HIGH or CRITICAL vulnerabilities found
        
      - name: Check for updates
        run: npx npm-check-updates --errorLevel 2 --target minor
        # Warn if minor updates are available
        
      - name: Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

**Weekly report generation:**
```typescript
// Run weekly via cron job
async function weeklySecurityReport() {
  const { vulnerabilities } = await runNpmAudit();
  const critical = vulnerabilities.filter(v => v.severity === 'critical');
  const high = vulnerabilities.filter(v => v.severity === 'high');
  
  if (critical.length > 0 || high.length > 0) {
    await sendSecurityAlert('P2', 'Dependency vulnerabilities found', {
      'Critical': String(critical.length),
      'High': String(high.length),
      'Details': critical.concat(high).map(v => v.name).join(', '),
    });
  }
}
```

**Policy:**
- HIGH/CRITICAL: block merge until resolved
- MODERATE: create ticket, fix within 30 days
- LOW: fix in quarterly maintenance
```
