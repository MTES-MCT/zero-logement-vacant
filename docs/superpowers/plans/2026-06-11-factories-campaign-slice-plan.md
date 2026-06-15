# Factories Campaign Slice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revise `@zerologementvacant/factories` so campaign/group factories thread `establishmentId` through a typed adapter context (not via `createdBy.establishmentId`), ship a frontend `MswAdapter`, and migrate every `genCampaignApi` / `genCampaignApiNext` / `genCampaign()` consumer to the new API.

**Architecture:** `Adapter.create(table, entity, context)` grows a per-table typed `AdapterContext`. `campaigns` and `groups` carry `{ establishmentId }`; all other tables take `void`. The campaign and group factories become **factory-of-factories** — `factories.campaign(establishment)` returns a `Factory<CampaignDTO>` scoped to that establishment, enforcing the establishment requirement at compile time without leaking into the DTO type.

**Tech Stack:** TypeScript, fishery 2.4.0, vitest, @faker-js/faker, ts-pattern, knex (server), msw (frontend).

**Spec:** `docs/superpowers/specs/2026-06-11-factories-campaign-slice-design.md`

---

## Conventions used in this plan

- Project names for Nx commands: `factories`, `server`, `frontend`. Run all commands from the repo root.
- Tests use vitest. Run a single file with `yarn nx test <project> -- <path>`.
- Pre-commit Husky hooks run lint. If a commit fails because of lint, fix and re-commit (do not use `--no-verify`).
- Commit messages follow workspace scopes: `feat(factories)`, `refactor(server)`, `test(front)` — never subdirectory names.

---

## Wave 1 — Package API revision

### Task 1: Add `AdapterContext` and `ContextArgs` types

**Files:**

- Modify: `packages/factories/src/adapter.ts`

- [ ] **Step 1: Replace `packages/factories/src/adapter.ts`**

```ts
import type { EntityMap } from './entity-map';

export type AdapterContext = {
  campaigns: { establishmentId: string };
  groups: { establishmentId: string };
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

`ContextArgs<K>` is a **rest-tuple discriminator**: empty for unscoped tables, `[context: { establishmentId }]` for `campaigns`/`groups`. Call sites for unscoped tables pass nothing extra; scoped tables require the context arg at compile time.

- [ ] **Step 2: Re-export the new types from the package**

Modify `packages/factories/src/index.ts`:

```ts
export type { Adapter, AdapterContext, ContextArgs } from './adapter';
export type { EntityMap } from './entity-map';
export { MemoryAdapter } from './memory-adapter';
export type { Factories } from './create-factories';
export { default } from './create-factories';
```

- [ ] **Step 3: Run typecheck to confirm the package fails compilation (expected — MemoryAdapter signature is stale)**

Run: `yarn nx typecheck factories`
Expected: FAIL with errors in `memory-adapter.ts` (mismatched `create` signature).

This proves the new contract is in effect. The next tasks fix the consumers.

- [ ] **Step 4: No commit yet — Tasks 1–3 commit together once the package compiles cleanly.**

---

### Task 2: Update `MemoryAdapter` to accept and ignore context

**Files:**

- Modify: `packages/factories/src/memory-adapter.ts`

- [ ] **Step 1: Replace `packages/factories/src/memory-adapter.ts`**

```ts
import type { Adapter, ContextArgs } from './adapter';
import type { EntityMap } from './entity-map';

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

- [ ] **Step 2: Update `packages/factories/src/test/memory-adapter.test.ts` to pass the new third arg**

```ts
import { describe, expect, it } from 'vitest';
import type { UserDTO } from '@zerologementvacant/models';
import { MemoryAdapter } from '../memory-adapter';

describe('MemoryAdapter', () => {
  it('creates an entity and returns it unchanged', async () => {
    const adapter = new MemoryAdapter();
    const user = {
      id: 'user-1',
      email: 'test@example.com'
    } as UserDTO;

    const result = await adapter.create('users', user);

    expect(result).toBe(user);
  });

  it('forwards establishment context for campaigns without mutating the entity', async () => {
    const adapter = new MemoryAdapter();
    const campaign = { id: 'campaign-1' } as unknown as CampaignDTO;

    const result = await adapter.create('campaigns', campaign, {
      establishmentId: 'establishment-1'
    });

    expect(result).toBe(campaign);
    expect(result).not.toHaveProperty('establishmentId');
  });
});
```

- [ ] **Step 3: Run the MemoryAdapter test**

Run: `yarn nx test factories -- memory-adapter`
Expected: PASS (both cases).

---

### Task 3: Convert campaign factory to closure-over-establishment

**Files:**

- Modify: `packages/factories/src/factories/campaign.ts`

- [ ] **Step 1: Replace `packages/factories/src/factories/campaign.ts`**

```ts
import { faker } from '@faker-js/faker/locale/fr';
import {
  type CampaignDTO,
  type EstablishmentDTO
} from '@zerologementvacant/models';
import { Factory } from 'fishery';

import type { Adapter } from '../adapter';

export function createCampaignFactory(
  adapter: Adapter,
  establishment: EstablishmentDTO
) {
  return Factory.define<CampaignDTO>(({ associations }) => {
    if (!associations.createdBy) {
      throw new Error(
        'Campaign factory: createdBy association is required. ' +
          'Pass it via: factory.build({}, { associations: { createdBy: user } })'
      );
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
      returnRate: null
    };
  }).onCreate((entity) =>
    adapter.create('campaigns', entity, { establishmentId: establishment.id })
  );
}
```

Notes:

- The signature now takes `establishment` as a second arg.
- The DTO still has no `establishmentId` field — it lives only in the adapter context.

---

### Task 4: Convert group factory to closure-over-establishment

**Files:**

- Modify: `packages/factories/src/factories/group.ts`

- [ ] **Step 1: Replace `packages/factories/src/factories/group.ts`**

```ts
import { Factory } from 'fishery';
import { faker } from '@faker-js/faker/locale/fr';
import {
  type EstablishmentDTO,
  type GroupDTO
} from '@zerologementvacant/models';
import type { Adapter } from '../adapter';

export function createGroupFactory(
  adapter: Adapter,
  establishment: EstablishmentDTO
) {
  return Factory.define<GroupDTO>(({ associations }) => {
    if (!associations.createdBy) {
      throw new Error(
        'Group factory: createdBy association is required. ' +
          'Pass it via: factory.build({}, { associations: { createdBy: user } })'
      );
    }
    return {
      id: faker.string.uuid(),
      title: faker.commerce.productName(),
      description: faker.lorem.sentence(),
      housingCount: 0,
      ownerCount: 0,
      createdAt: new Date().toJSON(),
      createdBy: associations.createdBy,
      archivedAt: null
    };
  }).onCreate((entity) =>
    adapter.create('groups', entity, { establishmentId: establishment.id })
  );
}
```

Notes:

- `GroupDTO.createdBy` is non-optional in the produced DTO; the factory throws if no association is provided. (The current factory omits this guard — added now for consistency with campaign.)
- Verify `GroupDTO.createdBy` is a required field by reading `packages/models/src/GroupDTO.ts`. If it's optional, drop the `createdBy` assignment and the throw.

---

### Task 5: Reshape `createFactories` to factory-of-factories for campaign/group

**Files:**

- Modify: `packages/factories/src/create-factories.ts`

- [ ] **Step 1: Replace `packages/factories/src/create-factories.ts`**

```ts
import type {
  CampaignDTO,
  EstablishmentDTO,
  GroupDTO,
  HousingDTO,
  OwnerDTO,
  UserDTO
} from '@zerologementvacant/models';
import type { Factory } from 'fishery';

import type { Adapter } from './adapter';
import { createCampaignFactory } from './factories/campaign';
import { createEstablishmentFactory } from './factories/establishment';
import { createGroupFactory } from './factories/group';
import { createHousingFactory } from './factories/housing';
import { createOwnerFactory } from './factories/owner';
import { createUserFactory } from './factories/user';

export interface Factories {
  campaign: (establishment: EstablishmentDTO) => Factory<CampaignDTO>;
  establishment: Factory<EstablishmentDTO>;
  group: (establishment: EstablishmentDTO) => Factory<GroupDTO>;
  housing: Factory<HousingDTO>;
  owner: Factory<OwnerDTO>;
  user: Factory<UserDTO>;
}

export default function createFactories(adapter: Adapter): Factories {
  return {
    campaign: (establishment) => createCampaignFactory(adapter, establishment),
    establishment: createEstablishmentFactory(adapter),
    group: (establishment) => createGroupFactory(adapter, establishment),
    housing: createHousingFactory(adapter),
    owner: createOwnerFactory(adapter),
    user: createUserFactory(adapter)
  };
}
```

- [ ] **Step 2: Run typecheck to confirm the package compiles**

Run: `yarn nx typecheck factories`
Expected: PASS.

---

### Task 6: Update `createFactories` package tests for the new shape

**Files:**

- Modify: `packages/factories/src/test/create-factories.test.ts`

- [ ] **Step 1: Replace `packages/factories/src/test/create-factories.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import createFactories, { MemoryAdapter } from '../index';

describe('createFactories', () => {
  it('returns factories for all entities', () => {
    const factories = createFactories(new MemoryAdapter());

    expect(factories.user).toBeDefined();
    expect(factories.establishment).toBeDefined();
    expect(factories.owner).toBeDefined();
    expect(factories.housing).toBeDefined();
    expect(typeof factories.group).toBe('function');
    expect(typeof factories.campaign).toBe('function');
  });

  it('each unscoped factory builds its entity', () => {
    const factories = createFactories(new MemoryAdapter());

    expect(factories.user.build().id).toBeDefined();
    expect(factories.establishment.build().siren).toBeDefined();
    expect(factories.owner.build().fullName).toBeDefined();
    expect(factories.housing.build().geoCode).toBeDefined();
  });

  it('scoped campaign factory builds a CampaignDTO with no establishmentId', () => {
    const factories = createFactories(new MemoryAdapter());
    const establishment = factories.establishment.build();
    const user = factories.user.build();

    const campaign = factories
      .campaign(establishment)
      .build({}, { associations: { createdBy: user } });

    expect(campaign.id).toBeDefined();
    expect(campaign.status).toBeDefined();
    expect(campaign).not.toHaveProperty('establishmentId');
  });

  it('scoped group factory builds a GroupDTO with no establishmentId', () => {
    const factories = createFactories(new MemoryAdapter());
    const establishment = factories.establishment.build();
    const user = factories.user.build();

    const group = factories
      .group(establishment)
      .build({}, { associations: { createdBy: user } });

    expect(group.id).toBeDefined();
    expect(group.title).toBeDefined();
    expect(group).not.toHaveProperty('establishmentId');
  });

  it('campaign.create forwards establishmentId as adapter context', async () => {
    const calls: Array<{ table: string; context: unknown }> = [];
    const adapter = {
      async create(table: string, entity: unknown, context: unknown) {
        calls.push({ table, context });
        return entity as never;
      }
    };
    const factories = createFactories(adapter as never);
    const establishment = factories.establishment.build();
    const user = factories.user.build();

    await factories
      .campaign(establishment)
      .create({}, { associations: { createdBy: user } });

    expect(calls).toEqual([
      { table: 'campaigns', context: { establishmentId: establishment.id } }
    ]);
  });

  it('group.create forwards establishmentId as adapter context', async () => {
    const calls: Array<{ table: string; context: unknown }> = [];
    const adapter = {
      async create(table: string, entity: unknown, context: unknown) {
        calls.push({ table, context });
        return entity as never;
      }
    };
    const factories = createFactories(adapter as never);
    const establishment = factories.establishment.build();
    const user = factories.user.build();

    await factories
      .group(establishment)
      .create({}, { associations: { createdBy: user } });

    expect(calls).toEqual([
      { table: 'groups', context: { establishmentId: establishment.id } }
    ]);
  });
});
```

- [ ] **Step 2: Run all package tests**

Run: `yarn nx test factories`
Expected: PASS (all `create-factories.test.ts` cases and the `memory-adapter.test.ts` updates from Task 2).

- [ ] **Step 3: Commit the package changes**

```bash
git add packages/factories/src/adapter.ts \
        packages/factories/src/memory-adapter.ts \
        packages/factories/src/factories/campaign.ts \
        packages/factories/src/factories/group.ts \
        packages/factories/src/create-factories.ts \
        packages/factories/src/index.ts \
        packages/factories/src/test/memory-adapter.test.ts \
        packages/factories/src/test/create-factories.test.ts
git commit -m "$(cat <<'EOF'
feat(factories): scope campaign and group factories with an establishment

Adapter.create grows a per-table AdapterContext. campaigns and groups
carry { establishmentId }; other tables take void. createFactories
exposes campaign and group as (establishment) => Factory<DTO>, enforcing
the establishment requirement at compile time without leaking it into
the produced DTO.
EOF
)"
```

---

## Wave 1.5 — Server adapter changes

### Task 7: Update `KnexAdapter` to read context for campaigns and groups

**Files:**

- Modify: `server/src/test/knex-adapter.ts`

- [ ] **Step 1: Replace `server/src/test/knex-adapter.ts`**

```ts
import type {
  Adapter,
  ContextArgs,
  EntityMap
} from '@zerologementvacant/factories';
import { Struct } from 'effect';
import { match } from 'ts-pattern';
import { fromUserDTO } from '~/models/UserApi';
import {
  Campaigns,
  formatCampaignApi
} from '~/repositories/campaignRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { formatGroupApi, Groups } from '~/repositories/groupRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import { toUserDBO, Users } from '~/repositories/userRepository';

export class KnexAdapter implements Adapter {
  async create<K extends keyof EntityMap>(
    table: K,
    entity: EntityMap[K],
    ...args: ContextArgs<K>
  ): Promise<EntityMap[K]> {
    await match(table as keyof EntityMap)
      .with('users', async () => {
        const user = entity as EntityMap['users'];
        await Users().insert(toUserDBO(fromUserDTO(user)));
      })
      .with('establishments', async () => {
        const establishment = entity as EntityMap['establishments'];
        await Establishments().insert(formatEstablishmentApi(establishment));
      })
      .with('owners', async () => {
        const owner = entity as EntityMap['owners'];
        await Owners().insert(formatOwnerApi({ ...owner, entity: null }));
      })
      .with('housings', async () => {
        const housing = Struct.omit(entity as EntityMap['housings'], 'owner');
        await Housing().insert(
          formatHousingRecordApi({
            ...housing,
            buildingGroupId: null,
            geolocation: null,
            occupancyRegistered: housing.occupancy
          })
        );
      })
      .with('campaigns', async () => {
        const campaign = entity as EntityMap['campaigns'];
        const [{ establishmentId }] = args as ContextArgs<'campaigns'>;
        await Campaigns().insert(
          formatCampaignApi({
            ...campaign,
            userId: campaign.createdBy.id,
            establishmentId
          })
        );
      })
      .with('groups', async () => {
        const group = entity as EntityMap['groups'];
        const [{ establishmentId }] = args as ContextArgs<'groups'>;
        const createdBy = group.createdBy
          ? fromUserDTO(group.createdBy)
          : undefined;
        await Groups().insert(
          formatGroupApi({
            ...group,
            createdBy,
            userId: group.createdBy?.id,
            establishmentId,
            createdAt: new Date(group.createdAt),
            exportedAt: null,
            archivedAt: group.archivedAt ? new Date(group.archivedAt) : null
          })
        );
      })
      .exhaustive();

    return entity;
  }
}

export const knexAdapter = new KnexAdapter();
```

Notes:

- The `args` rest tuple is empty for unscoped tables and a 1-tuple `[{ establishmentId }]` for `campaigns`/`groups`. Destructure inside each scoped arm.
- The `match(table)` arms for users/establishments/owners/housings are unchanged — they don't reference `args`.
- The error-throw guards (`if (!establishmentId) throw ...`) are gone — TypeScript's `ContextArgs<'campaigns'>` makes the field non-nullable.

- [ ] **Step 2: Run typecheck for the server**

Run: `yarn nx typecheck server`
Expected: FAIL at `server/src/test/factories.ts` (consumes the now-changed `createFactories`) and at `campaign-api.test.ts`. Both are fixed in Task 8.

---

### Task 8: Rewrite `server/src/test/factories.ts` to a one-liner and migrate `campaign-api.test.ts`

**Files:**

- Modify: `server/src/test/factories.ts`
- Modify: `server/src/controllers/test/campaign-api.test.ts`

The wrapper classes (`ServerCampaignFactory`, `ServerGroupFactory`) and the default `createServerFactories` export become dead after the package refactor. The file is **kept** as a thin re-export of a `factories` instance bound to `knexAdapter` — mirroring `frontend/src/test/factories.ts`. Server tests import `{ factories } from '~/test/factories'`.

- [ ] **Step 1: Replace `server/src/test/factories.ts`**

```ts
import createFactories from '@zerologementvacant/factories';

import { knexAdapter } from './knex-adapter';

export const factories = createFactories(knexAdapter);
```

- [ ] **Step 2: Verify the old `createServerFactories` default export has no remaining consumers besides `campaign-api.test.ts`**

Run: `grep -rln "createServerFactories\|from '~/test/factories'" server/src --include="*.ts"`
Expected: only `server/src/controllers/test/campaign-api.test.ts` matches (and the file may show twice if it imports both the default and the named `factories` — that's fine).

If anything else matches, migrate it as part of this task.

- [ ] **Step 3: Update the imports in `campaign-api.test.ts`**

Locate the import line:

```ts
import createServerFactories from '~/test/factories';
```

Replace with:

```ts
import { factories } from '~/test/factories';
```

- [ ] **Step 4: Update the factories instantiation in `campaign-api.test.ts`**

Locate:

```ts
const factories = createServerFactories(knexAdapter);
```

Delete the line entirely — `factories` is now imported directly.

- [ ] **Step 5: Rewrite any `factories.campaign.forEstablishment(...)` / `factories.group.forEstablishment(...)` call sites in this file**

Find them with: `grep -n "forEstablishment" server/src/controllers/test/campaign-api.test.ts`

Replacement patterns (apply each one wherever it appears):

```ts
// before
factories.campaign.forEstablishment(establishment).build({...}, opts);
// after
factories.campaign(establishment).build({...}, opts);

// before
factories.campaign.forEstablishment(establishment).create({...}, opts);
// after
factories.campaign(establishment).create({...}, opts);

// before
factories.campaign.forEstablishment(establishment).buildList(n, {...}, opts);
// after
factories.campaign(establishment).buildList(n, {...}, opts);
```

Apply the same shape for `factories.group.forEstablishment(...)`.

- [ ] **Step 6: Migrate every remaining `genCampaignApi(...)` / `genCampaignApiNext(...)` call in this file**

Find them with: `grep -n "genCampaignApi\|genCampaignApiNext" server/src/controllers/test/campaign-api.test.ts`

Apply the Wave 2 server migration recipe (Patterns A–D under the "Wave 2 — Migrate server consumers" heading further down). The file is "partially migrated" — only `createServerFactories` was wired up; the actual campaign generation still uses `genCampaignApi`.

- [ ] **Step 7: Remove `genCampaignApi` and `genCampaignApiNext` from the file's import list**

Locate the `~/test/testFixtures` import (currently has `genCampaignApi`, `genCampaignApiNext`, `genEstablishmentApi`, `genEventApi`, `genGroupApi`, `genHousingApi`, `genHousingOwnerApi`, `genUserApi`, `oneOf`). Remove `genCampaignApi` and `genCampaignApiNext`. Leave the others.

If `CampaignApi` is no longer referenced anywhere in the file, also drop it from the `~/models/CampaignApi` import.

- [ ] **Step 8: Run the campaign API test**

Run: `yarn nx test server -- campaign-api`
Expected: PASS.

- [ ] **Step 9: Run server typecheck**

Run: `yarn nx typecheck server`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add server/src/test/knex-adapter.ts \
        server/src/test/factories.ts \
        server/src/controllers/test/campaign-api.test.ts
git commit -m "$(cat <<'EOF'
refactor(server): route campaign/group establishmentId through adapter context

KnexAdapter.create now reads context.establishmentId for campaigns and
groups instead of stamping createdBy.establishmentId from a transient.
server/src/test/factories.ts collapses to a one-line re-export of
createFactories(knexAdapter); ServerCampaignFactory, ServerGroupFactory,
and createServerFactories are removed. campaign-api.test.ts imports the
shared { factories } from ~/test/factories.
EOF
)"
```

---

## Wave 1.6 — Frontend adapter

### Task 9: Add `MswAdapter`

**Files:**

- Create: `frontend/src/test/msw-adapter.ts`
- Create: `frontend/src/test/msw-adapter.test.ts`

- [ ] **Step 1: Write the test first**

Create `frontend/src/test/msw-adapter.test.ts`:

```ts
import type {
  CampaignDTO,
  EstablishmentDTO,
  UserDTO
} from '@zerologementvacant/models';
import { afterEach, describe, expect, it } from 'vitest';

import data from '~/mocks/handlers/data';
import { MswAdapter } from './msw-adapter';

describe('MswAdapter', () => {
  afterEach(() => {
    data.reset();
  });

  it('pushes establishments into data.establishments', async () => {
    const adapter = new MswAdapter();
    const establishment = { id: 'establishment-1' } as EstablishmentDTO;

    const result = await adapter.create('establishments', establishment);

    expect(result).toBe(establishment);
    expect(data.establishments).toContain(establishment);
  });

  it('pushes users into data.users', async () => {
    const adapter = new MswAdapter();
    const user = { id: 'user-1' } as UserDTO;

    await adapter.create('users', user);

    expect(data.users).toContain(user);
  });

  it('pushes campaigns into data.campaigns and ignores the establishment context', async () => {
    const adapter = new MswAdapter();
    const campaign = { id: 'campaign-1' } as unknown as CampaignDTO;

    await adapter.create('campaigns', campaign, {
      establishmentId: 'establishment-1'
    });

    expect(data.campaigns).toContain(campaign);
    expect(campaign).not.toHaveProperty('establishmentId');
  });
});
```

- [ ] **Step 2: Run the test — expect failure (module not found)**

Run: `yarn nx test frontend -- msw-adapter`
Expected: FAIL with "Cannot find module './msw-adapter'".

- [ ] **Step 3: Create the adapter**

Create `frontend/src/test/msw-adapter.ts`:

```ts
import type {
  Adapter,
  ContextArgs,
  EntityMap
} from '@zerologementvacant/factories';
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
      .with('establishments', () => {
        data.establishments.push(entity as EntityMap['establishments']);
      })
      .with('users', () => {
        data.users.push(entity as EntityMap['users']);
      })
      .with('owners', () => {
        data.owners.push(entity as EntityMap['owners']);
      })
      .with('housings', () => {
        data.housings.push(entity as EntityMap['housings']);
      })
      .with('campaigns', () => {
        data.campaigns.push(entity as EntityMap['campaigns']);
      })
      .with('groups', () => {
        data.groups.push(entity as EntityMap['groups']);
      })
      .exhaustive();
    return entity;
  }
}

export const mswAdapter = new MswAdapter();
```

- [ ] **Step 4: Run the test — expect pass**

Run: `yarn nx test frontend -- msw-adapter`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/test/msw-adapter.ts frontend/src/test/msw-adapter.test.ts
git commit -m "$(cat <<'EOF'
feat(front): add MswAdapter for @zerologementvacant/factories

Routes Factory.create() into the MSW data store. The campaign/group
context is part of the contract but unused — data.campaigns has no
establishmentId column (mirrors CampaignDTO).
EOF
)"
```

---

### Task 10: Add `frontend/src/test/factories.ts`

**Files:**

- Create: `frontend/src/test/factories.ts`

- [ ] **Step 1: Create `frontend/src/test/factories.ts`**

```ts
import createFactories from '@zerologementvacant/factories';

import { mswAdapter } from './msw-adapter';

export const factories = createFactories(mswAdapter);
```

- [ ] **Step 2: Run typecheck**

Run: `yarn nx typecheck frontend`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/test/factories.ts
git commit -m "feat(front): expose factories instance bound to MswAdapter"
```

---

## Wave 2 — Migrate server consumers

Each of Tasks 11–19 follows the same migration recipe. Apply the recipe per file, run that file's tests, commit, then move on. Establishments, users, groups, housing, owner fixtures stay as `gen*Api` — they are **out of scope for this slice**. Only `genCampaignApi` and `genCampaignApiNext` get migrated.

**Migration recipe (apply to every file in Wave 2 server tasks):**

1. **Add the factories import** at the top of the file (next to the existing `~/test/testFixtures` import):

   ```ts
   import { factories } from '~/test/factories';
   ```

2. **Locate every `genCampaignApi(...)` and `genCampaignApiNext(...)` call** with `grep -n "genCampaignApi\|genCampaignApiNext" <file>`.

3. **For each call**, replace per the patterns below. Apply whichever maps to the call's signature.

   **Pattern A** — `genCampaignApi(establishmentId, user)`:

   ```ts
   // before
   const campaign = genCampaignApi(establishment.id, user);
   await Campaigns().insert(formatCampaignApi(campaign));
   // after
   const campaign = await factories
     .campaign(establishment)
     .create({}, { associations: { createdBy: user } });
   ```

   **Pattern B** — `genCampaignApi(establishmentId, user, group)`:

   ```ts
   // before
   const campaign = genCampaignApi(establishment.id, user, group);
   await Campaigns().insert(formatCampaignApi(campaign));
   // after
   const campaign = await factories
     .campaign(establishment)
     .create({ groupId: group.id }, { associations: { createdBy: user } });
   ```

   **Pattern C** — `genCampaignApiNext({ group, establishment, creator })`:

   ```ts
   // before
   const campaign = genCampaignApiNext({ group, establishment, creator: user });
   await Campaigns().insert(formatCampaignApi(campaign));
   // after
   const campaign = await factories
     .campaign(establishment)
     .create({ groupId: group.id }, { associations: { createdBy: user } });
   ```

   **Pattern D** — `Array.from({ length: N }).map(() => genCampaignApi(...))`:

   ```ts
   // before
   const campaigns: CampaignApi[] = Array.from({ length: 3 }).map(() =>
     genCampaignApi(establishment.id, user)
   );
   await Campaigns().insert(campaigns.map(formatCampaignApi));
   // after
   const campaigns = await factories
     .campaign(establishment)
     .createList(3, {}, { associations: { createdBy: user } });
   ```

   When the test only needs the DTO (no DB insert), use `.build(...)` / `.buildList(...)` instead.

4. **Remove `genCampaignApi` and `genCampaignApiNext` from the file's import list** (and the unused `CampaignApi` type if no longer referenced). Run the test to confirm the file still compiles.

5. **Run that file's tests AND server typecheck** before committing — typecheck catches `CampaignApi` vs `CampaignDTO` mismatches at call sites the test body doesn't exercise (e.g., repository function signatures that still expect `CampaignApi`):

   ```bash
   yarn nx test server -- <file>
   yarn nx typecheck server
   ```

   If typecheck fails on a repository signature requiring `CampaignApi`, widen the signature to `Pick<CampaignApi, 'id'>` (or whatever subset is actually read). Precedent: `server/src/repositories/campaignHousingRepository.ts:55` `formatCampaignHousingApi` was widened this way in Wave 1.5. Include the production-file widening in the same commit as the test migration.

6. **Commit:**
   ```bash
   git add <file> [optional widened production file]
   git commit -m "refactor(server): migrate <file> off genCampaignApi"
   ```

---

### Task 11: Migrate `campaignRepository.test.ts`

**Files:**

- Modify: `server/src/repositories/test/campaignRepository.test.ts`

- [ ] **Step 1: Apply the migration recipe above.**

- [ ] **Step 2: Run the test**

Run: `yarn nx test server -- campaignRepository`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add server/src/repositories/test/campaignRepository.test.ts
git commit -m "refactor(server): migrate campaignRepository.test off genCampaignApi"
```

---

### Task 12: Migrate `campaignHousingRepository.test.ts`

**Files:**

- Modify: `server/src/repositories/test/campaignHousingRepository.test.ts`

- [ ] **Step 1: Apply the migration recipe.**

- [ ] **Step 2: Run the test**

Run: `yarn nx test server -- campaignHousingRepository`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add server/src/repositories/test/campaignHousingRepository.test.ts
git commit -m "refactor(server): migrate campaignHousingRepository.test off genCampaignApi"
```

---

### Task 13: Migrate `draftRepository.test.ts`

**Files:**

- Modify: `server/src/repositories/test/draftRepository.test.ts`

- [ ] **Step 1: Apply the migration recipe.**

- [ ] **Step 2: Run the test**

Run: `yarn nx test server -- draftRepository`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add server/src/repositories/test/draftRepository.test.ts
git commit -m "refactor(server): migrate draftRepository.test off genCampaignApi"
```

---

### Task 14: Migrate `housingRepository.test.ts`

**Files:**

- Modify: `server/src/repositories/test/housingRepository.test.ts`

- [ ] **Step 1: Apply the migration recipe.**

- [ ] **Step 2: Run the test**

Run: `yarn nx test server -- housingRepository`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add server/src/repositories/test/housingRepository.test.ts
git commit -m "refactor(server): migrate housingRepository.test off genCampaignApi"
```

---

### Task 15: Migrate `eventRepository.test.ts`

**Files:**

- Modify: `server/src/repositories/test/eventRepository.test.ts`

- [ ] **Step 1: Apply the migration recipe.**

- [ ] **Step 2: Run the test**

Run: `yarn nx test server -- eventRepository`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add server/src/repositories/test/eventRepository.test.ts
git commit -m "refactor(server): migrate eventRepository.test off genCampaignApi"
```

---

### Task 16: Migrate `groupController.test.ts`

**Files:**

- Modify: `server/src/controllers/groupController.test.ts`

- [ ] **Step 1: Apply the migration recipe.**

- [ ] **Step 2: Run the test**

Run: `yarn nx test server -- groupController`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add server/src/controllers/groupController.test.ts
git commit -m "refactor(server): migrate groupController.test off genCampaignApi"
```

---

### Task 17: Migrate `housing-api.test.ts`

**Files:**

- Modify: `server/src/controllers/test/housing-api.test.ts`

- [ ] **Step 1: Apply the migration recipe.**

- [ ] **Step 2: Run the test**

Run: `yarn nx test server -- housing-api`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add server/src/controllers/test/housing-api.test.ts
git commit -m "refactor(server): migrate housing-api.test off genCampaignApi"
```

---

### Task 18: Migrate `event-api.test.ts`

**Files:**

- Modify: `server/src/controllers/test/event-api.test.ts`

- [ ] **Step 1: Apply the migration recipe.**

- [ ] **Step 2: Run the test**

Run: `yarn nx test server -- event-api`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add server/src/controllers/test/event-api.test.ts
git commit -m "refactor(server): migrate event-api.test off genCampaignApi"
```

---

### Task 19: Migrate `draft-api.test.ts`

**Files:**

- Modify: `server/src/controllers/test/draft-api.test.ts`

- [ ] **Step 1: Apply the migration recipe.**

- [ ] **Step 2: Run the test**

Run: `yarn nx test server -- draft-api`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add server/src/controllers/test/draft-api.test.ts
git commit -m "refactor(server): migrate draft-api.test off genCampaignApi"
```

---

## Wave 2 — Migrate frontend consumers

**Frontend migration recipe:**

1. **Add the factories import**:

   ```ts
   import { factories } from '~/test/factories';
   ```

2. **Locate every `genCampaignDTO(...)` call** with `grep -n "genCampaignDTO" <file>`.

3. **For each call**, choose between `.build()` (pure DTO) and `.create()` (also pushes into `data.campaigns`):
   - When the test passes the DTO into `renderView`'s `campaigns` option (the helper then pushes to `data` itself), use `.build()`.
   - When the test needs the campaign to be retrievable via MSW handlers immediately, use `.create()`.

   For `CampaignListView.test.tsx` and `CampaignView.test.tsx`, `renderView` already does the push, so `.build()` is preferred.

4. **Replacement patterns:**

   **Pattern E** — bare `genCampaignDTO()`:

   ```ts
   // before
   { ...genCampaignDTO(), housingCount: 10 }
   // after
   factories.campaign(establishment).build(
     { housingCount: 10 },
     { associations: { createdBy: user } }
   )
   ```

   **Pattern F** — `genCampaignDTO(group, user)`:

   ```ts
   // before
   genCampaignDTO(group, user);
   // after
   factories
     .campaign(establishment)
     .build({ groupId: group.id }, { associations: { createdBy: user } });
   ```

   **Pattern G** — list generation:

   ```ts
   // before
   faker.helpers.multiple(() => genCampaignDTO(group, auth));
   // after
   factories
     .campaign(establishment)
     .buildList(
       faker.number.int({ min: 3, max: 5 }),
       { groupId: group.id },
       { associations: { createdBy: auth } }
     );
   ```

5. **In the test's `renderView` (or equivalent helper)**: when the helper currently bootstraps an establishment via `genEstablishmentDTO()`, leave it alone — `genEstablishmentDTO` is **out of scope** for this slice. The factories instance does not need an establishment unless `factories.campaign(...)` is called; the helper continues to thread the `establishment` variable through.

6. **Remove `genCampaignDTO` from the `@zerologementvacant/models/fixtures` import line** for the file (other `gen*DTO` imports stay).

7. **Run that file's tests and commit.**

---

### Task 20: Migrate `CampaignListView.test.tsx`

**Files:**

- Modify: `frontend/src/views/Campaign/test/CampaignListView.test.tsx`

- [ ] **Step 1: Apply the frontend migration recipe.**

Special notes for this file:

- The `renderView` helper currently generates a `group` via `genGroupDTO(auth, housings)`. Keep that — groups are out of scope. Use `group.id` in `factories.campaign(establishment).build(...)` calls.
- Each `renderView({ campaigns: [...] })` call passes inline campaign DTOs. Rewrite the inline list to use `factories.campaign(establishment).build(overrides, { associations: { createdBy: auth } })`. Bootstrap `establishment` and `auth` once per test via the existing `genEstablishmentDTO` / `genUserDTO` calls.

- [ ] **Step 2: Run the test**

Run: `yarn nx test frontend -- CampaignListView`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/Campaign/test/CampaignListView.test.tsx
git commit -m "refactor(front): migrate CampaignListView.test off genCampaignDTO"
```

---

### Task 21: Migrate `CampaignView.test.tsx`

**Files:**

- Modify: `frontend/src/views/Campaign/test/CampaignView.test.tsx`

- [ ] **Step 1: Apply the frontend migration recipe.**

- [ ] **Step 2: Run the test**

Run: `yarn nx test frontend -- CampaignView`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/Campaign/test/CampaignView.test.tsx
git commit -m "refactor(front): migrate CampaignView.test off genCampaignDTO"
```

---

### Task 22: Migrate `HousingListView.test.tsx`

**Files:**

- Modify: `frontend/src/views/HousingList/test/HousingListView.test.tsx`

- [ ] **Step 1: Apply the frontend migration recipe.**

- [ ] **Step 2: Run the test**

Run: `yarn nx test frontend -- HousingListView`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/HousingList/test/HousingListView.test.tsx
git commit -m "refactor(front): migrate HousingListView.test off genCampaignDTO"
```

---

## Cleanup — delete the retired helpers

### Task 23: Delete `genCampaignApi`, `genCampaignApiNext`, `genCampaign`

**Files:**

- Modify: `server/src/test/testFixtures.ts`
- Modify: `frontend/src/test/fixtures.ts`

- [ ] **Step 1: Confirm no remaining consumers**

Run:

```bash
grep -rn "genCampaignApi\|genCampaignApiNext" server/src frontend/src --include="*.ts" --include="*.tsx"
grep -rn "\bgenCampaign\b" frontend/src --include="*.ts" --include="*.tsx"
```

Expected: no matches outside of the definitions themselves (`server/src/test/testFixtures.ts` for `genCampaignApi`/`genCampaignApiNext`, `frontend/src/test/fixtures.ts` for `genCampaign`). The seed file `server/src/infra/database/seeds/development/20240807073309_campaigns.ts` is **out of scope** — it may still reference `genCampaignApi`. If it does, **leave the helper in place and skip this task**; document the deferred cleanup in the PR description.

If only test-file consumers remain (no seeds), continue.

- [ ] **Step 2: Remove `genCampaignApi` from `server/src/test/testFixtures.ts`**

Locate the `export const genCampaignApi = (...)` definition (lines roughly 310–325 in the current file) and the `export function genCampaignApiNext(...)` definition (lines roughly 304–308). Delete both functions and the now-unused `GenCampaignOptions` interface above them.

Remove unused imports left behind by the deletion (`fromCampaignDTO`, `toGroupDTO`, `toUserDTO`, `genCampaignDTO`, `CampaignApi`) only if they are not used by any remaining function in the file.

- [ ] **Step 3: Remove `genCampaign` from `frontend/src/test/fixtures.ts`**

Locate the `export function genCampaign(): Campaign { ... }` definition (around line 166) and delete it. Remove `fromCampaignDTO` / `Campaign` / `genCampaignDTO` imports if they are no longer used.

- [ ] **Step 4: Typecheck both workspaces**

Run: `yarn nx run-many -t typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/test/testFixtures.ts frontend/src/test/fixtures.ts
git commit -m "$(cat <<'EOF'
chore(server, front): remove retired campaign fixture helpers

genCampaignApi, genCampaignApiNext, and genCampaign are no longer
consumed by any test in scope. genCampaignDTO in
@zerologementvacant/models/fixtures stays — out-of-scope tests still
use it.
EOF
)"
```

---

## Final verification

### Task 24: Full test + typecheck + lint sweep

- [ ] **Step 1: Run all package tests**

Run: `yarn nx run-many -t test --projects=factories,server,frontend`
Expected: PASS across all three projects.

- [ ] **Step 2: Run typecheck across the workspace**

Run: `yarn nx run-many -t typecheck`
Expected: PASS.

- [ ] **Step 3: Run lint across the workspace**

Run: `yarn nx run-many -t lint`
Expected: PASS.

- [ ] **Step 4: Confirm no lingering references to the retired helpers**

Run:

```bash
grep -rn "genCampaignApi\|genCampaignApiNext\|createServerFactories\|ServerCampaignFactory\|ServerGroupFactory" server/src frontend/src --include="*.ts" --include="*.tsx"
grep -rn "\bgenCampaign\b" frontend/src --include="*.ts" --include="*.tsx"
```

Expected: only matches inside committed deletion diffs are gone; the search returns no hits in tracked files (except possibly the deferred seed file from Task 23 Step 1, if you chose to defer).

- [ ] **Step 5: Verify branch is push-ready**

Run: `git log --oneline origin/main..HEAD`
Expected: ~16–17 commits (1 docs, 1 factories, 1 server adapter, 1 MswAdapter, 1 factories.ts, 9 server migrations, 3 frontend migrations, 1 cleanup).

The branch is ready for `git push -u origin <branch>` and `gh pr create` per the user's worktree/PR convention (see `~/.claude-perso/CLAUDE.md`).

---

## Notes for the implementer

- **Don't touch `genCampaignDTO`**, `genEstablishmentDTO`, `genUserDTO`, `genGroupDTO`, etc. in `packages/models/src/test/fixtures.ts`. Those are retired in a later slice.
- **Don't touch any other `gen*Api` helpers** in `server/src/test/testFixtures.ts` (`genEstablishmentApi`, `genUserApi`, `genGroupApi`, `genHousingApi`, etc.). Out of scope.
- **Don't migrate seed files** — `server/src/infra/database/seeds/development/*.ts`. Out of scope.
- **If a test file references `factories.campaign.something` (not `factories.campaign(establishment).something`)**, you've found a leftover from the previous wrapper shape. Apply the recipe and rerun.
- **If a server test fails with "context.establishmentId is undefined"**, the call site is missing `factories.campaign(establishment).create(...)` — somewhere the test still calls the package factory bare. Search and fix.
- **The `genCampaignDTO` import from `@zerologementvacant/models/fixtures`** stays on the import line only if the file still uses _other_ `gen*DTO` symbols. If `genCampaignDTO` was the only one imported, drop the whole import line.
