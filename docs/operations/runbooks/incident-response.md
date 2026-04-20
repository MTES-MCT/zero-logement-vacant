# Incident Response Runbook

> **Severity Levels & Response Times**

| Severity | Definition | Response Time | Examples |
|----------|------------|---------------|----------|
| **P1 - Critical** | Service down, data loss risk | 15 min | App unreachable, DB corruption |
| **P2 - High** | Major feature broken | 1 hour | Auth failing, campaigns broken |
| **P3 - Medium** | Feature degraded | 4 hours | Slow performance, minor bugs |
| **P4 - Low** | Minor issue | 24 hours | UI glitches, non-blocking |

---

## 1. Initial Triage (First 5 minutes)

### Step 1: Identify the Issue

```bash
# Check application status
curl -s https://zerologementvacant.beta.gouv.fr/api | jq .

# Check Clever Cloud status
clever status

# Check recent deployments
clever activity
```

### Step 2: Assess Impact

- [ ] How many users affected?
- [ ] Which features are broken?
- [ ] Is data at risk?
- [ ] When did it start?

### Step 3: Communicate

```
# Slack/Mattermost template
🔴 INCIDENT P[X] - [Brief description]
Impact: [Who/what is affected]
Status: Investigating
Lead: [Your name]
Updates: Every [15/30/60] min
```

---

## 2. Common Incidents

### 2.1 Application Unreachable (P1)

**Symptoms:** 502/503 errors, timeouts

**Diagnosis:**

```bash
# Check app logs
clever logs --before "5 minutes ago"

# Check app restart history
clever activity | head -20

# Check memory/CPU
clever status
```

**Resolution:**

```bash
# Option 1: Restart application
clever restart

# Option 2: Scale up temporarily
clever scale --flavor M  # Increase instance size

# Option 3: Rollback last deployment
clever deploy --force <previous-commit-sha>
```

---

### 2.2 Database Connection Issues (P1)

**Symptoms:** "Connection refused", "too many connections"

**Diagnosis:**

```bash
# Check PostgreSQL addon status
clever addon providers show postgresql-addon

# Check connection count (via psql)
SELECT count(*) FROM pg_stat_activity;
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
```

**Resolution:**

```bash
# Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND query_start < now() - interval '10 minutes';

# Restart app to reset connection pool
clever restart
```

---

### 2.3 Authentication Failures (P2)

**Symptoms:** Users can't log in, 401 errors

**Diagnosis:**

```bash
# Check auth-related logs
clever logs | grep -i "auth\|jwt\|token"

# Verify JWT secret is set
clever env | grep AUTH_SECRET
```

**Resolution:**

```bash
# If secret is missing/wrong
clever env set AUTH_SECRET="<correct-secret>"
clever restart
```

---

### 2.4 Redis Connection Issues (P2)

**Symptoms:** Queue jobs failing, session issues

**Diagnosis:**

```bash
# Check Redis addon
clever addon providers show redis-addon

# Test connection
redis-cli -u $REDIS_URL ping
```

**Resolution:**

```bash
# Restart Redis addon (via Clever Cloud console)
# Or restart app
clever restart
```

---

### 2.5 High Memory Usage (P2/P3)

**Symptoms:** OOM kills, slow response

**Diagnosis:**

```bash
# Check memory usage in logs
clever logs | grep -i "memory\|heap\|oom"

# Check current metrics
clever status
```

**Resolution:**

```bash
# Scale up instance
clever scale --flavor L

# Or restart to clear memory
clever restart

# Long-term: investigate memory leaks
```

---

### 2.6 Slow API Response (P3)

**Symptoms:** Response time > 2s

**Diagnosis:**

```bash
# Check slow queries in PostgreSQL
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '1 second';
```

**Resolution:**

```bash
# Kill long-running queries
SELECT pg_terminate_backend(<pid>);

# Check for missing indexes
EXPLAIN ANALYZE <slow-query>;

# Add index if needed
CREATE INDEX CONCURRENTLY idx_name ON table(column);
```

---

### 2.7 Cerema Sync Failures (P3)

**Symptoms:** Users/establishments not syncing

**Diagnosis:**

```bash
# Check cron logs
clever logs | grep cerema

# Check state files
cat server/src/scripts/perimeters-portaildf/01-cerema-scraper/api_*_state.json
```

**Resolution:**

```bash
# Reset and retry manually
cd server/src/scripts/perimeters-portaildf
rm -f 01-cerema-scraper/api_*_state.json
./cerema-sync.sh
```

---

### 2.8 Email Delivery Issues (P3)

**Symptoms:** Password reset emails not received

**Diagnosis:**

```bash
# Check Brevo dashboard for bounces/blocks
# Check logs
clever logs | grep -i "brevo\|mail\|email"
```

**Resolution:**

- Check Brevo API key validity
- Verify sender domain DNS (SPF, DKIM)
- Check recipient email validity

---

## 3. Post-Incident

### Step 1: Verify Resolution

```bash
# Health check
curl -s https://zerologementvacant.beta.gouv.fr/api | jq .

# Check error rates in Sentry
# Verify key user flows manually
```

### Step 2: Communicate Resolution

```
# Slack template
✅ INCIDENT RESOLVED - [Brief description]
Duration: [X] hours [Y] minutes
Root cause: [Brief explanation]
Resolution: [What was done]
Follow-up: [Any pending actions]
```

### Step 3: Post-Mortem (P1/P2 only)

Create a document with:

1. **Timeline:** What happened when
2. **Impact:** Users/data affected
3. **Root Cause:** Why it happened
4. **Resolution:** How it was fixed
5. **Action Items:** Prevent recurrence

---

## 4. Emergency Contacts

| Role | Contact | When to Escalate |
|------|---------|------------------|
| On-call Dev | [Slack/Phone] | P1/P2 incidents |
| Tech Lead | [Slack/Phone] | P1 or data loss |
| Clever Cloud Support | support@clever-cloud.com | Infrastructure issues |
| Brevo Support | [Dashboard] | Email delivery issues |

---

## 5. Quick Reference Commands

```bash
# Logs
clever logs                          # Live logs
clever logs --before "1 hour ago"    # Historical

# Restart
clever restart                       # Restart app
clever restart --without-cache       # Clear build cache

# Rollback
git log --oneline -10                # Find previous commit
clever deploy --force <sha>          # Deploy specific commit

# Scale
clever scale --flavor M              # Change instance size
clever scale --instances 2           # Add instances

# Environment
clever env                           # List env vars
clever env set KEY=value             # Set env var

# Database
clever addon providers show postgresql-addon
psql $POSTGRESQL_ADDON_URI           # Connect to DB
```
