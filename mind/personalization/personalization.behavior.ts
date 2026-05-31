/**
 * @keywords    behavior tracking, user pattern, session analysis, engagement sequence, behavioral signal
 * @domain      Personalization Behavior
 * @use-when    Tracking and analyzing user behavior patterns: sessions, sequences, engagement rhythm
 * @not-when    You need full analytics pipeline — this is lightweight in-memory behavioral analysis
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventType = "pageview" | "click" | "scroll" | "search" | "purchase" | "share" | "exit" | string;

export interface BehaviorEvent {
  userId: string;
  sessionId: string;
  eventType: EventType;
  target?: string;       // Item ID, URL, or element identifier
  timestamp: number;     // Unix ms
  duration?: number;     // Ms spent on this action
  metadata?: Record<string, unknown>;
}

export interface Session {
  sessionId: string;
  userId: string;
  startTime: number;
  endTime: number;
  events: BehaviorEvent[];
  pageviews: number;
  totalDurationMs: number;
  entryPoint?: string;
  exitPoint?: string;
}

export interface BehaviorPattern {
  userId: string;
  sessionsAnalyzed: number;
  avgSessionDurationMs: number;
  avgPageviewsPerSession: number;
  topActions: Array<{ eventType: EventType; count: number; ratio: number }>;
  peakActivityHours: number[];         // UTC hours with most activity
  typicalSessionIntervalMs: number;    // Average time between sessions
  sequences: SequencePattern[];        // Common event sequences
  engagementScore: number;             // 0–1 composite engagement
}

export interface SequencePattern {
  events: EventType[];
  frequency: number;
  confidence: number;
}

// ─── Session Aggregator ───────────────────────────────────────────────────────

export class SessionAggregator {
  private sessionTimeout: number; // Ms of inactivity to close a session

  constructor(sessionTimeoutMs = 30 * 60_000) { // 30 min default
    this.sessionTimeout = sessionTimeoutMs;
  }

  buildSessions(events: BehaviorEvent[]): Session[] {
    if (events.length === 0) return [];

    const bySession = new Map<string, BehaviorEvent[]>();
    for (const event of events) {
      if (!bySession.has(event.sessionId)) bySession.set(event.sessionId, []);
      bySession.get(event.sessionId)!.push(event);
    }

    const sessions: Session[] = [];
    for (const [sessionId, sessionEvents] of bySession) {
      const sorted = [...sessionEvents].sort((a, b) => a.timestamp - b.timestamp);
      const pageviews = sorted.filter((e) => e.eventType === "pageview").length;
      const startTime = sorted[0].timestamp;
      const endTime   = sorted[sorted.length - 1].timestamp;

      sessions.push({
        sessionId,
        userId: sorted[0].userId,
        startTime,
        endTime,
        events: sorted,
        pageviews,
        totalDurationMs: endTime - startTime,
        entryPoint: sorted.find((e) => e.eventType === "pageview")?.target,
        exitPoint: [...sorted].reverse().find((e) => e.eventType === "pageview")?.target,
      });
    }

    return sessions.sort((a, b) => a.startTime - b.startTime);
  }
}

// ─── Sequence Mining (PrefixSpan-inspired) ────────────────────────────────────
// Finds frequent sequential patterns in event streams

export function mineSequences(
  sessions: Session[],
  minSupport = 0.1,   // Minimum fraction of sessions containing the sequence
  maxLen = 3
): SequencePattern[] {
  const sessionCount = sessions.length;
  if (sessionCount === 0) return [];

  // Build single-event candidates
  const singleCounts = new Map<EventType, number>();
  for (const session of sessions) {
    const seen = new Set<EventType>();
    for (const event of session.events) {
      if (!seen.has(event.eventType)) {
        singleCounts.set(event.eventType, (singleCounts.get(event.eventType) ?? 0) + 1);
        seen.add(event.eventType);
      }
    }
  }

  const frequent: SequencePattern[] = [];
  const candidates = [...singleCounts.entries()]
    .filter(([, count]) => count / sessionCount >= minSupport)
    .map(([et, count]) => ({
      events: [et],
      frequency: count,
      confidence: count / sessionCount,
    }));

  frequent.push(...candidates);

  // Grow sequences
  let currentLevel = candidates;
  for (let len = 2; len <= maxLen; len++) {
    const nextLevel: SequencePattern[] = [];

    for (const pattern of currentLevel) {
      for (const [et] of singleCounts) {
        const candidate = [...pattern.events, et];
        let matchCount = 0;

        for (const session of sessions) {
          if (containsSequence(session.events.map((e) => e.eventType), candidate)) {
            matchCount++;
          }
        }

        if (matchCount / sessionCount >= minSupport) {
          const seq: SequencePattern = {
            events: candidate,
            frequency: matchCount,
            confidence: matchCount / sessionCount,
          };
          nextLevel.push(seq);
          frequent.push(seq);
        }
      }
    }

    currentLevel = nextLevel;
    if (currentLevel.length === 0) break;
  }

  return frequent.sort((a, b) => b.confidence - a.confidence);
}

function containsSequence(events: EventType[], pattern: EventType[]): boolean {
  let pi = 0;
  for (const event of events) {
    if (event === pattern[pi]) pi++;
    if (pi === pattern.length) return true;
  }
  return false;
}

// ─── BehaviorAnalyzer ─────────────────────────────────────────────────────────

export class BehaviorAnalyzer {
  private aggregator: SessionAggregator;

  constructor(sessionTimeoutMs?: number) {
    this.aggregator = new SessionAggregator(sessionTimeoutMs);
  }

  analyze(userId: string, events: BehaviorEvent[]): BehaviorPattern {
    const userEvents = events.filter((e) => e.userId === userId);
    const sessions   = this.aggregator.buildSessions(userEvents);

    if (sessions.length === 0) {
      return this.emptyPattern(userId);
    }

    // Session-level stats
    const avgDuration  = sessions.reduce((s, sess) => s + sess.totalDurationMs, 0) / sessions.length;
    const avgPageviews = sessions.reduce((s, sess) => s + sess.pageviews, 0) / sessions.length;

    // Event type distribution
    const typeCounts = new Map<EventType, number>();
    let totalEvents = 0;
    for (const session of sessions) {
      for (const event of session.events) {
        typeCounts.set(event.eventType, (typeCounts.get(event.eventType) ?? 0) + 1);
        totalEvents++;
      }
    }
    const topActions = [...typeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([et, count]) => ({ eventType: et, count, ratio: count / totalEvents }));

    // Peak activity hours (UTC)
    const hourCounts = new Array(24).fill(0);
    for (const event of userEvents) {
      hourCounts[new Date(event.timestamp).getUTCHours()]++;
    }
    const maxHourCount = Math.max(...hourCounts);
    const peakActivityHours = maxHourCount === 0 ? [] : hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter((h) => h.count >= maxHourCount * 0.7)
      .map((h) => h.hour);

    // Typical session interval
    let typicalInterval = 0;
    if (sessions.length > 1) {
      const intervals = sessions.slice(1).map((s, i) => Math.max(0, s.startTime - sessions[i].endTime));
      typicalInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length;
    }

    // Sequence mining
    const sequences = mineSequences(sessions, 0.2, 3);

    // Composite engagement score
    const recencyDays = (Date.now() - sessions[sessions.length - 1].endTime) / 86_400_000;
    const recencyScore = Math.exp(-recencyDays / 7); // Decays over 7 days
    const depthScore   = Math.min(avgPageviews / 5, 1);
    const returnScore  = Math.min(sessions.length / 10, 1);
    const engagementScore = (recencyScore * 0.4 + depthScore * 0.3 + returnScore * 0.3);

    return {
      userId,
      sessionsAnalyzed: sessions.length,
      avgSessionDurationMs: avgDuration,
      avgPageviewsPerSession: avgPageviews,
      topActions,
      peakActivityHours,
      typicalSessionIntervalMs: typicalInterval,
      sequences,
      engagementScore,
    };
  }

  private emptyPattern(userId: string): BehaviorPattern {
    return {
      userId, sessionsAnalyzed: 0, avgSessionDurationMs: 0,
      avgPageviewsPerSession: 0, topActions: [], peakActivityHours: [],
      typicalSessionIntervalMs: 0, sequences: [], engagementScore: 0,
    };
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createBehaviorAnalyzer(sessionTimeoutMs?: number): BehaviorAnalyzer {
  return new BehaviorAnalyzer(sessionTimeoutMs);
}

/*
 * Usage Example:
 *
 * const analyzer = createBehaviorAnalyzer();
 * const pattern = analyzer.analyze("user-42", allEvents);
 *
 * console.log(pattern.engagementScore);     // 0–1 composite score
 * console.log(pattern.peakActivityHours);   // e.g., [9, 10, 14, 20]
 * console.log(pattern.sequences[0]);        // Most common event sequence
 * // { events: ["pageview", "click", "share"], frequency: 12, confidence: 0.4 }
 */
