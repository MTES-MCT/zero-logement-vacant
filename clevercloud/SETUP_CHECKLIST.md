# Clever Cloud Setup Checklist

## ✅ Configuration Steps

### 1. Environment Variables

Configure in Clever Cloud dashboard → "Environment variables" tab:

```bash
# Python
CC_PYTHON_VERSION=3.11

# Cerema API Authentication
CEREMA_USERNAME=your_cerema_username
CEREMA_PASSWORD=your_cerema_password
# Auth version: v1 (legacy Portail DF) or v2 (new DataFoncier API)
CEREMA_AUTH_VERSION=v1
# V1 API URL (default)
CEREMA_API=https://portaildf.cerema.fr
# V2 API URL (only used when CEREMA_AUTH_VERSION=v2)
CEREMA_API_V2=https://datafoncier.cerema.fr

# Database (automatically set by Clever Cloud PostgreSQL addon)
POSTGRESQL_ADDON_HOST=your_postgresql_host
POSTGRESQL_ADDON_PORT=5432
POSTGRESQL_ADDON_DB=your_database
POSTGRESQL_ADDON_USER=your_user
POSTGRESQL_ADDON_PASSWORD=your_password
```

### 2. Verify Configuration Files

- [x] `clevercloud/cron.json` - Monthly logs export cron configured
- [x] `clevercloud/post_build.sh` - Python dependencies installation script
- [x] `server/src/scripts/perimeters-portaildf/requirements.txt` - Python dependencies

There is no active Clever Cloud cron for Cerema rights synchronization. Cerema
rights checks are performed by the application during login/account creation.
The scripts in `server/src/scripts/perimeters-portaildf/` are available for
manual audits and troubleshooting only.

Legacy reference:

- `server/src/scripts/perimeters-portaildf/cerema-sync.sh`
- Former frequency: `*/30 * * * *`
- Current status: not scheduled by `clevercloud/cron.json`
- Replacement: login/account creation Cerema rights synchronization

### 3. Deploy the Application

```bash
git add .
git commit -m "chore: update Clever Cloud cron configuration"
git push clever master
```

### 4. Verify Deployment

#### 4.1 In Build Logs

Search for:

```
=== Installing Python dependencies for Cerema scripts ===
✓ Python dependencies installed successfully
```

#### 4.2 Via SSH

```bash
# Connect
clever ssh

# Check Python
python3 --version

# Check dependencies
pip3 list | grep -E "requests|click|psycopg2|dateutil"

# Test the scheduled cron script
/app/server/src/scripts/logs/export-monthly-logs.sh
```

#### 4.3 Verify Cron

Clever Cloud dashboard → "Cron" tab → Verify that the monthly logs export task
appears and executes.

### 5. Monitoring

#### Cron Logs

```bash
clever logs --addon-app cron
```

#### Application Logs

```bash
clever logs
```

#### Cerema Synchronization Logs

```bash
clever logs
```

Cerema rights synchronization is executed during authentication, so its logs are
application logs, not cron logs.

## 🔧 Quick Troubleshooting

### Cron Doesn't Execute

1. Verify that `cron.json` is committed
2. Check environment variables
3. Check permissions: `chmod +x server/src/scripts/logs/export-monthly-logs.sh`
4. Redeploy the application

### Python Not Found

1. Add `CC_PYTHON_VERSION=3.11` in environment variables
2. Redeploy
3. Check with `clever ssh` then `python3 --version`

### Missing Python Dependencies

1. Verify that `post_build.sh` executed in build logs
2. Install manually:
   ```bash
   clever ssh
   pip3 install --user -r /app/server/src/scripts/perimeters-portaildf/requirements.txt
   ```

### Cerema Authentication Fails

1. Check `CEREMA_USERNAME` and `CEREMA_PASSWORD`
2. Check `CEREMA_AUTH_VERSION` (v1 or v2)
3. Test manually:

   ```bash
   # V1 (legacy)
   curl -X POST https://portaildf.cerema.fr/api/api-token-auth/ \
     -d "username=XXX" \
     -d "password=XXX"

   # V2 (DataFoncier)
   curl -X POST https://datafoncier.cerema.fr/api/token/ \
     -H "Content-Type: application/json" \
     -d '{"username": "XXX", "password": "XXX"}'
   ```

### Database Connection Error

1. Check all `POSTGRESQL_ADDON_*` variables (automatically set by Clever Cloud addon)
2. Test connection from SSH:
   ```bash
   clever ssh
   psql "postgresql://$POSTGRESQL_ADDON_USER:$POSTGRESQL_ADDON_PASSWORD@$POSTGRESQL_ADDON_HOST:$POSTGRESQL_ADDON_PORT/$POSTGRESQL_ADDON_DB" -c "SELECT 1"
   ```

## 📚 Documentation

- **General Configuration**: `clevercloud/README.md`
- **Python Installation**: `server/src/scripts/perimeters-portaildf/INSTALLATION.md`
- **Cerema Scripts**: `server/src/scripts/perimeters-portaildf/README.md`

## 🎯 Expected Result

Once configured, the system will:

- ✅ Run the monthly application logs export
- ✅ Keep Python dependencies available for manual Cerema audit scripts
- ✅ Refresh Cerema rights from the application during login/account creation
