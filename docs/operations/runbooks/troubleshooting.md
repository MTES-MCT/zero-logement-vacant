# Troubleshooting Runbook

> Common issues and their solutions for Zero Logement Vacant

---

## 1. Frontend Issues

### 1.1 Blank Page / App Not Loading

**Symptoms:** White screen, no content

**Diagnosis:**
```bash
# Check browser console for errors (F12)
# Common errors:
# - "ChunkLoadError" → Cache issue
# - "SyntaxError" → Build issue
# - "TypeError" → Runtime error
```

**Solutions:**

| Cause | Solution |
|-------|----------|
| Browser cache | Clear cache, hard refresh (Ctrl+Shift+R) |
| Build issue | Redeploy: `clever restart --without-cache` |
| JS error | Check Sentry for stack trace |
| API down | Check backend health |

---

### 1.2 Login Not Working

**Symptoms:** Login button does nothing, 401 errors

**Diagnosis:**
```bash
# Check API health
curl -s https://zerologementvacant.beta.gouv.fr/api

# Check auth endpoint
curl -X POST https://zerologementvacant.beta.gouv.fr/api/authenticate \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'
```

**Solutions:**

| Cause | Solution |
|-------|----------|
| CORS issue | Check `APP_URL` env var matches frontend |
| JWT secret missing | Set `AUTH_SECRET` env var |
| User not activated | Check `activated_at` in users table |
| 2FA issue | Check `two_factor_enabled` flag |

---

### 1.3 Map Not Displaying

**Symptoms:** Empty map area, tiles not loading

**Diagnosis:**
```javascript
// Browser console
// Look for: "Failed to load resource" for tile URLs
```

**Solutions:**

| Cause | Solution |
|-------|----------|
| MapLibre error | Check MapLibre GL version compatibility |
| Tile server down | Check IGN/OSM tile server status |
| CSP blocking | Update Content-Security-Policy headers |

---

## 2. Backend Issues

### 2.1 API Returns 500 Error

**Symptoms:** Internal Server Error responses

**Diagnosis:**
```bash
# Check logs for stack trace
clever logs | grep -A 10 "Error"

# Check Sentry for detailed error
```

**Common Causes:**

```typescript
// Database connection error
"Connection terminated unexpectedly"
→ Restart app or check DB connection

// Undefined property access
"Cannot read property 'x' of undefined"
→ Check data validation, add null checks

// Memory issue
"JavaScript heap out of memory"
→ Scale up instance or fix memory leak
```

---

### 2.2 Slow API Responses

**Symptoms:** Requests take > 2 seconds

**Diagnosis:**
```sql
-- Check slow queries
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;

-- Check missing indexes
EXPLAIN ANALYZE <slow-query>;
```

**Solutions:**

| Cause | Solution |
|-------|----------|
| Missing index | Add index on filtered/joined columns |
| N+1 queries | Use eager loading / joins |
| Large result set | Add pagination |
| Unoptimized query | Rewrite with CTEs or subqueries |

---

### 2.3 File Upload Fails

**Symptoms:** Upload error, timeout

**Diagnosis:**
```bash
# Check file size limits
clever env | grep -i "size\|limit"

# Check antivirus logs
clever logs | grep -i "clam\|virus"
```

**Solutions:**

| Cause | Solution |
|-------|----------|
| File too large | Increase `MAX_FILE_SIZE` |
| Wrong MIME type | Update allowed types list |
| Virus detected | File is infected, reject upload |
| S3 connection | Check S3 credentials |
| Timeout | Increase request timeout |

---

### 2.4 Email Not Sending

**Symptoms:** Password reset emails not received

**Diagnosis:**
```bash
# Check Brevo API
clever logs | grep -i "brevo\|mail"

# Check Brevo dashboard for bounces
```

**Solutions:**

| Cause | Solution |
|-------|----------|
| Invalid API key | Update `BREVO_API_KEY` |
| Recipient blocked | Check Brevo blocklist |
| Template missing | Verify template ID exists |
| DNS issues | Check SPF/DKIM records |

---

## 3. Database Issues

### 3.1 "Too Many Connections"

**Diagnosis:**
```sql
SELECT count(*) FROM pg_stat_activity;
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
```

**Solutions:**
```sql
-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND query_start < now() - interval '10 minutes';
```

```bash
# Restart app to reset pool
clever restart
```

---

### 3.2 "Relation Does Not Exist"

**Diagnosis:**
```sql
-- Check if table exists
\dt *housing*

-- Check migrations
SELECT * FROM knex_migrations ORDER BY id DESC;
```

**Solutions:**
```bash
# Run pending migrations
yarn workspace @zerologementvacant/server migrate
```

---

### 3.3 Deadlocks

**Diagnosis:**
```sql
-- Check for locks
SELECT blocked_locks.pid AS blocked_pid,
       blocking_locks.pid AS blocking_pid,
       blocked_activity.query AS blocked_query
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
WHERE NOT blocked_locks.granted;
```

**Solutions:**
```sql
-- Terminate blocking query
SELECT pg_terminate_backend(<blocking_pid>);
```

---

## 4. Queue Issues

### 4.1 Jobs Stuck in Queue

**Diagnosis:**
```bash
# Check Bull Board dashboard
# URL: /queues (with basic auth)

# Check Redis
redis-cli -u $REDIS_URL
> LLEN bull:campaign-generate:wait
```

**Solutions:**
```bash
# Restart queue worker
clever restart  # (queue app)

# Clear stuck jobs via Bull Board
# Or via Redis:
redis-cli -u $REDIS_URL
> DEL bull:campaign-generate:wait
```

---

### 4.2 Job Fails Repeatedly

**Diagnosis:**
```bash
# Check job error in Bull Board
# Or in logs
clever logs | grep -i "failed\|error"
```

**Common Causes:**

| Error | Solution |
|-------|----------|
| Campaign not found | Check campaign exists |
| S3 upload failed | Check S3 credentials |
| Memory exceeded | Reduce batch size |
| Timeout | Increase job timeout |

---

## 5. Cron Job Issues

### 5.1 Cerema Sync Not Running

**Diagnosis:**
```bash
# Check cron configuration
cat clevercloud/cron.json

# Check recent executions
clever logs | grep cerema

# Check state files
ls -la server/src/scripts/perimeters-portaildf/01-cerema-scraper/api_*_state.json
```

**Solutions:**

| Cause | Solution |
|-------|----------|
| Cron not registered | Redeploy to register crons |
| Auth failure | Check Cerema credentials |
| Script error | Run manually to debug |
| State file corrupted | Delete state files, restart |

---

### 5.2 Manual Cron Execution

```bash
# Run cerema sync manually
cd server/src/scripts/perimeters-portaildf
export CEREMA_USERNAME="..."
export CEREMA_PASSWORD="..."
./cerema-sync.sh
```

---

## 6. Performance Issues

### 6.1 High Memory Usage

**Diagnosis:**
```bash
clever status
clever logs | grep -i "memory\|heap"
```

**Solutions:**

| Cause | Solution |
|-------|----------|
| Memory leak | Profile with `--inspect`, fix leak |
| Large payloads | Implement streaming |
| Too many connections | Reduce pool size |
| Instance too small | Scale up: `clever scale --flavor M` |

---

### 6.2 High CPU Usage

**Diagnosis:**
```bash
clever status

# Check for infinite loops or heavy computation
clever logs | grep -i "cpu\|timeout"
```

**Solutions:**

| Cause | Solution |
|-------|----------|
| Heavy computation | Move to background job |
| Infinite loop | Fix code bug |
| Too much traffic | Scale out: `clever scale --instances 2` |

---

## 7. Integration Issues

### 7.1 BAN API Errors

**Symptoms:** Address geocoding fails

**Diagnosis:**
```bash
# Test BAN API directly
curl "https://api-adresse.data.gouv.fr/search/?q=1+rue+de+la+paix+paris"
```

**Solutions:**

| Cause | Solution |
|-------|----------|
| API down | Wait or use cached results |
| Rate limited | Implement backoff |
| Invalid query | Sanitize input |

---

### 7.2 S3/Cellar Connection Issues

**Diagnosis:**
```bash
# Check credentials
clever env | grep S3

# Test connection
aws s3 ls s3://$S3_BUCKET --endpoint-url=$S3_ENDPOINT
```

**Solutions:**

| Cause | Solution |
|-------|----------|
| Wrong credentials | Update S3_* env vars |
| Bucket doesn't exist | Create bucket |
| Permission denied | Check bucket policy |

---

## 8. Quick Diagnostic Commands

```bash
# App status
clever status
curl -s https://zerologementvacant.beta.gouv.fr/api | jq .

# Logs
clever logs | tail -100
clever logs | grep -i error

# Database
psql $POSTGRESQL_ADDON_URI -c "SELECT 1"

# Redis
redis-cli -u $REDIS_URL ping

# Recent activity
clever activity | head -10

# Environment
clever env | sort
```

---

## 9. When to Escalate

| Situation | Action |
|-----------|--------|
| Can't diagnose in 15 min | Escalate to senior dev |
| Data corruption suspected | Stop writes, escalate immediately |
| Security incident | Follow security incident process |
| Third-party service down | Contact provider support |
| P1 lasting > 30 min | Escalate to tech lead |
