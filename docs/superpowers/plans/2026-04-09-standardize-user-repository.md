# Standardize userRepository Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize `userRepository.ts` by extracting establishment logic into its own repository, replacing raw SQL with Knex, and renaming parse/format helpers and table constants to project conventions.

**Architecture:** Four independent refactors applied in sequence — each purely mechanical, no logic changes. (1) Extract `userEstablishmentRepository.ts`. (2) Rename table constants to `UPPER_SNAKE_CASE`. (3) Rename `parseUserApi` → `fromUserDBO`. (4) Rename `formatUserApi` → `toUserDBO`. Each commit leaves the project in a green state.

**Tech Stack:** TypeScript, Knex, Vitest

---

## File Map

| Action | File |
|--------|------|
| **Create** | `server/src/repositories/userEstablishmentRepository.ts` |
| **Modify** | `server/src/repositories/userRepository.ts` |
| **Modify** | `server/src/controllers/accountController.ts` |
| **Modify** | `server/src/controllers/userController.ts` |
| **Modify** | `server/src/repositories/groupRepository.ts` |
| **Modify** | `server/src/repositories/establishmentRepository.ts` |
| **Modify** | `server/src/repositories/documentRepository.ts` |
| **Modify** | `server/src/repositories/eventRepository.ts` |
| **Modify** | `server/src/repositories/housingDocumentRepository.ts` |
| **Modify** | `server/src/repositories/campaignRepository.ts` |
| **Modify** | `server/src/repositories/noteRepository.ts` |
| **Modify** | `server/src/controllers/test/user-api.test.ts` |
| **Modify** | `server/src/infra/database/seeds/development/20240404235457_users.ts` |
| **Modify** | `server/src/infra/database/seeds/production/20240405011127_users.ts` |
| **Modify** | `server/src/scripts/import-unified-owners/command.ts` |
| **Modify (rename)** | All 48 files importing `parseUserApi` or `formatUserApi` (listed in Tasks 3 & 4) |

---

## Task 1: Extract `userEstablishmentRepository.ts`

**Files:**
- Create: `server/src/repositories/userEstablishmentRepository.ts`
- Modify: `server/src/repositories/userRepository.ts`
- Modify: `server/src/controllers/accountController.ts`
- Modify: `server/src/controllers/userController.ts`

- [ ] **Step 1: Create `userEstablishmentRepository.ts`**

```typescript
// server/src/repositories/userEstablishmentRepository.ts
import type { UserEstablishment } from '@zerologementvacant/models';
import db from '~/infra/database';
import { logger } from '~/infra/logger';

export const USERS_ESTABLISHMENTS_TABLE = 'users_establishments';

export const UsersEstablishments = (transaction = db) =>
  transaction<UserEstablishmentDBO>(USERS_ESTABLISHMENTS_TABLE);

export interface UserEstablishmentDBO {
  user_id: string;
  establishment_id: string;
  establishment_siren: string;
  has_commitment: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

async function getAuthorizedEstablishments(
  userId: string
): Promise<UserEstablishment[]> {
  logger.debug('Get authorized establishments for user', userId);

  const results = await UsersEstablishments()
    .where('user_id', userId)
    .orderBy('created_at', 'asc');

  return results.map(fromUserEstablishmentDBO);
}

async function setAuthorizedEstablishments(
  userId: string,
  establishments: Array<{
    establishmentId: string;
    establishmentSiren: string;
    hasCommitment: boolean;
  }>
): Promise<void> {
  logger.info('Setting authorized establishments for user', {
    userId,
    count: establishments.length
  });

  await db.transaction(async (trx) => {
    await UsersEstablishments(trx).where('user_id', userId).delete();

    if (establishments.length > 0) {
      const now = new Date();
      await UsersEstablishments(trx).insert(
        establishments.map((e) => ({
          user_id: userId,
          establishment_id: e.establishmentId,
          establishment_siren: e.establishmentSiren,
          has_commitment: e.hasCommitment,
          created_at: now,
          updated_at: now
        }))
      );
    }
  });
}

async function addAuthorizedEstablishment(
  userId: string,
  establishment: {
    establishmentId: string;
    establishmentSiren: string;
    hasCommitment: boolean;
  }
): Promise<void> {
  logger.info('Adding authorized establishment for user', {
    userId,
    establishmentId: establishment.establishmentId
  });

  const now = new Date();
  await UsersEstablishments()
    .insert({
      user_id: userId,
      establishment_id: establishment.establishmentId,
      establishment_siren: establishment.establishmentSiren,
      has_commitment: establishment.hasCommitment,
      created_at: now,
      updated_at: now
    })
    .onConflict(['user_id', 'establishment_id'])
    .merge(['has_commitment', 'updated_at']);
}

async function hasAccessToEstablishment(
  userId: string,
  establishmentId: string
): Promise<boolean> {
  const result = await UsersEstablishments()
    .where({ user_id: userId, establishment_id: establishmentId })
    .first();

  return !!result;
}

async function isMultiStructure(userId: string): Promise<boolean> {
  const result = await UsersEstablishments()
    .where({ user_id: userId, has_commitment: true })
    .count('establishment_id as count')
    .first();

  const count = result as { count: string } | undefined;
  return Number(count?.count) > 1;
}

export const fromUserEstablishmentDBO = (
  dbo: UserEstablishmentDBO
): UserEstablishment => ({
  establishmentId: dbo.establishment_id,
  establishmentSiren: dbo.establishment_siren,
  hasCommitment: dbo.has_commitment
});

export default {
  getAuthorizedEstablishments,
  setAuthorizedEstablishments,
  addAuthorizedEstablishment,
  hasAccessToEstablishment,
  isMultiStructure
};
```

- [ ] **Step 2: Remove establishment code from `userRepository.ts`**

Remove these exports/declarations entirely:
- `export const usersEstablishmentsTable = 'users_establishments';`
- `export const UsersEstablishments = ...`
- `export interface UserEstablishmentDBO { ... }`
- Functions: `getAuthorizedEstablishments`, `setAuthorizedEstablishments`, `addAuthorizedEstablishment`, `hasAccessToEstablishment`, `isMultiStructure`
- `const parseUserEstablishment = ...`

Remove from the `export default { ... }` block:
- `getAuthorizedEstablishments`
- `setAuthorizedEstablishments`
- `addAuthorizedEstablishment`
- `hasAccessToEstablishment`
- `isMultiStructure`

Remove the import of `UserEstablishment` from `@zerologementvacant/models` if it is no longer used after this removal.

- [ ] **Step 3: Update `accountController.ts` imports**

Find the import of `userRepository`:
```typescript
import userRepository from '~/repositories/userRepository';
```
Add a new import below it:
```typescript
import userEstablishmentRepository from '~/repositories/userEstablishmentRepository';
```

Then replace all 5 call sites that use establishment functions through `userRepository`:
- `userRepository.getAuthorizedEstablishments(...)` → `userEstablishmentRepository.getAuthorizedEstablishments(...)`
- `userRepository.setAuthorizedEstablishments(...)` → `userEstablishmentRepository.setAuthorizedEstablishments(...)`
- `userRepository.isMultiStructure(...)` → `userEstablishmentRepository.isMultiStructure(...)`

- [ ] **Step 4: Update `userController.ts` imports**

Same pattern as Step 3 — add `userEstablishmentRepository` import and replace:
- `userRepository.setAuthorizedEstablishments(...)` → `userEstablishmentRepository.setAuthorizedEstablishments(...)`
- `userRepository.isMultiStructure(...)` → `userEstablishmentRepository.isMultiStructure(...)`

- [ ] **Step 5: Run tests to verify green**

```bash
yarn nx test server
```

Expected: all passing.

- [ ] **Step 6: Commit**

```bash
git add server/src/repositories/userEstablishmentRepository.ts server/src/repositories/userRepository.ts server/src/controllers/accountController.ts server/src/controllers/userController.ts
git commit -m "refactor(server): extract userEstablishmentRepository from userRepository"
```

---

## Task 2: Rename table constants to `UPPER_SNAKE_CASE`

**Files:**
- Modify: `server/src/repositories/userRepository.ts`
- Modify: `server/src/repositories/userEstablishmentRepository.ts` (already uses `USERS_ESTABLISHMENTS_TABLE`)
- Modify: `server/src/repositories/groupRepository.ts`
- Modify: `server/src/repositories/establishmentRepository.ts`
- Modify: `server/src/repositories/documentRepository.ts`
- Modify: `server/src/repositories/eventRepository.ts`
- Modify: `server/src/repositories/housingDocumentRepository.ts`
- Modify: `server/src/repositories/campaignRepository.ts`
- Modify: `server/src/repositories/noteRepository.ts`
- Modify: `server/src/controllers/test/user-api.test.ts`
- Modify: `server/src/infra/database/seeds/development/20240404235457_users.ts`
- Modify: `server/src/infra/database/seeds/production/20240405011127_users.ts`
- Modify: `server/src/scripts/import-unified-owners/command.ts`

- [ ] **Step 1: Rename `usersTable` → `USERS_TABLE` in `userRepository.ts`**

Change the export declaration:
```typescript
// Before
export const usersTable = 'users';
export const Users = (transaction = db) => transaction<UserDBO>(usersTable);

// After
export const USERS_TABLE = 'users';
export const Users = (transaction = db) => transaction<UserDBO>(USERS_TABLE);
```

Replace all internal uses of `usersTable` within `userRepository.ts`:
```typescript
// Every occurrence of usersTable → USERS_TABLE inside the file
```

- [ ] **Step 2: Bulk rename `usersTable` → `USERS_TABLE` across consumers**

Run from the repo root:

```bash
# Rename the identifier in all TS files under server/src (excluding userRepository.ts already done)
for f in \
  server/src/repositories/groupRepository.ts \
  server/src/repositories/establishmentRepository.ts \
  server/src/repositories/documentRepository.ts \
  server/src/repositories/eventRepository.ts \
  server/src/repositories/housingDocumentRepository.ts \
  server/src/repositories/campaignRepository.ts \
  server/src/repositories/noteRepository.ts \
  server/src/controllers/test/user-api.test.ts \
  "server/src/infra/database/seeds/development/20240404235457_users.ts" \
  "server/src/infra/database/seeds/production/20240405011127_users.ts" \
  server/src/scripts/import-unified-owners/command.ts; do
  sed -i '' 's/\busersTable\b/USERS_TABLE/g' "$f"
done
```

- [ ] **Step 3: Run tests to verify green**

```bash
yarn nx test server
```

Expected: all passing.

- [ ] **Step 4: Commit**

```bash
git add -p
git commit -m "refactor(server): rename usersTable → USERS_TABLE, usersEstablishmentsTable → USERS_ESTABLISHMENTS_TABLE"
```

---

## Task 3: Rename `parseUserApi` → `fromUserDBO`

**Files (49 files):**

Production repositories (import the function by name):
- `server/src/repositories/userRepository.ts`
- `server/src/repositories/groupRepository.ts`
- `server/src/repositories/documentRepository.ts`
- `server/src/repositories/noteRepository.ts`
- `server/src/repositories/establishmentRepository.ts`
- `server/src/repositories/campaignRepository.ts`
- `server/src/repositories/eventRepository.ts`

Seeds:
- `server/src/infra/database/seeds/development/20240404235731_groups.ts`
- `server/src/infra/database/seeds/development/20241001160603_perimeters.ts`
- `server/src/infra/database/seeds/development/20240807073309_campaigns.ts`
- `server/src/infra/database/seeds/development/lib/events-helpers.ts`

- [ ] **Step 1: Rename the definition in `userRepository.ts`**

```typescript
// Before
export const parseUserApi = (userDBO: UserDBO): UserApi => ({

// After
export const fromUserDBO = (userDBO: UserDBO): UserApi => ({
```

Replace the 5 call sites inside `userRepository.ts` (`parseUserApi(result)` → `fromUserDBO(result)`).

- [ ] **Step 2: Bulk rename `parseUserApi` → `fromUserDBO` across all consumers**

```bash
for f in \
  server/src/repositories/groupRepository.ts \
  server/src/repositories/documentRepository.ts \
  server/src/repositories/noteRepository.ts \
  server/src/repositories/establishmentRepository.ts \
  server/src/repositories/campaignRepository.ts \
  server/src/repositories/eventRepository.ts \
  "server/src/infra/database/seeds/development/20240404235731_groups.ts" \
  "server/src/infra/database/seeds/development/20241001160603_perimeters.ts" \
  "server/src/infra/database/seeds/development/20240807073309_campaigns.ts" \
  "server/src/infra/database/seeds/development/lib/events-helpers.ts"; do
  sed -i '' 's/\bparseUserApi\b/fromUserDBO/g' "$f"
done
```

- [ ] **Step 3: Run tests**

```bash
yarn nx test server
```

Expected: all passing.

- [ ] **Step 4: Commit**

```bash
git add -p
git commit -m "refactor(server): rename parseUserApi → fromUserDBO"
```

---

## Task 4: Rename `formatUserApi` → `toUserDBO`

**Files (49 files):**

Production:
- `server/src/repositories/userRepository.ts` (definition + 2 call sites)
- `server/src/infra/database/seeds/development/20240404235457_users.ts`
- `server/src/infra/database/seeds/production/20240405011127_users.ts`

Test files (import the function to seed DB rows):
- `server/src/controllers/accountController.test.ts`
- `server/src/controllers/datafoncierHousingController.test.ts`
- `server/src/controllers/geoController.test.ts`
- `server/src/controllers/groupController.test.ts`
- `server/src/controllers/localityController.test.ts`
- `server/src/controllers/noteController.test.ts`
- `server/src/controllers/prospectController.test.ts`
- `server/src/controllers/resetLinkController.test.ts`
- `server/src/controllers/settingsController.test.ts`
- `server/src/controllers/signupLinkController.test.ts`
- `server/src/controllers/test/buildingController.test.ts`
- `server/src/controllers/test/campaign-api.test.ts`
- `server/src/controllers/test/document-api.test.ts`
- `server/src/controllers/test/draft-api.test.ts`
- `server/src/controllers/test/establishment-api.test.ts`
- `server/src/controllers/test/event-api.test.ts`
- `server/src/controllers/test/fileController.test.ts`
- `server/src/controllers/test/housing-api.test.ts`
- `server/src/controllers/test/housing-owner-api.test.ts`
- `server/src/controllers/test/owner-api.test.ts`
- `server/src/controllers/test/precisionController.test.ts`
- `server/src/controllers/test/serverSentEventController.test.ts`
- `server/src/controllers/test/user-api.test.ts`
- `server/src/repositories/test/campaignHousingRepository.test.ts`
- `server/src/repositories/test/campaignRepository.test.ts`
- `server/src/repositories/test/documentRepository.test.ts`
- `server/src/repositories/test/draftRepository.test.ts`
- `server/src/repositories/test/establishmentRepository.test.ts`
- `server/src/repositories/test/eventRepository.test.ts`
- `server/src/repositories/test/geoRepository.test.ts`
- `server/src/repositories/test/groupRepository.test.ts`
- `server/src/repositories/test/housingDocumentRepository.test.ts`
- `server/src/repositories/test/housingRepository.test.ts`
- `server/src/repositories/test/noteRepository.test.ts`
- `server/src/scripts/import-lovac/source-housings/test/source-housing-command.test.ts`
- `server/src/scripts/import-lovac/source-housing-owners/test/source-housing-owner-command.test.ts`

- [ ] **Step 1: Rename the definition in `userRepository.ts`**

```typescript
// Before
export const formatUserApi = (userApi: UserApi): UserDBO => ({

// After
export const toUserDBO = (userApi: UserApi): UserDBO => ({
```

Replace the 2 call sites inside `userRepository.ts` (`formatUserApi(userApi)` → `toUserDBO(userApi)` on lines ~48, ~54).

- [ ] **Step 2: Bulk rename `formatUserApi` → `toUserDBO` across all consumers**

```bash
grep -rl 'formatUserApi' server/src --include='*.ts' | grep -v 'userRepository.ts' | xargs sed -i '' 's/\bformatUserApi\b/toUserDBO/g'
```

- [ ] **Step 3: Run tests**

```bash
yarn nx test server
```

Expected: all passing.

- [ ] **Step 4: Commit**

```bash
git add -p
git commit -m "refactor(server): rename formatUserApi → toUserDBO"
```
