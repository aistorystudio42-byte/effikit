<!-- @keywords: logs, log analysis, error log, stack trace, crash report, server log, parse log -->
<!-- @domain: Log Analysis Prompts -->

# Log Analysis Prompts

## Server Error Log Analysis

```
Analyze these server logs and find the root cause of the errors.

**Log format:** [JSON / plain text / structured]
**Time range:** [start] → [end]
**Environment:** [production / staging]

**Logs:**
[paste log output]

**Analysis I need:**
1. Primary error: most frequent error type, first occurrence, trigger
2. Error cascade: did the primary error cause secondary errors?
3. Timeline: reconstruct the sequence of events leading to failure
4. Affected scope: how many users/requests were impacted?
5. Recovery: did the system recover? When?
6. Prevention: what would catch this earlier (alert, circuit breaker, validation)?

**Format your response as:**
- Root cause: [one sentence]
- Timeline: [ordered list]
- Impact estimate: [N requests / N users / N minutes]
- Fix: [specific code or config change]
```

---

## Database Query Log Analysis

```
Analyze these slow query logs.

**Database:** [PostgreSQL / MySQL / MongoDB]
**Slow query threshold:** [X ms]

**Logs / EXPLAIN ANALYZE output:**
[paste query logs or EXPLAIN output]

**For each slow query:**
1. What is the query doing? (SELECT / JOIN / aggregate / subquery)
2. Why is it slow? (seq scan / missing index / row estimate off / huge result set)
3. Evidence from EXPLAIN: which node has the highest actual vs estimate mismatch?
4. Fix: specific index to add, query to rewrite, or data model to change
5. Expected improvement: from X ms to Y ms (estimate)

**Also check:**
- Are any queries running N+1? (same query repeated with different IDs)
- Are any queries doing full table scans on large tables?
- Are any joins producing unexpectedly large intermediate result sets?
```

---

## Frontend Console Error Analysis

```
Analyze these browser console errors.

**Browser:** [Chrome / Firefox / Safari]
**Framework:** [Next.js / React / Vue]
**User action that triggers them:** [page load / button click / scroll / form submit]

**Console output:**
[paste console errors, warnings, network errors]

**Classify each error:**
- Type: [React error / network / CORS / hydration / unhandled promise / other]
- Severity: [blocks functionality / visual glitch / irrelevant warning]
- Source: [which component / API call / library]
- Fix: [specific change needed]

**Priority order:**
List fixes from most impactful (breaks user flow) to least (cosmetic warning).

**Ignore:**
Browser extension errors, third-party analytics errors (unless I listed them as relevant).
```

---

## Crash Report Analysis

```
Analyze this crash report and tell me what happened.

**Platform:** [iOS / Android / Web / Node.js / Electron]
**Crash report:**
[paste crash report / minidump / Sentry event / CloudWatch alarm]

**App version:** [version number]
**Frequency:** [N crashes in last 24h / affects X% of users]

**I need:**
1. Crash type: [null ref / stack overflow / OOM / uncaught exception / assertion]
2. The specific line that crashed (after symbolication if needed)
3. Was there preceding unusual activity in the trace? (memory spike, long loop)
4. Is this a known pattern? (Describe if so)
5. Reproduction path: steps most likely to trigger it
6. Fix: specific code change + defensive measure to prevent recurrence

**Code context:**
[paste the module/function mentioned in the crash report]
```

---

## Log Pattern Detection

```
Search these logs for anomalies and patterns I should know about.

**Logs:**
[paste log sample — ideally 100+ lines]

**What to look for:**
- Error spike: sudden increase in error rate at a specific time
- Latency anomaly: requests taking 10× longer than baseline
- Repeated failure: same error from same source N times
- Security events: failed auth, unusual IPs, rate limit hits
- Data anomaly: values outside expected range (negative counts, future dates)
- Dependency issues: timeouts to external services

**Output format:**
For each anomaly found:
- Pattern: [what you observed]
- Timestamp / count: [when / how often]
- Likely cause: [hypothesis]
- Action: [investigate X / alert on Y / fix Z]

Sort by: severity (P1 → P3)
```
