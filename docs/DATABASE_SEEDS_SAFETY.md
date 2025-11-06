# Database seeds safety

## 🛡️ Production protection

To prevent accidental data loss in production, several protection mechanisms are in place:

### 1. Environment separation

Seeds are organized in environment-specific folders:
- `seeds/development/` - Development seeds (complete test data)
- `seeds/test/` - Seeds for automated tests
- `seeds/production/` - Production seeds (reference data only)

The environment is determined by the `DATABASE_ENV` or `NODE_ENV` variable.

### 2. Production whitelist

**The `CustomSeedSource` class automatically blocks execution of unauthorized seeds in production.**

#### Allowed seeds in production

Only the following seeds can run in production:
- `20240405010603_establishments.ts` - Reference establishments
- `20240405011035_buildings.ts` - Reference buildings
- `20240405011127_users.ts` - System users
- `20240405011615_geo-code-changes-2024.ts` - Geographic code changes
- `20250113145122_precisions.ts` - Precision levels

#### Behavior

**Without the `--specific` flag:**
```bash
# In production, this command will do NOTHING
yarn workspace @zerologementvacant/server seed
# Output: ⚠️  Seed execution blocked in production environment.
```

**With an allowed seed:**
```bash
# OK - allowed seed
yarn workspace @zerologementvacant/server seed --specific 20240405011127_users.ts
# Output: ✓ Running whitelisted seed in production: 20240405011127_users.ts
```

**With a non-allowed seed:**
```bash
# BLOCKED - unauthorized seed
yarn workspace @zerologementvacant/server seed --specific 20240404235459_housings.ts
# Output: ⚠️  Seed execution blocked in production environment.
```

### 3. Minimal production seeds

Production seeds **NEVER** contain transactional data:
- ❌ No housings
- ❌ No owners
- ❌ No ban_addresses
- ❌ No campaigns
- ✅ Only reference data (establishments, system users, etc.)

### 4. Automated tests

The `server/src/test/global-setup.ts` file automatically TRUNCATEs all tables before tests, but only in the `test` environment.

## 🔐 Best practices

### Adding a new seed in production

1. **Create the seed in `seeds/production/`**
   ```bash
   yarn workspace @zerologementvacant/server knex seed:make my_seed --env production
   ```

2. **Add the seed to the whitelist in `knexfile.ts`**
   ```typescript
   const allowedSeeds = new Set([
     // ... existing seeds
     '20250101120000_my_seed.ts'
   ]);
   ```

3. **Test in development first**
   ```bash
   DATABASE_ENV=production yarn workspace @zerologementvacant/server seed --specific 20250101120000_my_seed.ts
   ```

### Populating data in production

**DO NOT use seeds** for transactional data. Use instead:

#### BAN addresses data
- **Housing**: Dagster job `housings_ban_addresses_job`
  - Script: `analytics/dagster/src/assets/populate_housings_ban_addresses.py`
  - Calls the BAN API to geocode addresses
  - Uses `ON CONFLICT` to avoid duplicates

- **Owners**: Dagster job `owners_ban_addresses_job`
  - Script: `analytics/dagster/src/assets/populate_owners_ban_addresses.py`
  - Calls the BAN API to geocode addresses
  - Only deletes addresses not found (`not-found`)

#### Other data
- Use migrations for schema changes
- Use Dagster scripts for bulk data imports
- Use the API for normal CRUD operations

## ⚠️ In case of emergency

If data has been accidentally deleted:

1. **Check database backups**
2. **Re-run the appropriate Dagster jobs**:
   ```bash
   # For Housing addresses
   dagster job execute -f analytics/dagster/src/definitions.py -j housings_ban_addresses_job

   # For Owner addresses
   dagster job execute -f analytics/dagster/src/definitions.py -j owners_ban_addresses_job
   ```

3. **DO NOT run development seeds in production**

## 📝 Important environment variables

- `DATABASE_ENV` - Database environment (`development`, `test`, `production`)
- `NODE_ENV` - Node.js environment (fallback if DATABASE_ENV is not set)
- `DATABASE_URL` - Database connection URL

## 🔍 Check current environment

```bash
# Check environment variables
echo "DATABASE_ENV: $DATABASE_ENV"
echo "NODE_ENV: $NODE_ENV"

# List available seeds for current environment
ls -la server/src/infra/database/seeds/$DATABASE_ENV/

# Test seed protection (in production, this will show a warning)
yarn workspace @zerologementvacant/server seed
```
