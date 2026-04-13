# `@zerologementvacant/factories` — Design Spec

**Date:** 2026-04-13
**Status:** Approved

## Context

`packages/models` currently exports a `/fixtures` sub-path with ~30 plain `gen*DTO()` functions using `faker`. Both `server` and `frontend` import from `@zerologementvacant/models/fixtures` and extend those functions locally.

This package introduces fishery-based factories as an eventual replacement. **The existing fixtures are not touched** — migration happens gradually.

## Goals

- Expose DTO factories backed by [fishery](https://www.npmjs.com/package/fishery)
- Provide a typed adapter interface so callers can plug in their own persistence layer
- Ship a `MemoryAdapter` for use in unit tests and frontend tests
- Support building many entities at once (`.buildList`, `.createList`)
- Not used in production code; used in tests and seeds

## Package

```
packages/factories/
  src/
    adapter.ts            # Adapter interface
    entity-map.ts         # EntityMap type (table name → DTO)
    memory-adapter.ts     # MemoryAdapter concrete implementation
    create-factories.ts   # createFactories() — default export
    factories/
      campaign.ts
      establishment.ts
      group.ts
      housing.ts
      owner.ts
      user.ts
      # one file per DTO, added incrementally
    index.ts              # re-exports
```

## Public API

```ts
import createFactories, {
  type Adapter,
  type EntityMap,
  MemoryAdapter
} from '@zerologementvacant/factories';

// In-memory (unit tests, frontend tests)
const factories = createFactories(new MemoryAdapter());
const housing  = await factories.housing.create();
const owner    = await factories.owner.build();
const housings = await factories.housing.createList(5);

// Custom adapter (e.g. Knex in server seeds/tests)
class KnexAdapter implements Adapter {
  async create<K extends keyof EntityMap>(table: K, entity: EntityMap[K]) {
    await db(table).insert(entity);
    return entity;
  }
}
const factories = createFactories(new KnexAdapter());
```

## Adapter Interface

```ts
// entity-map.ts
export type EntityMap = {
  campaigns:      CampaignDTO;
  establishments: EstablishmentDTO;
  groups:         GroupDTO;
  housings:       HousingDTO;
  owners:         OwnerDTO;
  users:          UserDTO;
  // extended as new factories are added
};

// adapter.ts
export interface Adapter {
  create<K extends keyof EntityMap>(
    table: K,
    entity: EntityMap[K]
  ): Promise<EntityMap[K]>;
}
```

A single generic `create` method, typed via `EntityMap`. Passing the wrong entity type for a given table is a compile error.

## MemoryAdapter

```ts
export class MemoryAdapter implements Adapter {
  private store = new Map<string, EntityMap[keyof EntityMap][]>();

  async create<K extends keyof EntityMap>(
    table: K,
    entity: EntityMap[K]
  ): Promise<EntityMap[K]> {
    const rows = (this.store.get(table) ?? []) as EntityMap[K][];
    this.store.set(table, [...rows, entity]);
    return entity;
  }
}
```

No utility methods added until needed.

## Factory files

Each factory file exports a function that returns a fishery factory with faker-based defaults and `onCreate` wired to the adapter:

```ts
// factories/housing.ts
export function createHousingFactory(adapter: Adapter) {
  return Factory.define<HousingDTO>(() => ({
    id: faker.string.uuid(),
    // ... all HousingDTO fields
  })).onCreate((entity) => adapter.create('housings', entity));
}
```

## createFactories

```ts
// create-factories.ts
export type Factories = {
  campaign:      ReturnType<typeof createCampaignFactory>;
  establishment: ReturnType<typeof createEstablishmentFactory>;
  group:         ReturnType<typeof createGroupFactory>;
  housing:       ReturnType<typeof createHousingFactory>;
  owner:         ReturnType<typeof createOwnerFactory>;
  user:          ReturnType<typeof createUserFactory>;
};

export default function createFactories(adapter: Adapter): Factories {
  return {
    campaign:      createCampaignFactory(adapter),
    establishment: createEstablishmentFactory(adapter),
    group:         createGroupFactory(adapter),
    housing:       createHousingFactory(adapter),
    owner:         createOwnerFactory(adapter),
    user:          createUserFactory(adapter),
  };
}
```

## Build config

Modelled after `packages/schemas`:
- `type: "module"`, single `"."` export
- `fishery` and `@faker-js/faker` are `dependencies` (used in package source)
- Consumers declare `@zerologementvacant/factories` as a `devDependency`
- `tsconfig.lib.json` references `packages/models/tsconfig.lib.json`
- No `project.json` — Nx auto-discovers via plugins
- Test infra: `vitest.config.ts` + `vitest.setup.ts` identical to `packages/schemas`

## Initial scope

Cover the 6 most-used DTOs first: `housing`, `owner`, `user`, `establishment`, `campaign`, `group`. Remaining DTOs from `models/fixtures` added incrementally as callers migrate.
