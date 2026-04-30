# Operations Documentation

> Operational procedures and runbooks for Zero Logement Vacant

## Runbooks

| Runbook | Description | When to Use |
|---------|-------------|-------------|
| [Incident Response](runbooks/incident-response.md) | Handle production incidents | Service degradation or outage |
| [Database Operations](runbooks/database-operations.md) | PostgreSQL maintenance | Backups, migrations, queries |
| [Deployment & Rollback](runbooks/deployment-rollback.md) | Deploy and rollback procedures | Releasing code changes |
| [Troubleshooting](runbooks/troubleshooting.md) | Common issues and solutions | Debugging problems |
| [Monitoring & Alerts](runbooks/monitoring-alerts.md) | Monitoring stack and alerts | Setting up observability |

## Quick Actions

### Check System Health

```bash
# Application health
curl -s https://zerologementvacant.beta.gouv.fr/api | jq .

# View logs
clever logs -f

# Check status
clever status
```

### Emergency Actions

```bash
# Restart application
clever restart

# Rollback to previous version
git log --oneline -5
clever deploy --force <previous-sha>

# Scale up
clever scale --flavor L
clever scale --instances 2
```

### Database Quick Access

```bash
# Connect to production DB
psql $POSTGRESQL_ADDON_URI

# Run migrations
yarn workspace @zerologementvacant/server migrate

# Check migration status
yarn workspace @zerologementvacant/server migrate:status
```

## Incident Severity Levels

| Level | Response Time | Examples |
|-------|---------------|----------|
| **P1** | 15 minutes | App down, data loss |
| **P2** | 1 hour | Major feature broken |
| **P3** | 4 hours | Minor feature degraded |
| **P4** | 24 hours | Cosmetic issues |

## Key Contacts

| Role | Responsibility |
|------|----------------|
| On-call Developer | First response |
| Tech Lead | Escalation |
| Clever Cloud Support | Infrastructure issues |

## Maintenance Windows

- **Preferred:** Tuesday-Thursday, 10:00-16:00 (Paris)
- **Avoid:** Friday afternoon, weekends
- **Announce:** 24h in advance for planned maintenance

## Related Documentation

- [Architecture Overview](../architecture/README.md)
- [Infrastructure](../architecture/06-infrastructure.md)
- [Security](../architecture/08-security.md)
