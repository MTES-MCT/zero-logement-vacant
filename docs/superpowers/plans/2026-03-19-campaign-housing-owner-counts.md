# Campaign Housing & Owner Counts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `housing_count`, `owner_count`, and `return_rate` as persisted fields on the `campaigns` table, maintained automatically by PostgreSQL triggers.

**Architecture:** Two PostgreSQL triggers maintain `housing_count` and `owner_count` on the `campaigns` table: one on `campaigns_housing` (AFTER INSERT OR DELETE) and one on `owners_housing` (AFTER INSERT OR DELETE OR UPDATE OF rank, guarded to rank=1 rows only). `return_rate` is a `GENERATED ALWAYS AS` computed column (`return_count::float / NULLIF(housing_count, 0)`) — no trigger needed. The server parses these fields in `parseCampaignApi` and propagates them through `CampaignApi`.

**Tech Stack:** PostgreSQL triggers (plpgsql), Knex migrations, TypeScript, Vitest

---

### Task 1: Write failing repository tests

**Files:**
- Modify: `server/src/repositories/test/campaignRepository.test.ts`

**Step 1: Add four failing tests inside the `findOne` describe block, after the existing `returnCount` tests**

```typescript
it('should expose housingCount from the database', async () => {
  const campaign = genCampaignApi(establishment.id, user);
  await Campaigns().insert({ ...formatCampaignApi(campaign), housing_count: 3 });

  const result = await campaignRepository.findOne({
    id: campaign.id,
    establishmentId: campaign.establishmentId
  });

  expect(result?.housingCount).toBe(3);
});

it('should expose ownerCount from the database', async () => {
  const campaign = genCampaignApi(establishment.id, user);
  await Campaigns().insert({ ...formatCampaignApi(campaign), owner_count: 2 });

  const result = await campaignRepository.findOne({
    id: campaign.id,
    establishmentId: campaign.establishmentId
  });

  expect(result?.ownerCount).toBe(2);
});

it('should expose returnRate from the database when sentAt is set', async () => {
  const campaign = genCampaignApi(establishment.id, user);
  await Campaigns().insert({
    ...formatCampaignApi(campaign),
    housing_count: 10,
    return_count: 4,
    sent_at: new Date()
  });

  const result = await campaignRepository.findOne({
    id: campaign.id,
    establishmentId: campaign.establishmentId
  });

  expect(result?.returnRate).toBeCloseTo(0.4);
});

it('should expose returnRate as null when sentAt is null', async () => {
  const campaign = genCampaignApi(establishment.id, user);
  await Campaigns().insert({
    ...formatCampaignApi(campaign),
    housing_count: 10,
    return_count: 0
  });

  const result = await campaignRepository.findOne({
    id: campaign.id,
    establishmentId: campaign.establishmentId
  });

  expect(result?.returnRate).toBeNull();
});
```

**Step 2: Run to confirm failure**

```bash
yarn nx test server -- campaignRepository
```

Expected: TypeScript errors or test failures — `housingCount`, `ownerCount`, `returnRate` not found on the result.

**Step 3: Commit**

```bash
git add server/src/repositories/test/campaignRepository.test.ts
git commit -m "test(server): add failing tests for housingCount, ownerCount, returnRate on campaigns"
```

---

### Task 2: Migration

**Files:**
- Create: `server/src/infra/database/migrations/20260319_campaigns-add-counts.ts`

**Step 1: Create the migration file**

```typescript
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add columns
  await knex.schema.alterTable('campaigns', (table) => {
    table.integer('housing_count').notNullable().defaultTo(0);
    table.integer('owner_count').notNullable().defaultTo(0);
  });

  // GENERATED ALWAYS AS cannot be expressed via knex schema builder — use raw
  await knex.raw(`
    ALTER TABLE campaigns
    ADD COLUMN return_rate FLOAT
    GENERATED ALWAYS AS (return_count::float / NULLIF(housing_count, 0))
    STORED
  `);

  // 2. Backfill existing campaigns
  await knex.raw(`
    UPDATE campaigns c
    SET
      housing_count = (
        SELECT COUNT(*) FROM campaigns_housing WHERE campaign_id = c.id
      ),
      owner_count = (
        SELECT COUNT(DISTINCT oh.owner_id)
        FROM campaigns_housing ch
        JOIN owners_housing oh
          ON oh.housing_id = ch.housing_id
         AND oh.housing_geo_code = ch.housing_geo_code
         AND oh.rank = 1
        WHERE ch.campaign_id = c.id
      )
  `);

  // 3. Trigger A: campaigns_housing INSERT/DELETE → recompute housing_count and owner_count
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_campaign_counts()
    RETURNS TRIGGER AS $$
    DECLARE
      v_campaign_id UUID;
    BEGIN
      v_campaign_id := COALESCE(NEW.campaign_id, OLD.campaign_id);

      UPDATE campaigns
      SET
        housing_count = (
          SELECT COUNT(*)
          FROM campaigns_housing
          WHERE campaign_id = v_campaign_id
        ),
        owner_count = (
          SELECT COUNT(DISTINCT oh.owner_id)
          FROM campaigns_housing ch
          JOIN owners_housing oh
            ON oh.housing_id = ch.housing_id
           AND oh.housing_geo_code = ch.housing_geo_code
           AND oh.rank = 1
          WHERE ch.campaign_id = v_campaign_id
        )
      WHERE id = v_campaign_id;

      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_update_campaign_counts
    AFTER INSERT OR DELETE ON campaigns_housing
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_counts();
  `);

  // 4. Trigger B: owners_housing INSERT/DELETE/UPDATE OF rank → recompute owner_count
  //    Guard: exits early when rank=1 is not involved.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_campaign_owner_count()
    RETURNS TRIGGER AS $$
    DECLARE
      v_campaign_id      UUID;
      v_housing_id       UUID;
      v_housing_geo_code VARCHAR(255);
    BEGIN
      IF TG_OP = 'INSERT' THEN
        IF NEW.rank != 1 THEN RETURN NEW; END IF;
        v_housing_id := NEW.housing_id;
        v_housing_geo_code := NEW.housing_geo_code;
      ELSIF TG_OP = 'DELETE' THEN
        IF OLD.rank != 1 THEN RETURN OLD; END IF;
        v_housing_id := OLD.housing_id;
        v_housing_geo_code := OLD.housing_geo_code;
      ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.rank != 1 AND NEW.rank != 1 THEN RETURN NEW; END IF;
        v_housing_id := NEW.housing_id;
        v_housing_geo_code := NEW.housing_geo_code;
      END IF;

      FOR v_campaign_id IN (
        SELECT campaign_id FROM campaigns_housing
        WHERE housing_id = v_housing_id
          AND housing_geo_code = v_housing_geo_code
      ) LOOP
        UPDATE campaigns
        SET owner_count = (
          SELECT COUNT(DISTINCT oh.owner_id)
          FROM campaigns_housing ch
          JOIN owners_housing oh
            ON oh.housing_id = ch.housing_id
           AND oh.housing_geo_code = ch.housing_geo_code
           AND oh.rank = 1
          WHERE ch.campaign_id = v_campaign_id
        )
        WHERE id = v_campaign_id;
      END LOOP;

      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_update_campaign_owner_count
    AFTER INSERT OR DELETE OR UPDATE OF rank ON owners_housing
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_owner_count();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS trg_update_campaign_owner_count ON owners_housing');
  await knex.raw('DROP FUNCTION IF EXISTS update_campaign_owner_count');
  await knex.raw('DROP TRIGGER IF EXISTS trg_update_campaign_counts ON campaigns_housing');
  await knex.raw('DROP FUNCTION IF EXISTS update_campaign_counts');
  await knex.schema.alterTable('campaigns', (table) => {
    table.dropColumn('return_rate');
    table.dropColumn('owner_count');
    table.dropColumn('housing_count');
  });
}
```

**Step 2: Run the migration**

```bash
yarn workspace @zerologementvacant/server migrate
```

Expected: Migration completes without errors.

**Step 3: Commit**

```bash
git add server/src/infra/database/migrations/20260319_campaigns-add-counts.ts
git commit -m "chore(server): add migration for housing_count, owner_count, return_rate on campaigns"
```

---

### Task 3: Update parseCampaignApi and CampaignDBO

**Files:**
- Modify: `server/src/repositories/campaignRepository.ts` (lines 130–196)

**Step 1: Fix `CampaignDBO.return_rate` type**

The `GENERATED ALWAYS AS` formula returns `NULL` when `housing_count = 0`. Change:

```typescript
// Before
return_rate: number;

// After
return_rate: number | null;
```

**Step 2: Add mappings in `parseCampaignApi`**

After the `returnCount` line (line 195), add:

```typescript
housingCount: campaign.housing_count,
ownerCount: campaign.owner_count,
returnRate: campaign.sent_at ? campaign.return_rate : null,
```

> `returnRate` follows the same `sentAt` guard as `returnCount`: null until the campaign is sent.

**Step 3: Run the repository tests**

```bash
yarn nx test server -- campaignRepository
```

Expected: All four new tests pass.

**Step 4: Commit**

```bash
git add server/src/repositories/campaignRepository.ts
git commit -m "feat(server): expose housingCount, ownerCount, returnRate in parseCampaignApi"
```

---

### Task 4: Propagate through CampaignApi and fix server fixture

**Files:**
- Modify: `server/src/models/CampaignApi.ts`
- Modify: `server/src/test/testFixtures.ts`

**Step 1: Add new fields to `fromCampaignDTO` Struct.pick**

Add `'housingCount'`, `'ownerCount'`, `'returnRate'` to the Struct.pick list in `fromCampaignDTO` (currently line 18–34).

**Step 2: Add new fields to `toCampaignDTO` Struct.pick**

Add `'housingCount'`, `'ownerCount'`, `'returnRate'` to the Struct.pick list in `toCampaignDTO` (currently line 42–59).

**Step 3: Fix `genCampaignApi` in server test fixtures**

`genCampaignApi` (line 337 in `testFixtures.ts`) returns an object missing the three new fields required by `CampaignApi` (which extends `CampaignDTO`). Add:

```typescript
housingCount: 0,
ownerCount: 0,
returnRate: null,
```

**Step 4: Typecheck**

```bash
yarn nx typecheck server
yarn nx typecheck models
```

Expected: No errors.

**Step 5: Run the full server test suite**

```bash
yarn nx test server
```

Expected: All tests pass.

**Step 6: Commit**

```bash
git add server/src/models/CampaignApi.ts server/src/test/testFixtures.ts
git commit -m "feat(server): propagate housingCount, ownerCount, returnRate through CampaignApi"
```
