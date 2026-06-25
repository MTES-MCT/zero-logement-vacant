# Clever Cloud Configuration

## Configuration Files

- **`cron.json`**: Periodic task scheduling
- **`post_build.sh`**: Automatic Python dependencies installation after Node.js build
- **`README.md`**: This file

## Cron Jobs

This project uses Clever Cloud's cron system to schedule periodic tasks.

### Current Configuration

The `cron.json` file defines scheduled tasks:

- **Monthly logs export**: On the first day of each month at 03:00
  - Command: `$ROOT/server/src/scripts/logs/export-monthly-logs.sh`
  - Frequency: `0 3 1 * *`

There is no active Clever Cloud cron for Cerema rights synchronization anymore.
The former `cerema-sync.sh` cron was removed when Cerema rights checks moved to
the application login flow. Users and establishments are refreshed from Portail
DF when a user logs in or creates an account.

The Python scripts under `server/src/scripts/perimeters-portaildf/` are kept for
manual audits, exports, and troubleshooting. They are not scheduled by
`clevercloud/cron.json`.

### Deprecated Cerema Cron

The former Cerema DF Portal synchronization cron is documented here for
historical context only:

- **Cerema DF Portal Synchronization**: Every 30 minutes
  - Command: `/app/server/src/scripts/perimeters-portaildf/cerema-sync.sh`
  - Frequency: `*/30 * * * *`
  - Status: removed from `clevercloud/cron.json`
  - Replacement: Portail DF rights checks during login/account creation

Do not re-enable this cron unless the product explicitly needs background rights
synchronization again. In that case, the cron and scripts should be reviewed
against the current login-based synchronization logic first.

### Prerequisites

The following environment variables must be configured on Clever Cloud:

#### For Python

- `CC_PYTHON_VERSION`: Python version (recommended: `3.11`)
  - Allows Clever Cloud to install Python alongside Node.js
  - Required for sync scripts execution

#### For Cerema API

- `CEREMA_USERNAME`: Username for Cerema DF Portal API
- `CEREMA_PASSWORD`: Password for Cerema DF Portal API

> **Note**: The script automatically authenticates on each execution by calling `https://portaildf.cerema.fr/api/api-token-auth/` with these credentials as form-data. The JSON response contains the temporary token:
>
> ```bash
> # Request: POST https://portaildf.cerema.fr/api/api-token-auth/
> # Form data: username=xxx&password=xxx
> # Response:
> {
>   "token": "222a9ac058496742ff2922533d90847621314629"
> }
> ```
>
> This token is then used as `CEREMA_BEARER_TOKEN` for all API calls in the session.

#### For Database (Clever Cloud naming convention)

- `POSTGRESQL_ADDON_HOST`: Database host
- `POSTGRESQL_ADDON_PORT`: Database port (default: 5432)
- `POSTGRESQL_ADDON_DB`: Database name
- `POSTGRESQL_ADDON_USER`: Database user
- `POSTGRESQL_ADDON_PASSWORD`: Database password

> **Note**: These are automatically set by Clever Cloud when you link a PostgreSQL addon to your application.

### Cron Format

The standard cron format is used:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday = 0)
│ │ │ │ │
* * * * *
```

**Examples:**

- `*/30 * * * *`: Every 30 minutes
- `0 */2 * * *`: Every 2 hours (on the hour)
- `0 2 * * *`: Every day at 2 AM
- `0 0 * * 0`: Every Sunday at midnight

### Logs

Cron execution logs are available from Clever Cloud:

```bash
clever logs --addon-app cron
```

The current scheduled cron writes the monthly application log export. Cerema
rights synchronization logs are part of the application logs because the sync is
performed during authentication.

### Verification

To verify that the cron is properly configured on Clever Cloud:

1. Go to the Clever Cloud dashboard
2. Select your application
3. Go to the "Cron" tab
4. Verify that the task appears and executes

### Deployment

Changes to the `cron.json` file are automatically applied during the next application deployment.

To force a redeployment:

```bash
git commit --allow-empty -m "Trigger redeploy for cron update"
git push clever master
```

### Debug

If a cron doesn't work:

1. Check Clever Cloud logs in the dashboard
2. Verify that all environment variables are configured
3. Check that the scheduled script is executable (`chmod +x`)
4. Test the scheduled script manually via SSH:
   ```bash
   clever ssh
   /app/server/src/scripts/logs/export-monthly-logs.sh
   ```

### Python Dependencies

Python dependencies are automatically installed during deployment via the `post_build.sh` script.

**Related Files**:

- `server/src/scripts/perimeters-portaildf/requirements.txt`: Dependencies list
  - `requests>=2.31.0`: HTTP calls to Cerema API
  - `click>=8.1.7`: CLI interface for Python scripts
  - `psycopg2-binary>=2.9.9`: PostgreSQL connection
  - `python-dateutil>=2.8.2`: Date manipulation

- `clevercloud/post_build.sh`: Script executed after build
  - Automatically detects `pip3` or `pip`
  - Installs dependencies with `pip install --user`

**Verification**:
To verify dependency installation after deployment:

```bash
clever ssh
pip3 list | grep -E "requests|click|psycopg2|dateutil"
```
