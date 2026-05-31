/**
 * @keywords    audit log, event trail, anomaly detection, security monitoring, tamper-proof, SIEM
 * @domain      Security Audit
 * @use-when    Recording, storing, and analyzing security-relevant events: logins, permission changes, data access
 * @not-when    General application logging — use Winston/Pino for that; this is specifically for security auditing
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditEventSeverity = "info" | "warning" | "critical";
export type AuditEventCategory =
  | "auth"          // Login, logout, token refresh
  | "authz"         // Permission grants, denials
  | "data-access"   // Read/write of sensitive records
  | "data-mutation" // Create, update, delete of records
  | "admin"         // Configuration changes, user management
  | "security"      // Suspicious activity, failed validations
  | "system";       // System-level events

export interface AuditEvent {
  id: string;
  timestamp: number;         // Unix ms
  category: AuditEventCategory;
  action: string;            // e.g., "user.login", "record.delete"
  severity: AuditEventSeverity;
  actorId?: string;          // Who performed the action (userId, serviceId)
  actorIp?: string;
  resourceType?: string;     // "user" | "order" | "payment" etc.
  resourceId?: string;
  outcome: "success" | "failure" | "blocked";
  metadata: Record<string, unknown>;
  checksum?: string;         // HMAC checksum for tamper detection
}

export interface AnomalyDetectionConfig {
  maxEventsPerMinute?: number;  // Rate limit per actor
  maxFailuresBeforeAlert?: number;
  suspiciousIPs?: Set<string>;
  suspiciousActions?: Set<string>;
  offHoursStart?: number;       // UTC hour (0–23)
  offHoursEnd?: number;
}

export interface AnomalyResult {
  eventId: string;
  anomalyType: string;
  severity: AuditEventSeverity;
  description: string;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export class AuditLog {
  private events: AuditEvent[] = [];
  private maxEvents: number;
  private hmacKey?: string;  // Secret for checksum computation

  constructor(maxEvents = 100_000, hmacKey?: string) {
    this.maxEvents = maxEvents;
    this.hmacKey = hmacKey;
  }

  record(event: Omit<AuditEvent, "id" | "timestamp" | "checksum">): AuditEvent {
    const full: AuditEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    if (this.hmacKey) {
      full.checksum = this.computeChecksum(full);
    }

    this.events.push(full);

    // Circular buffer: drop oldest events when at capacity
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    return full;
  }

  /** Verify event integrity (tamper detection) */
  verify(event: AuditEvent): boolean {
    if (!this.hmacKey || !event.checksum) return true; // No checksum = no verification
    const expected = this.computeChecksum({ ...event, checksum: undefined });
    return event.checksum === expected;
  }

  query(filters: {
    actorId?: string;
    category?: AuditEventCategory;
    severity?: AuditEventSeverity;
    outcome?: AuditEvent["outcome"];
    resourceType?: string;
    resourceId?: string;
    fromMs?: number;
    toMs?: number;
    action?: string;
    limit?: number;
  }): AuditEvent[] {
    let results = this.events;

    if (filters.actorId)     results = results.filter((e) => e.actorId === filters.actorId);
    if (filters.category)    results = results.filter((e) => e.category === filters.category);
    if (filters.severity)    results = results.filter((e) => e.severity === filters.severity);
    if (filters.outcome)     results = results.filter((e) => e.outcome === filters.outcome);
    if (filters.resourceType) results = results.filter((e) => e.resourceType === filters.resourceType);
    if (filters.resourceId)  results = results.filter((e) => e.resourceId === filters.resourceId);
    if (filters.fromMs)      results = results.filter((e) => e.timestamp >= filters.fromMs!);
    if (filters.toMs)        results = results.filter((e) => e.timestamp <= filters.toMs!);
    if (filters.action)      results = results.filter((e) => e.action.includes(filters.action!));

    results = results.sort((a, b) => b.timestamp - a.timestamp);
    if (filters.limit)       results = results.slice(0, filters.limit);

    return results;
  }

  get all(): readonly AuditEvent[] { return this.events; }
  get size(): number { return this.events.length; }

  private computeChecksum(event: Omit<AuditEvent, "checksum">): string {
    // Simple deterministic hash using event fields (production: use HMAC-SHA256 via Web Crypto)
    const str = JSON.stringify({ id: event.id, timestamp: event.timestamp, action: event.action, actorId: event.actorId, outcome: event.outcome }) + (this.hmacKey ?? "");
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(16);
  }
}

// ─── Anomaly Detector ──────────────────────────────────────────────────────────

export class AnomalyDetector {
  private config: Required<AnomalyDetectionConfig>;
  private actorEventCounts: Map<string, number[]> = new Map(); // actorId → timestamps
  private actorFailures: Map<string, number> = new Map();

  constructor(config: AnomalyDetectionConfig = {}) {
    this.config = {
      maxEventsPerMinute:    config.maxEventsPerMinute    ?? 60,
      maxFailuresBeforeAlert: config.maxFailuresBeforeAlert ?? 5,
      suspiciousIPs:         config.suspiciousIPs         ?? new Set(),
      suspiciousActions:     config.suspiciousActions     ?? new Set(["user.delete", "admin.grant", "export.all"]),
      offHoursStart:         config.offHoursStart         ?? 22, // 10pm UTC
      offHoursEnd:           config.offHoursEnd           ?? 6,  // 6am UTC
    };
  }

  analyze(event: AuditEvent): AnomalyResult[] {
    const anomalies: AnomalyResult[] = [];

    // Rate limiting per actor
    if (event.actorId) {
      const times = this.actorEventCounts.get(event.actorId) ?? [];
      const oneMinuteAgo = Date.now() - 60_000;
      const recent = times.filter((t) => t > oneMinuteAgo);
      recent.push(event.timestamp);
      this.actorEventCounts.set(event.actorId, recent);

      if (recent.length > this.config.maxEventsPerMinute) {
        anomalies.push({
          eventId: event.id,
          anomalyType: "rate-limit",
          severity: "warning",
          description: `Actor ${event.actorId} exceeded ${this.config.maxEventsPerMinute} events/minute (${recent.length} events)`,
        });
      }
    }

    // Repeated failures
    if (event.outcome === "failure" && event.actorId) {
      const failures = (this.actorFailures.get(event.actorId) ?? 0) + 1;
      this.actorFailures.set(event.actorId, failures);

      if (failures >= this.config.maxFailuresBeforeAlert) {
        anomalies.push({
          eventId: event.id,
          anomalyType: "repeated-failure",
          severity: failures >= this.config.maxFailuresBeforeAlert * 2 ? "critical" : "warning",
          description: `Actor ${event.actorId} has ${failures} consecutive failures on action "${event.action}"`,
        });
      }
    } else if (event.outcome === "success" && event.actorId) {
      this.actorFailures.delete(event.actorId); // Reset on success
    }

    // Suspicious IP
    if (event.actorIp && this.config.suspiciousIPs.has(event.actorIp)) {
      anomalies.push({
        eventId: event.id,
        anomalyType: "suspicious-ip",
        severity: "critical",
        description: `Event from known suspicious IP: ${event.actorIp}`,
      });
    }

    // Suspicious action
    if (this.config.suspiciousActions.has(event.action)) {
      anomalies.push({
        eventId: event.id,
        anomalyType: "sensitive-action",
        severity: "warning",
        description: `High-sensitivity action performed: "${event.action}"`,
      });
    }

    // Off-hours activity
    const hour = new Date(event.timestamp).getUTCHours();
    const isOffHours = this.config.offHoursStart > this.config.offHoursEnd
      ? hour >= this.config.offHoursStart || hour < this.config.offHoursEnd
      : hour >= this.config.offHoursStart && hour < this.config.offHoursEnd;

    if (isOffHours && event.category === "admin") {
      anomalies.push({
        eventId: event.id,
        anomalyType: "off-hours-admin",
        severity: "warning",
        description: `Admin action performed at off-hours (UTC ${hour}:00): "${event.action}"`,
      });
    }

    return anomalies;
  }

  reset(actorId: string): void {
    this.actorEventCounts.delete(actorId);
    this.actorFailures.delete(actorId);
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createAuditLog(maxEvents?: number, hmacKey?: string): AuditLog {
  return new AuditLog(maxEvents, hmacKey);
}

export function createAnomalyDetector(config?: AnomalyDetectionConfig): AnomalyDetector {
  return new AnomalyDetector(config);
}

/*
 * Usage Example:
 *
 * const log = createAuditLog(50_000, process.env.AUDIT_HMAC_KEY);
 * const detector = createAnomalyDetector({ maxFailuresBeforeAlert: 3 });
 *
 * function recordEvent(event: Omit<AuditEvent, "id" | "timestamp" | "checksum">) {
 *   const recorded = log.record(event);
 *   const anomalies = detector.analyze(recorded);
 *   if (anomalies.some((a) => a.severity === "critical")) {
 *     alertTeam(anomalies);
 *   }
 *   return recorded;
 * }
 *
 * recordEvent({
 *   category: "auth",
 *   action: "user.login",
 *   severity: "info",
 *   actorId: "user-42",
 *   actorIp: "192.168.1.1",
 *   outcome: "failure",
 *   metadata: { reason: "invalid_password" },
 * });
 *
 * // Query all auth failures in last hour
 * const failures = log.query({ category: "auth", outcome: "failure", fromMs: Date.now() - 3_600_000 });
 */
