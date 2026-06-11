# Factories — Campaign Slice & API Revision

**Date:** 2026-06-11
**Status:** Draft (awaiting user review)
**Supersedes (partially):** `2026-04-13-factories-design.md` — sections on `Adapter` contract, `createFactories` shape, and per-entity factory signatures.

## Context

Since the initial `@zerologementvacant/factories` design landed (April 2026), only two consumer integrations exist: `server/src/test/factories.ts` (a thin server-side wrapper exposing `forEstablishment()` sugar) and `server/src/controllers/test/campaign-api.test.ts` (the lone test using it). The wider refactor — replacing `gen*Api` (server) and `gen*` (frontend) with the factories package — is ~3% complete on the server (2/80 files) and 0% on the frontend.

Reattempting the migration surfaced an API problem: the campaign factory needs to know an establishment to persist (the `campaigns.establishment_id` column is required at the database layer), but `CampaignDTO` deliberately omits `establishmentId` from the API contract. The first server wrapper smuggled the establishment through `createdBy.establishmentId`, conflating "the campaign's establishment" with "the user's establishment" — they are conceptually independent.

This slice fixes the API for that case, ships a frontend MSW adapter, migrates campaign consumers end-to-end, and uses that work to validate a pattern we can apply to other entities later.

## Goals

- Express "this factory produces a `CampaignDTO`; constructing it requires an establishment for persistence" with **compile-time enforcement** at call sites.
- Keep `CampaignDTO` clean — no establishment leaks into the produced DTO.
- Ship `MswAdapter` so frontend tests can persist DTOs into `frontend/src/mocks/handlers/data`.
- Migrate every `genCampaignApi` / `genCampaignApiNext` / `genCampaign()` consumer in scope to the package factories.
- Retire the `forEstablishment()` wrapper classes in `server/src/test/factories.ts` (the file collapses to a one-line re-export of `createFactories(knexAdapter)`).
- Validate the pattern is small enough to repeat for the remaining entities in follow-up slices.

## Non-goals

- Migrating other entities (housing, owner, note, event, draft, sender, etc.) or their test fixtures.
- Touching `gen*DTO()` definitions in `@zerologementvacant/models/fixtures`. They stay for now; only the migrated test files stop importing from them.
- Database seeds (`server/src/infra/database/seeds/development/*.ts`). Seeds are separate from tests and migrate later.
- Adding any new entity to `@zerologementvacant/factories`.

## Scope of consumer changes

**Entities exercised by this slice:** `campaign` (primary), `group`, `user`, `establishment` (transitively required).

**Server tests in scope (10 files):**

- `controllers/test/campaign-api.test.ts` (already partially migrated; finish in Wave 1)
- `repositories/test/campaignRepository.test.ts`
- `repositories/test/campaignHousingRepository.test.ts`
- `repositories/test/draftRepository.test.ts`
- `repositories/test/housingRepository.test.ts`
- `repositories/test/eventRepository.test.ts`
- `controllers/groupController.test.ts`
- `controllers/test/housing-api.test.ts`
- `controllers/test/event-api.test.ts`
- `controllers/test/draft-api.test.ts`

**Frontend tests in scope (3 files):**

- `views/Campaign/test/CampaignListView.test.tsx`
- `views/Campaign/test/CampaignView.test.tsx`
- `views/HousingList/test/HousingListView.test.tsx`

**Fixture helpers retired by this slice:**

- `genCampaignApi`, `genCampaignApiNext` in `server/src/test/testFixtures.ts`
- `genCampaign()` in `frontend/src/test/fixtures.ts`
- `ServerCampaignFactory`, `ServerGroupFactory`, and `createServerFactories` in `server/src/test/factories.ts` (the file is rewritten to a one-line re-export of `createFactories(knexAdapter)`)
- `genCampaignDTO` in `@zerologementvacant/models/fixtures` **stays** — out-of-scope tests still consume it. It is retired in a later slice when its last consumer is gone.

## API revisions to `@zerologementvacant/factories`

### Adapter contract grows a per-table context

```ts
// adapter.ts
export type AdapterContext = {
  campaigns: { establishmentId: string };
  groups:    { establishmentId: string };
  // every other table omitted -> no context required
};

export type ContextArgs<K extends keyof EntityMap> =
  K extends keyof AdapterContext ? [context: AdapterContext[K]] : [];

export interface Adapter {
  create<K extends keyof EntityMap>(
    table: K,
    entity: EntityMap[K],
    ...args: ContextArgs<K>
  ): Promise<EntityMap[K]>;
}
```

`ContextArgs<K>` is a **rest-tuple discriminator**: empty for unscoped tables, `[context: { establishmentId }]` for `campaigns`/`groups`. Call sites for unscoped tables pass nothing extra; scoped tables require the context arg at compile time. `AdapterContext` and `ContextArgs` are re-exported from the package `index.ts` for use by adapter implementations (`KnexAdapter`, `MswAdapter`).

### `Factories` shape

```ts
export interface Factories {
  establishment: Factory<EstablishmentDTO>;
  user:          Factory<UserDTO>;
  owner:         Factory<OwnerDTO>;
  housing:       Factory<HousingDTO>;
  campaign:      (establishment: EstablishmentDTO) => Factory<CampaignDTO>;
  group:         (establishment: EstablishmentDTO) => Factory<GroupDTO>;
}

export default function createFactories(adapter: Adapter): Factories {
  return {
    establishment: createEstablishmentFactory(adapter),
    user:          createUserFactory(adapter),
    owner:         createOwnerFactory(adapter),
    housing:       createHousingFactory(adapter),
    campaign: (establishment) => createCampaignFactory(adapter, establishment),
    group:    (establishment) => createGroupFactory(adapter, establishment),
  };
}
```

`campaign` and `group` are **factory-of-factories**: callers invoke them with the establishment, getting back a `Factory<CampaignDTO>` / `Factory<GroupDTO>` scoped to that establishment. The factory's visible type is clean — no transient slot for the establishment.

### Scoped factory closes over the establishment

```ts
// factories/campaign.ts
export function createCampaignFactory(
  adapter: Adapter,
  establishment: EstablishmentDTO
) {
  return Factory.define<CampaignDTO>(({ associations }) => {
    if (!associations.createdBy) {
      throw new Error('Campaign factory: createdBy association is required.');
    }
    return {
      id: faker.string.uuid(),
      title: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      status: 'draft',
      filters: {},
      createdAt: faker.date.past().toJSON(),
      createdBy: associations.createdBy,
      sentAt: null,
      housingCount: 0,
      ownerCount: 0,
      returnCount: 0,
      returnRate: null,
      // no establishmentId — not part of CampaignDTO
    };
  }).onCreate(entity =>
    adapter.create('campaigns', entity, { establishmentId: establishment.id })
  );
}
```

The same pattern applies to `createGroupFactory`.

### `MemoryAdapter` accepts context, ignores it

```ts
export class MemoryAdapter implements Adapter {
  private store = new Map<string, EntityMap[keyof EntityMap][]>();

  async create<K extends keyof EntityMap>(
    table: K,
    entity: EntityMap[K],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ..._args: ContextArgs<K>
  ): Promise<EntityMap[K]> {
    const rows = (this.store.get(table) ?? []) as EntityMap[K][];
    this.store.set(table, [...rows, entity]);
    return entity;
  }
}
```

The in-memory store doesn't need establishment scoping; the rest-tuple slot is part of the contract but unused.

### Package tests

`packages/factories/src/test/create-factories.test.ts` updates to:

- Build/create campaigns and groups via `factories.campaign(establishment).create(...)`.
- Assert that the returned DTO does not have `establishmentId`.
- Assert that `MemoryAdapter` receives `{ establishmentId }` as context for campaigns and groups.

## Server changes

### `KnexAdapter` reads context

```ts
async create<K extends keyof EntityMap>(
  table: K,
  entity: EntityMap[K],
  ...args: ContextArgs<K>
): Promise<EntityMap[K]> {
  await match(table)
    .with('campaigns', async () => {
      const campaign = entity as EntityMap['campaigns'];
      const [{ establishmentId }] = args as ContextArgs<'campaigns'>;
      await Campaigns().insert(formatCampaignApi({
        ...campaign,
        userId: campaign.createdBy.id,
        establishmentId,  // from args, not createdBy
      }));
    })
    .with('groups', async () => {
      const group = entity as EntityMap['groups'];
      const [{ establishmentId }] = args as ContextArgs<'groups'>;
      await Groups().insert(formatGroupApi({
        ...group,
        createdBy: group.createdBy ? fromUserDTO(group.createdBy) : undefined,
        userId: group.createdBy?.id,
        establishmentId,
        createdAt: new Date(group.createdAt),
        exportedAt: null,
        archivedAt: group.archivedAt ? new Date(group.archivedAt) : null,
      }));
    })
    .with('users',          async () => { await Users().insert(toUserDBO(fromUserDTO(entity as EntityMap['users']))); })
    .with('establishments', async () => { await Establishments().insert(formatEstablishmentApi(entity as EntityMap['establishments'])); })
    .with('owners',         async () => { await Owners().insert(formatOwnerApi({ ...(entity as EntityMap['owners']), entity: null })); })
    .with('housings',       async () => {
      const housing = Struct.omit(entity as EntityMap['housings'], 'owner');
      await Housing().insert(formatHousingRecordApi({
        ...housing,
        buildingGroupId: null,
        geolocation: null,
        occupancyRegistered: housing.occupancy,
      }));
    })
    .exhaustive();
  return entity;
}
```

The old "createdBy.establishmentId required — use ServerCampaignFactory" error messages disappear.

### `server/src/test/factories.ts` collapsed to a one-line re-export

The wrapper classes (`ServerCampaignFactory`, `ServerGroupFactory`) and the `createServerFactories` function are deleted. The file is kept as a thin re-export so consumers get a stable, short import:

```ts
// server/src/test/factories.ts
import createFactories from '@zerologementvacant/factories';
import { knexAdapter } from './knex-adapter';

export const factories = createFactories(knexAdapter);
```

Symmetric with `frontend/src/test/factories.ts`. Consumers import `{ factories }` from `~/test/factories`.

## Frontend additions

### `frontend/src/test/msw-adapter.ts` (new)

```ts
import type { Adapter, ContextArgs, EntityMap } from '@zerologementvacant/factories';
import { match } from 'ts-pattern';
import data from '~/mocks/handlers/data';

export class MswAdapter implements Adapter {
  async create<K extends keyof EntityMap>(
    table: K,
    entity: EntityMap[K],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ..._args: ContextArgs<K>
  ): Promise<EntityMap[K]> {
    match(table as keyof EntityMap)
      .with('establishments', () => { data.establishments.push(entity as EntityMap['establishments']); })
      .with('users',          () => { data.users.push(entity as EntityMap['users']); })
      .with('owners',         () => { data.owners.push(entity as EntityMap['owners']); })
      .with('housings',       () => { data.housings.push(entity as EntityMap['housings']); })
      .with('campaigns',      () => { data.campaigns.push(entity as EntityMap['campaigns']); })
      .with('groups',         () => { data.groups.push(entity as EntityMap['groups']); })
      .exhaustive();
    return entity;
  }
}

export const mswAdapter = new MswAdapter();
```

Context is part of the contract for typed tables but unused — MSW's `data.campaigns` mirrors the DTO shape (no `establishmentId` column).

### `frontend/src/test/factories.ts` (new)

```ts
import createFactories from '@zerologementvacant/factories';
import { mswAdapter } from './msw-adapter';

export const factories = createFactories(mswAdapter);
```

Frontend tests import `factories` from `~/test/factories` and use it directly. No per-establishment binding at module load.

## Migration plan — two waves, one PR

### Wave 1 — package + adapters + bootstrap consumer

- Apply the API revisions to `@zerologementvacant/factories` (Adapter, AdapterContext, MemoryAdapter, campaign/group factories, createFactories).
- Update package tests.
- Update `KnexAdapter` to read context for `campaigns` / `groups`.
- Rewrite `server/src/test/factories.ts` to a one-line re-export of `createFactories(knexAdapter)`.
- Add `frontend/src/test/msw-adapter.ts` and `frontend/src/test/factories.ts`.
- Update `server/src/controllers/test/campaign-api.test.ts` (the only existing consumer of the old `createServerFactories`) to the new API.

After Wave 1: all other tests still pass because they use `genCampaignApi` / `genCampaignDTO` directly, which is untouched.

### Wave 2 — migrate remaining campaign consumers

The 9 remaining server files (everything in the scope list above except `campaign-api.test.ts`) plus the 3 frontend files migrate in this wave, one commit per file.

For each server file, replace:

```ts
// old
const campaign = genCampaignApi(establishment.id, user, group);
// or
const campaign = genCampaignApiNext({ group, establishment, creator: user });
```

with:

```ts
// new
const campaign = await factories
  .campaign(establishment)
  .create({ groupId: group?.id }, { associations: { createdBy: user } });
```

For each frontend file, replace:

```ts
// old
{ ...genCampaignDTO(), housingCount: 10 }
```

with:

```ts
// new — for MSW assertions, use .build() since handlers serve from data.campaigns
factories.campaign(establishment).build({ housingCount: 10 }, { associations: { createdBy: user } })
```

When the test needs the campaign in MSW's `data.campaigns` store, replace with `.create(...)`.

Establishments and users in each test bootstrap via `factories.establishment.create()` and `factories.user.create({ establishmentId: establishment.id })`.

### Retirement

After Wave 2 the following are deleted:

- `genCampaignApi`, `genCampaignApiNext` exports in `server/src/test/testFixtures.ts`.
- `genCampaign()` export in `frontend/src/test/fixtures.ts`.

`genCampaignDTO()` in `@zerologementvacant/models/fixtures` stays.

## Risks and open questions

- **Fishery `onCreate` signature.** The current package implementation uses `.onCreate(entity => ...)` with one argument. Closing over the establishment in `createCampaignFactory` sidesteps any need to access transients inside `onCreate`. Verify on package implementation that fishery 2.4 accepts this shape (no changes required vs current code).
- **Tests that build many campaigns under one establishment.** Suggested ergonomics: alias the scoped factory once.

  ```ts
  const campaigns = factories.campaign(establishment);
  const c1 = await campaigns.create({}, { associations: { createdBy: user } });
  const c2 = await campaigns.create({}, { associations: { createdBy: user } });
  ```

- **Tests that build campaigns under multiple establishments.** Each establishment scopes its own factory; no shared global. This is a correctness improvement — establishment is named at the call site.
- **MSW handlers that need an `establishmentId` join.** None of the campaign handlers currently filter by establishment (they filter by group). If a follow-up handler needs it, it joins via `data.users.find(u => u.id === campaign.createdBy.id).establishmentId` or similar — but that's a handler concern, not the factory's.
- **`genCampaignDTO` in `@zerologementvacant/models/fixtures` stays for now.** It is consumed by tests outside this slice. A later slice retires it when no consumers remain.
- **No `MemoryAdapter` test for context.** The package test for `MemoryAdapter` ignores context. Acceptable — the contract requires it but the in-memory store doesn't use it.

## Out of scope (parking lot)

- Migrating other entities (`note`, `event`, `housing`, `owner`, `draft`, `sender`, `prospect`, `building`, `signupLink`, dashboard cards, datafoncier types, document, address, locality, geo perimeter, precision, signatory, housingOwner, housingDocument, reset link).
- Migrating the seed files in `server/src/infra/database/seeds/development/`.
- Retiring `gen*DTO()` definitions in `@zerologementvacant/models/fixtures` (still has consumers).
- Adding `Factory.params(...)` ergonomics or higher-level helpers like `factories.scopedTo(establishment)`. The factory-of-factories shape is the only ergonomic surface in this slice.
