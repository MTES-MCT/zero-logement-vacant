# Groups Precomputed Counts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-request `LEFT JOIN LATERAL COUNT(DISTINCT)` on `groups` with persisted `housing_count` / `owner_count` columns maintained by PostgreSQL triggers, eliminating the ~8s listing penalty for large groups.

**Architecture:** Two PostgreSQL triggers mirror the pattern established for campaigns (`20260319181202_campaigns-add-counts.ts`): `trg_update_group_counts` fires on `groups_housing` INSERT/DELETE and recomputes both counts; `trg_update_group_owner_count` fires on `owners_housing` INSERT/DELETE/UPDATE OF rank and recomputes `owner_count` only (guarded to rank=1 rows). The server reads stored columns instead of the lateral join.

**Tech Stack:** PostgreSQL triggers (plpgsql), Knex migrations, TypeScript, Vitest

---

### Task 1: Write failing repository tests

**Files:**
- Modify: `server/src/repositories/test/groupRepository.test.ts`

- [ ] **Step 1: Add import at the top of the file (after the existing imports)**

```typescript
import { HousingOwners } from '../housingOwnerRepository';
```

- [ ] **Step 2: Add a new `describe('counts')` block after the existing `describe('remove')` block**

```typescript
describe('counts', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  it('should expose housingCount from the database column', async () => {
    const group = genGroupApi(user, establishment);
    await Groups().insert({ ...formatGroupApi(group), housing_count: 7 });

    const result = await groupRepository.find({
      filters: { establishmentId: establishment.id }
    });
    const found = result.find((g) => g.id === group.id);

    expect(found?.housingCount).toBe(7);
  });

  it('should expose ownerCount from the database column', async () => {
    const group = genGroupApi(user, establishment);
    await Groups().insert({ ...formatGroupApi(group), owner_count: 4 });

    const result = await groupRepository.find({
      filters: { establishmentId: establishment.id }
    });
    const found = result.find((g) => g.id === group.id);

    expect(found?.ownerCount).toBe(4);
  });

  it('should update housingCount via trigger when housing is added', async () => {
    const group = genGroupApi(user, establishment);
    const housing = genHousingApi();
    await Groups().insert(formatGroupApi(group));
    await Housing().insert(formatHousingRecordApi(housing));

    await groupRepository.addHousing(group, [housing]);

    const result = await groupRepository.find({
      filters: { establishmentId: establishment.id }
    });
    const found = result.find((g) => g.id === group.id);
    expect(found?.housingCount).toBe(1);
  });

  it('should update ownerCount via trigger when a rank-1 owner is added', async () => {
    const group = genGroupApi(user, establishment);
    const housing = genHousingApi();
    await Groups().insert(formatGroupApi(group));
    await Housing().insert(formatHousingRecordApi(housing));
    await GroupsHousing().insert(formatGroupHousingApi(group, [housing]));

    // Insert directly into owners_housing — the trigger fires on this insert
    await HousingOwners().insert({
      owner_id: faker.string.uuid(),
      housing_id: housing.id,
      housing_geo_code: housing.geoCode,
      rank: 1,
      start_date: null,
      end_date: null,
      origin: null,
      idprocpte: null,
      idprodroit: null,
      locprop_source: null,
      locprop_relative_ban: null,
      locprop_distance_ban: null,
      property_right: null
    });

    const result = await groupRepository.find({
      filters: { establishmentId: establishment.id }
    });
    const found = result.find((g) => g.id === group.id);
    expect(found?.ownerCount).toBe(1);
  });
});
```

- [ ] **Step 3: Run to confirm failure**

```bash
yarn nx test server -- groupRepository
```

Expected: TypeScript errors — `housing_count` / `owner_count` not recognised as columns, or test failures showing the lateral join returns 0 instead of stored values.

- [ ] **Step 4: Commit**

```bash
git add server/src/repositories/test/groupRepository.test.ts
git commit -m "test(server): add failing tests for precomputed housingCount and ownerCount on groups"
```

---

### Task 2: Create the migration

**Files:**
- Create: `server/src/infra/database/migrations/<timestamp>_groups-add-counts.ts` (filename set by the tool)

- [ ] **Step 1: Generate the migration file**

```bash
yarn workspace @zerologementvacant/server db migrate:make groups-add-counts
```

Note the generated filename (e.g. `20260407123456_groups-add-counts.ts`) — it will appear in `server/src/infra/database/migrations/`.

- [ ] **Step 2: Replace the generated file content with the migration below**

```typescript
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add columns
  await knex.schema.alterTable('groups', (table) => {
    table.integer('housing_count').notNullable().defaultTo(0);
    table.integer('owner_count').notNullable().defaultTo(0);
  });

  // 2. Backfill existing groups
  // groups is a small user-created table — backfilling in the migration
  // is safe: the COUNT queries are a one-time cost at deploy time.
  await knex.raw(`
    UPDATE groups g
    SET
      housing_count = (
        SELECT COUNT(*)
        FROM groups_housing
        WHERE group_id = g.id
      ),
      owner_count = (
        SELECT COUNT(DISTINCT oh.owner_id)
        FROM groups_housing gh
        JOIN owners_housing oh
          ON oh.housing_id       = gh.housing_id
         AND oh.housing_geo_code = gh.housing_geo_code
         AND oh.rank = 1
        WHERE gh.group_id = g.id
      )
  `);

  // 3. Trigger A: groups_housing INSERT/DELETE → recompute both counts
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_group_counts()
    RETURNS TRIGGER AS $$
    DECLARE
      v_group_id UUID;
    BEGIN
      v_group_id := COALESCE(NEW.group_id, OLD.group_id);

      UPDATE groups
      SET
        housing_count = (
          SELECT COUNT(*)
          FROM groups_housing
          WHERE group_id = v_group_id
        ),
        owner_count = (
          SELECT COUNT(DISTINCT oh.owner_id)
          FROM groups_housing gh
          JOIN owners_housing oh
            ON oh.housing_id       = gh.housing_id
           AND oh.housing_geo_code = gh.housing_geo_code
           AND oh.rank = 1
          WHERE gh.group_id = v_group_id
        )
      WHERE id = v_group_id;

      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_update_group_counts
    AFTER INSERT OR DELETE ON groups_housing
    FOR EACH ROW
    EXECUTE FUNCTION update_group_counts();
  `);

  // 4. Trigger B: owners_housing INSERT/DELETE/UPDATE OF rank → recompute owner_count
  //    Guard: exits early when rank=1 is not involved.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_group_owner_count()
    RETURNS TRIGGER AS $$
    DECLARE
      v_group_id         UUID;
      v_housing_id       UUID;
      v_housing_geo_code VARCHAR(255);
    BEGIN
      IF TG_OP = 'INSERT' THEN
        IF NEW.rank != 1 THEN RETURN NEW; END IF;
        v_housing_id       := NEW.housing_id;
        v_housing_geo_code := NEW.housing_geo_code;
      ELSIF TG_OP = 'DELETE' THEN
        IF OLD.rank != 1 THEN RETURN OLD; END IF;
        v_housing_id       := OLD.housing_id;
        v_housing_geo_code := OLD.housing_geo_code;
      ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.rank != 1 AND NEW.rank != 1 THEN RETURN NEW; END IF;
        v_housing_id       := NEW.housing_id;
        v_housing_geo_code := NEW.housing_geo_code;
      END IF;

      FOR v_group_id IN (
        SELECT group_id FROM groups_housing
        WHERE housing_id       = v_housing_id
          AND housing_geo_code = v_housing_geo_code
      ) LOOP
        UPDATE groups
        SET owner_count = (
          SELECT COUNT(DISTINCT oh.owner_id)
          FROM groups_housing gh
          JOIN owners_housing oh
            ON oh.housing_id       = gh.housing_id
           AND oh.housing_geo_code = gh.housing_geo_code
           AND oh.rank = 1
          WHERE gh.group_id = v_group_id
        )
        WHERE id = v_group_id;
      END LOOP;

      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_update_group_owner_count
    AFTER INSERT OR DELETE OR UPDATE OF rank ON owners_housing
    FOR EACH ROW
    EXECUTE FUNCTION update_group_owner_count();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS trg_update_group_owner_count ON owners_housing');
  await knex.raw('DROP FUNCTION IF EXISTS update_group_owner_count');
  await knex.raw('DROP TRIGGER IF EXISTS trg_update_group_counts ON groups_housing');
  await knex.raw('DROP FUNCTION IF EXISTS update_group_counts');
  await knex.schema.alterTable('groups', (table) => {
    table.dropColumn('owner_count');
    table.dropColumn('housing_count');
  });
}
```

- [ ] **Step 3: Run the migration**

```bash
yarn workspace @zerologementvacant/server migrate
```

Expected: Migration completes without errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/infra/database/migrations/<timestamp>_groups-add-counts.ts
git commit -m "chore(server): add migration for precomputed housing_count and owner_count on groups"
```

---

### Task 3: Update groupRepository.ts

**Files:**
- Modify: `server/src/repositories/groupRepository.ts`

- [ ] **Step 1: Remove the `LEFT JOIN LATERAL` from `listQuery` and clean up the select**

Replace the entire `listQuery` function (lines 59–83):

```typescript
// Before
const listQuery = (query: Knex.QueryBuilder): void => {
  query
    .select(`${GROUPS_TABLE}.*`)
    .join<UserDBO>(usersTable, `${usersTable}.id`, `${GROUPS_TABLE}.user_id`)
    .select(db.raw(`to_json(${usersTable}.*) AS user`))
    .joinRaw(
      `
      LEFT JOIN LATERAL (
        SELECT
          COUNT(DISTINCT ${housingTable}.id) AS housing_count,
          COUNT(DISTINCT ${housingOwnersTable}.owner_id) AS owner_count
        FROM ${GROUPS_HOUSING_TABLE}
        JOIN ${housingTable}
          ON ${housingTable}.geo_code = ${GROUPS_HOUSING_TABLE}.housing_geo_code
          AND ${housingTable}.id = ${GROUPS_HOUSING_TABLE}.housing_id
        LEFT JOIN ${housingOwnersTable}
          ON ${housingOwnersTable}.housing_geo_code = ${housingTable}.geo_code
          AND ${housingOwnersTable}.housing_id = ${housingTable}.id
          AND ${housingOwnersTable}.rank = 1
        WHERE ${GROUPS_TABLE}.id = ${GROUPS_HOUSING_TABLE}.group_id
      ) counts ON true
    `
    )
    .select(`counts.*`);
};
```

With:

```typescript
// After — housing_count and owner_count are now plain columns on groups,
// selected automatically via groups.*
const listQuery = (query: Knex.QueryBuilder): void => {
  query
    .select(`${GROUPS_TABLE}.*`)
    .join<UserDBO>(usersTable, `${usersTable}.id`, `${GROUPS_TABLE}.user_id`)
    .select(db.raw(`to_json(${usersTable}.*) AS user`));
};
```

- [ ] **Step 2: Remove the now-unused imports**

Remove `housingOwnersTable` from the import on line 10 and `housingTable` from line 11 if they are no longer used anywhere else in the file. Check first:

```bash
grep -n "housingOwnersTable\|housingTable" server/src/repositories/groupRepository.ts
```

Remove any import that no longer appears in the file body.

- [ ] **Step 3: Update `GroupDBO` — move `housing_count` and `owner_count` to `GroupRecordDBO`**

`GroupRecordDBO` is the shape Knex returns when reading from `groups`. Since these are now real columns, they belong there. Change:

```typescript
// Before
export interface GroupRecordDBO {
  id: string;
  title: string;
  description: string;
  created_at: Date;
  exported_at: Date | null;
  archived_at: Date | null;
  user_id: string;
  establishment_id: string;
}

export interface GroupDBO extends GroupRecordDBO {
  housing_count: string;
  owner_count: string;
  user?: UserDBO;
}
```

To:

```typescript
// After
export interface GroupRecordDBO {
  id: string;
  title: string;
  description: string;
  created_at: Date;
  exported_at: Date | null;
  archived_at: Date | null;
  user_id: string;
  establishment_id: string;
  housing_count: number;
  owner_count: number;
}

export interface GroupDBO extends GroupRecordDBO {
  user?: UserDBO;
}
```

Note: the type changes from `string` to `number` — Knex returns JavaScript `number` for PostgreSQL `INTEGER` columns, unlike `COUNT()` aggregates which return `bigint` (serialised as string). `parseGroupApi` already calls `Number()` on both fields so this is safe either way.

- [ ] **Step 4: Typecheck**

```bash
yarn nx typecheck server
```

Expected: No errors.

- [ ] **Step 5: Run the tests**

```bash
yarn nx test server -- groupRepository
```

Expected: All tests pass, including the four new ones from Task 1.

- [ ] **Step 6: Run full server suite**

```bash
yarn nx test server
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add server/src/repositories/groupRepository.ts
git commit -m "feat(server): use precomputed housing_count and owner_count on groups"
```

---

### Task 4: Update documentation

**Files:**
- Modify: `docs/database/trigger-campaign-return-count.md`

- [ ] **Step 1: Add a new section documenting the group count triggers**

Append the following at the end of `docs/database/trigger-campaign-return-count.md`, before the closing:

```markdown
---

## Group housing count and owner count

**Introduced in:** migration `<timestamp>_groups-add-counts.ts`

### What are these columns?

| Column | Type | Description |
|--------|------|-------------|
| `housing_count` | `integer` | Number of housings attached to the group via `groups_housing` |
| `owner_count` | `integer` | Number of distinct primary owners (`rank = 1`) across those housings |

These replace a `LEFT JOIN LATERAL COUNT(DISTINCT …)` that was computed on every listing request, causing ~8s latency for large groups (e.g. 90k housings).

### Two-trigger design

Same pattern as the campaign counts (`trg_update_campaign_counts` / `trg_update_campaign_owner_count`).

| Trigger | Table | Timing | Updates |
|---------|-------|--------|---------|
| `trg_update_group_counts` | `groups_housing` | `AFTER INSERT OR DELETE` | `housing_count`, `owner_count` (full recompute) |
| `trg_update_group_owner_count` | `owners_housing` | `AFTER INSERT OR DELETE OR UPDATE OF rank` | `owner_count` only (full recompute) |

Both triggers perform a **full recompute** rather than incremental `±1` because group membership changes are infrequent and correctness is simpler to guarantee.

### `trg_update_group_counts`

**Table:** `groups_housing` — **Timing:** `AFTER INSERT OR DELETE FOR EACH ROW`

Resolves `v_group_id` as `COALESCE(NEW.group_id, OLD.group_id)` to handle both INSERT and DELETE. Recomputes `housing_count` as `COUNT(*) FROM groups_housing WHERE group_id = v_group_id` and `owner_count` as `COUNT(DISTINCT oh.owner_id)` joining `owners_housing` on rank=1.

### `trg_update_group_owner_count`

**Table:** `owners_housing` — **Timing:** `AFTER INSERT OR DELETE OR UPDATE OF rank FOR EACH ROW`

**Early exit conditions (no DB writes):**
- INSERT with `rank != 1`
- DELETE with `rank != 1`
- UPDATE where neither `OLD.rank` nor `NEW.rank` is 1

Iterates over all `group_id` values in `groups_housing` that contain the affected housing and recomputes `owner_count` for each.
```

- [ ] **Step 2: Update the Full trigger inventory table**

In the existing `## Full trigger inventory` table at the bottom of the file, add two new rows:

```markdown
| `trg_update_group_counts` | `groups_housing` | `AFTER INSERT OR DELETE` | `update_group_counts()` | `housing_count`, `owner_count` (full recompute) |
| `trg_update_group_owner_count` | `owners_housing` | `AFTER INSERT OR DELETE OR UPDATE OF rank` | `update_group_owner_count()` | `owner_count` (full recompute) |
```

- [ ] **Step 3: Commit**

```bash
git add docs/database/trigger-campaign-return-count.md
git commit -m "docs: document group housing_count and owner_count triggers"
```

---

### Task 5: Open pull request

- [ ] **Step 1: Push the branch**

```bash
git push -u origin <current-branch>
```

- [ ] **Step 2: Create the PR**

```bash
gh pr create --title "perf(server): precompute group housing_count and owner_count" --body "$(cat <<'EOF'
## Summary
- Adds `housing_count` and `owner_count` columns to the `groups` table, maintained by two PostgreSQL triggers
- Replaces the `LEFT JOIN LATERAL COUNT(DISTINCT …)` in `groupRepository.listQuery` that caused ~8s latency when listing groups with large memberships (e.g. 90k housings at Bordeaux Métropole)
- Backfills existing groups in the migration; no separate script needed
- Mirrors the pattern established for campaigns in `20260319181202_campaigns-add-counts.ts`
- Updates trigger inventory in `docs/database/trigger-campaign-return-count.md`

## Test plan
- [ ] `yarn nx test server -- groupRepository` — all tests pass including new count/trigger tests
- [ ] `yarn nx test server` — full server suite passes
- [ ] `yarn nx typecheck server` — no type errors
- [ ] Manual smoke: list groups for a large establishment in staging and confirm <1s response
- [ ] Verify backfill: after migration, `SELECT id, housing_count, owner_count FROM groups` returns correct values

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
