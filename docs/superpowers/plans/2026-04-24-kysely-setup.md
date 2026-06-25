# Kysely Infrastructure Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a working Kysely infrastructure alongside Knex and migrate five simple repositories as proof-of-concept, leaving a pattern for the remaining ~26 repos.

**Architecture:** Kysely runs in parallel with Knex using the same Postgres connection string. `CamelCasePlugin` is enabled, so all TypeScript uses camelCase identifiers while the DB stays snake_case. A new `kysely-transaction.ts` mirrors the existing `transaction.ts` using `AsyncLocalStorage`. Repos migrated to Kysely keep their exported `*DBO` type names as re-exports of `Selectable<DB[...]>` / `Insertable<DB[...]>` from the generated `db.d.ts` — this preserves backward compatibility with all callers (tests, seeds, controllers) that import these types.

**Tech Stack:** Kysely 0.28.x, kysely-codegen 0.20.x, PostgreSQL, Vitest, Nx

---

## Coexistence constraint

Knex transactions (`startTransaction`) and Kysely transactions (`startKyselyTransaction`) are independent — they use different connection pools and different `AsyncLocalStorage` slots. During migration, a repository migrated to Kysely and called from a controller that uses `startTransaction` (Knex) will **not** participate in that Knex transaction. Repos in this plan (`settings`, `reset_links`, `signup_links`) have no transaction usage, so this is safe. `precisionRepository` is the only transactional repo covered here; it uses `withinKyselyTransaction`, which is independent of `withinTransaction` (Knex).

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `server/src/infra/database/db.d.ts` | Generated (do not hand-edit) | Complete DB type declarations, camelCase keys |
| `server/src/infra/database/kysely-transaction.ts` | Create | ALS-based transaction helpers for Kysely |
| `server/src/repositories/settingsRepository.ts` | Modify | Replace Knex with Kysely; `SettingsDBO = Selectable<DB['settings']>` |
| `server/src/repositories/test/settingsRepository.test.ts` | Create | Integration tests for settingsRepository |
| `server/src/repositories/resetLinkRepository.ts` | Modify | Replace Knex with Kysely; `ResetLinkDBO = Selectable<DB['resetLinks']>` |
| `server/src/repositories/test/resetLinkRepository.test.ts` | Create | Integration tests for resetLinkRepository |
| `server/src/repositories/signupLinkRepository.ts` | Modify | Replace Knex with Kysely; `SignupLinkDBO = Selectable<DB['signupLinks']>` |
| `server/src/repositories/test/signupLinkRepository.test.ts` | Create | Integration tests for signupLinkRepository |
| `server/src/repositories/precisionRepository.ts` | Modify | Replace Knex with Kysely + Kysely transactions |

---

## Task 1: Generate DB types

**Files:**
- Generate: `server/src/infra/database/db.d.ts`

This task has no code to write — run the Nx codegen target. It requires a migrated database at `$DATABASE_URL`.

- [ ] **Step 1.1: Set DATABASE_URL and run codegen**

```bash
export DATABASE_URL=postgres://postgres:postgres@localhost/dev
cd /path/to/repo
yarn nx codegen server
```

Expected: `server/src/infra/database/db.d.ts` is overwritten with a non-empty `DB` interface containing one entry per table.

- [ ] **Step 1.2: Verify key tables are present**

Open `server/src/infra/database/db.d.ts` and confirm the following tables appear (names are camelCase because `camelCase: true` in `.kysely-codegenrc.json`):

```
settings, resetLinks, signupLinks, housingPrecisions, precisions, users, housings
```

If a table is missing, the DB may not be migrated. Run:
```bash
yarn nx migrate server
yarn nx codegen server
```

- [ ] **Step 1.3: Commit**

```bash
git add server/src/infra/database/db.d.ts
git commit -m "chore(server): generate kysely db types from schema"
```

---

## Task 2: Kysely transaction infrastructure

**Files:**
- Create: `server/src/infra/database/kysely-transaction.ts`

This file mirrors `transaction.ts` but for Kysely. It exports `startKyselyTransaction`, `getKyselyTransaction`, and `withinKyselyTransaction`.

- [ ] **Step 2.1: Create `kysely-transaction.ts`**

```typescript
// server/src/infra/database/kysely-transaction.ts
import { AsyncLocalStorage } from 'async_hooks';
import type { Transaction } from 'kysely';

import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';

interface KyselyTransactionStore {
  transaction: Transaction<DB>;
}

const storage = new AsyncLocalStorage<KyselyTransactionStore>();

export async function startKyselyTransaction<R>(
  cb: () => Promise<R>
): Promise<R> {
  return kysely.transaction().execute((trx) =>
    storage.run({ transaction: trx }, cb)
  );
}

export const getKyselyTransaction = (): Transaction<DB> | undefined =>
  storage.getStore()?.transaction;

export async function withinKyselyTransaction<R>(
  cb: (trx: Transaction<DB>) => Promise<R>
): Promise<R> {
  const trx = getKyselyTransaction();
  if (trx) return cb(trx);
  return kysely.transaction().execute(cb);
}
```

- [ ] **Step 2.2: Verify TypeScript compiles**

```bash
yarn nx typecheck server
```

Expected: no errors.

- [ ] **Step 2.3: Commit**

```bash
git add server/src/infra/database/kysely-transaction.ts
git commit -m "feat(server): add kysely transaction infrastructure"
```

---

## Task 3: Migrate `settingsRepository`

**Files:**
- Create: `server/src/repositories/test/settingsRepository.test.ts`
- Modify: `server/src/repositories/settingsRepository.ts`

**Setup note:** Tests use the existing Knex table accessor `Settings()` (from the current file) for seeding/assertion, while the repository functions under test use Kysely internally. After migration, `Settings()` is removed and replaced with a direct Knex table accessor for test use only.

The `Selectable<DB['settings']>` type (after codegen) will look like:
```typescript
{ id: string; establishmentId: string; inboxEnabled: boolean }
```

- [ ] **Step 3.1: Write failing tests**

Create `server/src/repositories/test/settingsRepository.test.ts`:

```typescript
import { faker } from '@faker-js/faker/locale/fr';
import db from '~/infra/database';
import settingsRepository, {
  parseSettingsApi,
  formatSettingsApi
} from '~/repositories/settingsRepository';
import { genEstablishmentApi } from '~/test/testFixtures';

// Knex accessor for test setup/assertion only
const Settings = () => db<{ id: string; establishment_id: string; inbox_enabled: boolean }>('settings');

describe('settingsRepository', () => {
  describe('findOne', () => {
    it('should return null when no settings exist for an establishment', async () => {
      const result = await settingsRepository.findOne({ establishmentId: faker.string.uuid() });
      expect(result).toBeNull();
    });

    it('should return settings for an existing establishment', async () => {
      const establishment = genEstablishmentApi();
      const row = {
        id: faker.string.uuid(),
        establishment_id: establishment.id,
        inbox_enabled: true
      };
      await Settings().insert(row);

      const result = await settingsRepository.findOne({ establishmentId: establishment.id });

      expect(result).toMatchObject({
        id: row.id,
        establishmentId: establishment.id,
        inbox: { enabled: true }
      });
    });
  });

  describe('upsert', () => {
    it('should insert settings when they do not exist', async () => {
      const establishment = genEstablishmentApi();
      const settings = {
        id: faker.string.uuid(),
        establishmentId: establishment.id,
        inbox: { enabled: false }
      };

      await settingsRepository.upsert(settings);

      const row = await Settings().where('establishment_id', establishment.id).first();
      expect(row).toMatchObject({
        establishment_id: establishment.id,
        inbox_enabled: false
      });
    });

    it('should update inbox_enabled when settings already exist', async () => {
      const establishment = genEstablishmentApi();
      const id = faker.string.uuid();
      await Settings().insert({
        id,
        establishment_id: establishment.id,
        inbox_enabled: false
      });

      await settingsRepository.upsert({
        id,
        establishmentId: establishment.id,
        inbox: { enabled: true }
      });

      const row = await Settings().where('establishment_id', establishment.id).first();
      expect(row?.inbox_enabled).toBe(true);
    });
  });
});
```

- [ ] **Step 3.2: Run tests and confirm they fail**

```bash
yarn nx test server -- settingsRepository
```

Expected: FAIL — tests run but the repo is not yet migrated (tests themselves may pass trivially since the Knex impl works; the point is to establish the baseline before changing the implementation).

Note: If the test file requires imports not yet available (e.g. `genEstablishmentApi`), fix them before proceeding.

- [ ] **Step 3.3: Migrate `settingsRepository.ts` to Kysely**

Replace the entire file:

```typescript
import type { Insertable, Selectable } from 'kysely';

import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { logger } from '~/infra/logger';
import { SettingsApi } from '~/models/SettingsApi';

// Re-export DBO type — callers that import SettingsDBO continue to work.
export type SettingsDBO = Selectable<DB['settings']>;

interface FindOneOptions {
  establishmentId: string;
}

async function findOne(options: FindOneOptions): Promise<SettingsApi | null> {
  logger.info('Get settings', options);

  const row = await kysely
    .selectFrom('settings')
    .where('establishmentId', '=', options.establishmentId)
    .selectAll()
    .executeTakeFirst();

  return row ? parseSettingsApi(row) : null;
}

async function upsert(settings: SettingsApi): Promise<void> {
  logger.info('Upsert settings', settings);

  await kysely
    .insertInto('settings')
    .values(formatSettingsApi(settings))
    .onConflict((oc) =>
      oc.column('establishmentId').doUpdateSet({ inboxEnabled: settings.inbox.enabled })
    )
    .execute();
}

export function parseSettingsApi(row: SettingsDBO): SettingsApi {
  return {
    id: row.id,
    establishmentId: row.establishmentId,
    inbox: { enabled: row.inboxEnabled }
  };
}

export function formatSettingsApi(settings: SettingsApi): Insertable<DB['settings']> {
  return {
    id: settings.id,
    establishmentId: settings.establishmentId,
    inboxEnabled: settings.inbox.enabled
  };
}

export default {
  findOne,
  upsert
};
```

- [ ] **Step 3.4: Run tests and confirm they pass**

```bash
yarn nx test server -- settingsRepository
```

Expected: PASS.

- [ ] **Step 3.5: Run full typecheck**

```bash
yarn nx typecheck server
```

Expected: no errors.

- [ ] **Step 3.6: Commit**

```bash
git add server/src/repositories/settingsRepository.ts \
        server/src/repositories/test/settingsRepository.test.ts
git commit -m "feat(server): migrate settingsRepository to kysely"
```

---

## Task 4: Migrate `resetLinkRepository`

**Files:**
- Create: `server/src/repositories/test/resetLinkRepository.test.ts`
- Modify: `server/src/repositories/resetLinkRepository.ts`

`reset_links` has four columns: `id`, `user_id`, `created_at`, `expires_at`, `used_at`. With `CamelCasePlugin` these become `id`, `userId`, `createdAt`, `expiresAt`, `usedAt`.

- [ ] **Step 4.1: Write failing tests**

Create `server/src/repositories/test/resetLinkRepository.test.ts`:

```typescript
import { faker } from '@faker-js/faker/locale/fr';
import db from '~/infra/database';
import resetLinkRepository from '~/repositories/resetLinkRepository';
import { genUserApi } from '~/test/testFixtures';

const ResetLinks = () =>
  db<{
    id: string;
    user_id: string;
    created_at: Date;
    expires_at: Date;
    used_at: Date | null;
  }>('reset_links');

function genResetLinkApi(userId: string) {
  return {
    id: faker.string.uuid(),
    userId,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3_600_000),
    usedAt: null
  };
}

describe('resetLinkRepository', () => {
  describe('insert', () => {
    it('should insert a reset link', async () => {
      const user = genUserApi();
      const link = genResetLinkApi(user.id);

      await resetLinkRepository.insert(link);

      const row = await ResetLinks().where('id', link.id).first();
      expect(row).toMatchObject({ id: link.id, user_id: user.id });
    });
  });

  describe('get', () => {
    it('should return null for a non-existent id', async () => {
      const result = await resetLinkRepository.get(faker.string.uuid());
      expect(result).toBeNull();
    });

    it('should return the reset link by id', async () => {
      const user = genUserApi();
      const link = genResetLinkApi(user.id);
      await ResetLinks().insert({
        id: link.id,
        user_id: link.userId,
        created_at: link.createdAt,
        expires_at: link.expiresAt,
        used_at: null
      });

      const result = await resetLinkRepository.get(link.id);

      expect(result).toMatchObject({ id: link.id, userId: link.userId });
    });
  });

  describe('used', () => {
    it('should set used_at on the link', async () => {
      const user = genUserApi();
      const link = genResetLinkApi(user.id);
      await ResetLinks().insert({
        id: link.id,
        user_id: link.userId,
        created_at: link.createdAt,
        expires_at: link.expiresAt,
        used_at: null
      });

      await resetLinkRepository.used(link.id);

      const row = await ResetLinks().where('id', link.id).first();
      expect(row?.used_at).not.toBeNull();
    });
  });
});
```

- [ ] **Step 4.2: Run tests and confirm baseline**

```bash
yarn nx test server -- resetLinkRepository
```

- [ ] **Step 4.3: Migrate `resetLinkRepository.ts`**

```typescript
import type { Insertable, Selectable } from 'kysely';

import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { logger } from '~/infra/logger';
import { ResetLinkApi } from '~/models/ResetLinkApi';

// Re-export DBO type — callers that import ResetLinkDBO continue to work.
export type ResetLinkDBO = Selectable<DB['resetLinks']>;

async function insert(resetLinkApi: ResetLinkApi): Promise<void> {
  logger.info('Insert resetLinkApi');
  await kysely
    .insertInto('resetLinks')
    .values(formatResetLinkApi(resetLinkApi))
    .execute();
}

async function get(id: string): Promise<ResetLinkApi | null> {
  logger.info('Get resetLinkApi with id', id);
  const row = await kysely
    .selectFrom('resetLinks')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst();
  return row ? parseResetLinkApi(row) : null;
}

async function used(id: string): Promise<void> {
  logger.info(`Set resetLinkApi ${id} as used`);
  await kysely
    .updateTable('resetLinks')
    .set({ usedAt: new Date() })
    .where('id', '=', id)
    .execute();
}

export const parseResetLinkApi = (row: ResetLinkDBO): ResetLinkApi => ({
  id: row.id,
  userId: row.userId,
  createdAt: row.createdAt,
  expiresAt: row.expiresAt,
  usedAt: row.usedAt ?? null
});

export const formatResetLinkApi = (link: ResetLinkApi): Insertable<DB['resetLinks']> => ({
  id: link.id,
  userId: link.userId,
  createdAt: link.createdAt,
  expiresAt: link.expiresAt,
  usedAt: link.usedAt ?? null
});

export default {
  insert,
  get,
  used
};
```

- [ ] **Step 4.4: Run tests and confirm they pass**

```bash
yarn nx test server -- resetLinkRepository
```

Expected: PASS.

- [ ] **Step 4.5: Typecheck**

```bash
yarn nx typecheck server
```

- [ ] **Step 4.6: Commit**

```bash
git add server/src/repositories/resetLinkRepository.ts \
        server/src/repositories/test/resetLinkRepository.test.ts
git commit -m "feat(server): migrate resetLinkRepository to kysely"
```

---

## Task 5: Migrate `signupLinkRepository`

**Files:**
- Create: `server/src/repositories/test/signupLinkRepository.test.ts`
- Modify: `server/src/repositories/signupLinkRepository.ts`

`signup_links` columns: `id`, `prospect_email`, `expires_at` → camelCase: `id`, `prospectEmail`, `expiresAt`.

- [ ] **Step 5.1: Write failing tests**

Create `server/src/repositories/test/signupLinkRepository.test.ts`:

```typescript
import { faker } from '@faker-js/faker/locale/fr';
import db from '~/infra/database';
import signupLinkRepository from '~/repositories/signupLinkRepository';

const SignupLinks = () =>
  db<{ id: string; prospect_email: string; expires_at: Date }>('signup_links');

function genSignupLinkApi() {
  return {
    id: faker.string.uuid(),
    prospectEmail: faker.internet.email(),
    expiresAt: new Date(Date.now() + 3_600_000)
  };
}

describe('signupLinkRepository', () => {
  describe('insert', () => {
    it('should insert a signup link', async () => {
      const link = genSignupLinkApi();
      await signupLinkRepository.insert(link);

      const row = await SignupLinks().where('id', link.id).first();
      expect(row).toMatchObject({ id: link.id, prospect_email: link.prospectEmail });
    });
  });

  describe('get', () => {
    it('should return null for a non-existent id', async () => {
      const result = await signupLinkRepository.get(faker.string.uuid());
      expect(result).toBeNull();
    });

    it('should return the signup link by id', async () => {
      const link = genSignupLinkApi();
      await SignupLinks().insert({
        id: link.id,
        prospect_email: link.prospectEmail,
        expires_at: link.expiresAt
      });

      const result = await signupLinkRepository.get(link.id);
      expect(result).toMatchObject({ id: link.id, prospectEmail: link.prospectEmail });
    });
  });

  describe('getByEmail', () => {
    it('should return null when no link exists for an email', async () => {
      const result = await signupLinkRepository.getByEmail(faker.internet.email());
      expect(result).toBeNull();
    });

    it('should return the signup link by prospect email', async () => {
      const link = genSignupLinkApi();
      await SignupLinks().insert({
        id: link.id,
        prospect_email: link.prospectEmail,
        expires_at: link.expiresAt
      });

      const result = await signupLinkRepository.getByEmail(link.prospectEmail);
      expect(result).toMatchObject({ id: link.id, prospectEmail: link.prospectEmail });
    });
  });

  describe('used', () => {
    it('should delete the signup link', async () => {
      const link = genSignupLinkApi();
      await SignupLinks().insert({
        id: link.id,
        prospect_email: link.prospectEmail,
        expires_at: link.expiresAt
      });

      await signupLinkRepository.used(link.id);

      const row = await SignupLinks().where('id', link.id).first();
      expect(row).toBeUndefined();
    });
  });
});
```

- [ ] **Step 5.2: Run tests and confirm baseline**

```bash
yarn nx test server -- signupLinkRepository
```

- [ ] **Step 5.3: Migrate `signupLinkRepository.ts`**

```typescript
import type { Insertable, Selectable } from 'kysely';

import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { logger } from '~/infra/logger';
import { SignupLinkApi } from '~/models/SignupLinkApi';

// Re-export DBO type — callers that import SignupLinkDBO continue to work.
export type SignupLinkDBO = Selectable<DB['signupLinks']>;

async function insert(link: SignupLinkApi): Promise<void> {
  logger.info('Insert signupLinkApi');
  await kysely.insertInto('signupLinks').values(formatSignupLinkApi(link)).execute();
}

async function get(id: string): Promise<SignupLinkApi | null> {
  logger.info('Get signupLinkApi with id', id);
  const row = await kysely
    .selectFrom('signupLinks')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst();
  return row ? parseSignupLinkApi(row) : null;
}

async function used(id: string): Promise<void> {
  logger.info(`Remove used signup link ${id}`);
  await kysely.deleteFrom('signupLinks').where('id', '=', id).execute();
}

async function getByEmail(email: string): Promise<SignupLinkApi | null> {
  logger.debug('Get signupLinkApi by prospect_email', email);
  const row = await kysely
    .selectFrom('signupLinks')
    .where('prospectEmail', '=', email)
    .selectAll()
    .executeTakeFirst();
  return row ? parseSignupLinkApi(row) : null;
}

export const parseSignupLinkApi = (row: SignupLinkDBO): SignupLinkApi => ({
  id: row.id,
  prospectEmail: row.prospectEmail,
  expiresAt: row.expiresAt
});

export const formatSignupLinkApi = (link: SignupLinkApi): Insertable<DB['signupLinks']> => ({
  id: link.id,
  prospectEmail: link.prospectEmail,
  expiresAt: link.expiresAt
});

export default {
  insert,
  get,
  used,
  getByEmail
};
```

- [ ] **Step 5.4: Run tests and confirm they pass**

```bash
yarn nx test server -- signupLinkRepository
```

- [ ] **Step 5.5: Typecheck**

```bash
yarn nx typecheck server
```

- [ ] **Step 5.6: Commit**

```bash
git add server/src/repositories/signupLinkRepository.ts \
        server/src/repositories/test/signupLinkRepository.test.ts
git commit -m "feat(server): migrate signupLinkRepository to kysely"
```

---

## Task 6: Migrate `precisionRepository` (transaction pattern)

**Files:**
- Modify: `server/src/repositories/precisionRepository.ts`
- No new tests — existing tests in `test/precisionRepository.test.ts` cover the behaviour

This task proves the `withinKyselyTransaction` pattern works. The existing tests continue to pass — they use Knex table accessors for seeding/assertion which is fine.

`precisions` columns: `id`, `label`, `category`, `order` (no snake→camel needed here).
`housing_precisions` columns: `housing_geo_code`, `housing_id`, `precision_id`, `created_at` → camelCase: `housingGeoCode`, `housingId`, `precisionId`, `createdAt`.

- [ ] **Step 6.1: Run existing tests to establish baseline**

```bash
yarn nx test server -- precisionRepository
```

Expected: PASS (all tests pass with current Knex implementation).

- [ ] **Step 6.2: Migrate `precisionRepository.ts`**

```typescript
import type { Insertable, Selectable } from 'kysely';

import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import { createLogger } from '~/infra/logger';
import { HousingApi } from '~/models/HousingApi';
import { PrecisionApi } from '~/models/PrecisionApi';

// Re-export DBO types — widely imported in tests, seeds, and controllers.
export type PrecisionDBO = Selectable<DB['precisions']>;
export type HousingPrecisionDBO = Selectable<DB['housingPrecisions']>;

export const PRECISION_TABLE = 'precisions' as const;
export const HOUSING_PRECISION_TABLE = 'housingPrecisions' as const;

const logger = createLogger('precisionRepository');

interface FindOptions {
  filters?: {
    id?: string[];
    housingId?: string[];
  };
}

async function find(options?: FindOptions): Promise<PrecisionDBO[]> {
  let query = kysely
    .selectFrom(PRECISION_TABLE)
    .selectAll(PRECISION_TABLE)
    .orderBy('category')
    .orderBy('order');

  if (options?.filters?.id?.length) {
    query = query.where(`${PRECISION_TABLE}.id`, 'in', options.filters.id);
  }

  if (options?.filters?.housingId?.length) {
    query = query
      .innerJoin(
        HOUSING_PRECISION_TABLE,
        `${PRECISION_TABLE}.id`,
        `${HOUSING_PRECISION_TABLE}.precisionId`
      )
      .where(`${HOUSING_PRECISION_TABLE}.housingId`, 'in', options.filters.housingId);
  }

  return query.execute();
}

async function link(
  housing: HousingApi,
  precisions: ReadonlyArray<PrecisionApi>
): Promise<void> {
  logger.debug('Linking housing to precisions', { housing: housing.id, precisions });

  await withinKyselyTransaction(async (trx) => {
    await trx
      .deleteFrom(HOUSING_PRECISION_TABLE)
      .where('housingGeoCode', '=', housing.geoCode)
      .where('housingId', '=', housing.id)
      .execute();

    if (precisions.length) {
      await trx
        .insertInto(HOUSING_PRECISION_TABLE)
        .values(precisions.map(toHousingPrecisionInsert(housing)))
        .execute();
    }
  });
}

async function linkMany(
  links: ReadonlyArray<{ housing: HousingApi; precisions: ReadonlyArray<PrecisionApi> }>
): Promise<void> {
  if (links.length === 0) {
    logger.debug('No housings to link. Skipping...');
    return;
  }

  const precisions = links.flatMap((l) => l.precisions);
  logger.debug('Linking many housings to precisions...', {
    housings: links.length,
    precisions: precisions.length
  });

  await withinKyselyTransaction(async (trx) => {
    for (const { housing } of links) {
      await trx
        .deleteFrom(HOUSING_PRECISION_TABLE)
        .where('housingGeoCode', '=', housing.geoCode)
        .where('housingId', '=', housing.id)
        .execute();
    }

    const rows: Insertable<DB['housingPrecisions']>[] = links.flatMap(({ housing, precisions }) =>
      precisions.map(toHousingPrecisionInsert(housing))
    );

    if (rows.length) {
      await trx.insertInto(HOUSING_PRECISION_TABLE).values(rows).execute();
    }

    logger.debug('Linked many housings to precisions', {
      housings: links.length,
      precisions: precisions.length
    });
  });
}

export function formatPrecisionApi(precision: PrecisionApi): PrecisionDBO {
  return {
    id: precision.id,
    label: precision.label,
    category: precision.category,
    order: precision.order
  };
}

function toHousingPrecisionInsert(
  housing: HousingApi
): (precision: PrecisionApi) => Insertable<DB['housingPrecisions']> {
  return (precision) => ({
    housingGeoCode: housing.geoCode,
    housingId: housing.id,
    precisionId: precision.id,
    createdAt: new Date()
  });
}

const precisionRepository = { find, link, linkMany };
export default precisionRepository;
```

**Note:** The `Precisions()` and `HousingPrecisions()` Knex table accessor exports that existed in the original file are intentionally removed — they are used only by the test file for seeding. The test file references them directly from the repo file, so update the test import to use the Knex accessor defined locally or update the test to remove those imports. See step 6.3.

- [ ] **Step 6.3: Update test to remove deleted Knex accessor imports**

Open `server/src/repositories/test/precisionRepository.test.ts`.

Remove the import of `Precisions` and `HousingPrecisions` from `~/repositories/precisionRepository`. Add local Knex accessors at the top of the test file instead:

```typescript
import db from '~/infra/database';
import type { PrecisionDBO } from '~/repositories/precisionRepository';  // remove this if PrecisionDBO was exported

// Replace with local Knex accessors:
const Precisions = () => db<{ id: string; label: string; category: string; order: number }>('precisions');
const HousingPrecisions = () =>
  db<{
    housing_geo_code: string;
    housing_id: string;
    precision_id: string;
    created_at: Date;
  }>('housing_precisions');
```

Keep all test assertions unchanged.

- [ ] **Step 6.4: Run existing tests**

```bash
yarn nx test server -- precisionRepository
```

Expected: PASS (all tests from the existing file pass).

- [ ] **Step 6.5: Typecheck**

```bash
yarn nx typecheck server
```

- [ ] **Step 6.6: Commit**

```bash
git add server/src/repositories/precisionRepository.ts \
        server/src/repositories/test/precisionRepository.test.ts \
        server/src/infra/database/kysely-transaction.ts
git commit -m "feat(server): migrate precisionRepository to kysely with transaction support"
```

---

## Task 7: Final verification and PR

- [ ] **Step 7.1: Run full server test suite**

```bash
yarn nx test server
```

Expected: all tests pass.

- [ ] **Step 7.2: Typecheck all workspaces**

```bash
yarn nx run-many -t typecheck
```

Expected: no errors.

- [ ] **Step 7.3: Push branch and open PR**

```bash
git push -u origin feat/kysely-setup
gh pr create --title "feat(server): kysely infrastructure setup + 4 repo migrations" --body "$(cat <<'EOF'
## Summary
- Install kysely + kysely-codegen; generate DB types into db.d.ts
- Add Nx codegen target (depends on migrate)
- Implement Kysely transaction infrastructure (ALS-based, mirrors transaction.ts)
- Migrate settingsRepository, resetLinkRepository, signupLinkRepository, precisionRepository to Kysely
- Drop manual DBO type declarations in favour of Selectable<DB[...]> / Insertable<DB[...]>
- Add integration tests for the three repos that had none

## Test plan
- [ ] yarn nx test server passes
- [ ] yarn nx run-many -t typecheck passes
- [ ] settingsRepository.test.ts: findOne and upsert (including conflict update)
- [ ] resetLinkRepository.test.ts: insert, get, used
- [ ] signupLinkRepository.test.ts: insert, get, getByEmail, used
- [ ] precisionRepository.test.ts: link (replaces, removes), linkMany (replaces across housings)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
