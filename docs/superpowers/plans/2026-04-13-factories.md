# `@zerologementvacant/factories` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `@zerologementvacant/factories` package exposing fishery-based DTO factories with a typed adapter interface and an in-memory adapter.

**Architecture:** A single `createFactories(adapter)` function binds all fishery factories to a caller-supplied `Adapter`. The `Adapter` interface is typed via an `EntityMap` that maps SQL table names to their DTOs. A `MemoryAdapter` ships with the package for use in unit tests and frontend tests.

**Tech Stack:** TypeScript, [fishery 2.4.0](https://github.com/thoughtbot/fishery), @faker-js/faker 8.4.1, Vitest

---

## File Map

| File | Role |
|------|------|
| `packages/factories/package.json` | Package manifest, deps |
| `packages/factories/tsconfig.json` | Project-level tsconfig (references lib + spec) |
| `packages/factories/tsconfig.lib.json` | Compilation config (excludes tests) |
| `packages/factories/tsconfig.spec.json` | Test compilation config |
| `packages/factories/vitest.config.ts` | Vitest config |
| `packages/factories/vitest.setup.ts` | Vitest setup (jest-extended) |
| `packages/factories/src/entity-map.ts` | `EntityMap` type: table name → DTO |
| `packages/factories/src/adapter.ts` | `Adapter` interface |
| `packages/factories/src/memory-adapter.ts` | `MemoryAdapter` concrete class |
| `packages/factories/src/memory-adapter.test.ts` | Tests for MemoryAdapter |
| `packages/factories/src/factories/user.ts` | User factory |
| `packages/factories/src/factories/user.test.ts` | Tests for user factory |
| `packages/factories/src/factories/establishment.ts` | Establishment factory |
| `packages/factories/src/factories/establishment.test.ts` | Tests for establishment factory |
| `packages/factories/src/factories/owner.ts` | Owner factory |
| `packages/factories/src/factories/owner.test.ts` | Tests for owner factory |
| `packages/factories/src/factories/housing.ts` | Housing factory |
| `packages/factories/src/factories/housing.test.ts` | Tests for housing factory |
| `packages/factories/src/factories/group.ts` | Group factory |
| `packages/factories/src/factories/group.test.ts` | Tests for group factory |
| `packages/factories/src/factories/campaign.ts` | Campaign factory |
| `packages/factories/src/factories/campaign.test.ts` | Tests for campaign factory |
| `packages/factories/src/create-factories.ts` | `createFactories()` + `Factories` type |
| `packages/factories/src/create-factories.test.ts` | Integration test |
| `packages/factories/src/index.ts` | Public exports |

---

## Task 1: Scaffold package infrastructure

**Files:** Create all config files listed above (no source files yet)

- [ ] **Step 1: Create `packages/factories/package.json`**

```json
{
  "name": "@zerologementvacant/factories",
  "version": "0.0.1",
  "type": "module",
  "exports": {
    "./package.json": "./package.json",
    ".": {
      "types": "./dist/lib/index.d.ts",
      "default": "./dist/lib/index.js"
    }
  },
  "dependencies": {
    "@faker-js/faker": "8.4.1",
    "@zerologementvacant/models": "workspace:*",
    "fishery": "2.4.0",
    "ts-pattern": "5.8.0"
  },
  "devDependencies": {
    "@tsconfig/node24": "24.0.4",
    "@types/node": "24",
    "jest-extended": "4.0.2"
  }
}
```

- [ ] **Step 2: Create `packages/factories/tsconfig.json`**

```json
{
  "extends": ["@tsconfig/node24/tsconfig.json", "../../tsconfig.base.json"],
  "files": [],
  "include": [],
  "references": [
    { "path": "./tsconfig.lib.json" },
    { "path": "./tsconfig.spec.json" }
  ]
}
```

- [ ] **Step 3: Create `packages/factories/tsconfig.lib.json`**

```json
{
  "extends": ["@tsconfig/node24/tsconfig.json", "../../tsconfig.base.json"],
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist/lib",
    "tsBuildInfoFile": "dist/lib/tsconfig.tsbuildinfo",
    "types": ["vitest/importMeta"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts"],
  "references": [
    { "path": "../models/tsconfig.lib.json" }
  ]
}
```

- [ ] **Step 4: Create `packages/factories/tsconfig.spec.json`**

```json
{
  "extends": ["@tsconfig/node24/tsconfig.json", "../../tsconfig.base.json"],
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist/spec",
    "tsBuildInfoFile": "dist/spec/tsconfig.tsbuildinfo",
    "types": ["jest-extended", "node", "vitest/globals"]
  },
  "include": ["src/**/*.test.ts"],
  "references": [
    { "path": "./tsconfig.lib.json" }
  ]
}
```

- [ ] **Step 5: Create `packages/factories/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.ts']
  }
});
```

- [ ] **Step 6: Create `packages/factories/vitest.setup.ts`**

```ts
import * as extended from 'jest-extended';

expect.extend(extended);
```

- [ ] **Step 7: Create a minimal `packages/factories/src/index.ts` so the package compiles**

```ts
export {};
```

- [ ] **Step 8: Install dependencies**

```bash
yarn install
```

Expected: no errors, `packages/factories` appears in workspace list.

- [ ] **Step 9: Verify Nx discovers the package**

```bash
yarn nx show project @zerologementvacant/factories
```

Expected: project details printed without error.

- [ ] **Step 10: Commit**

```bash
git add packages/factories/
git commit -m "chore: scaffold @zerologementvacant/factories package"
```

---

## Task 2: EntityMap + Adapter interface

**Files:**
- Create: `packages/factories/src/entity-map.ts`
- Create: `packages/factories/src/adapter.ts`

- [ ] **Step 1: Create `packages/factories/src/entity-map.ts`**

```ts
import type {
  CampaignDTO,
  EstablishmentDTO,
  GroupDTO,
  HousingDTO,
  OwnerDTO,
  UserDTO
} from '@zerologementvacant/models';

export type EntityMap = {
  campaigns: CampaignDTO;
  establishments: EstablishmentDTO;
  groups: GroupDTO;
  housings: HousingDTO;
  owners: OwnerDTO;
  users: UserDTO;
};
```

- [ ] **Step 2: Create `packages/factories/src/adapter.ts`**

```ts
import type { EntityMap } from './entity-map';

export interface Adapter {
  create<K extends keyof EntityMap>(
    table: K,
    entity: EntityMap[K]
  ): Promise<EntityMap[K]>;
}
```

- [ ] **Step 3: Run typecheck**

```bash
yarn nx typecheck @zerologementvacant/factories
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add packages/factories/src/entity-map.ts packages/factories/src/adapter.ts
git commit -m "feat(factories): add EntityMap and Adapter interface"
```

---

## Task 3: MemoryAdapter

**Files:**
- Create: `packages/factories/src/memory-adapter.ts`
- Create: `packages/factories/src/memory-adapter.test.ts`

- [ ] **Step 1: Write failing test `packages/factories/src/memory-adapter.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import type { UserDTO } from '@zerologementvacant/models';
import { MemoryAdapter } from './memory-adapter';

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
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
yarn nx test @zerologementvacant/factories -- src/memory-adapter.test.ts
```

Expected: FAIL — `Cannot find module './memory-adapter'`

- [ ] **Step 3: Implement `packages/factories/src/memory-adapter.ts`**

```ts
import type { Adapter } from './adapter';
import type { EntityMap } from './entity-map';

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

- [ ] **Step 4: Run test — verify it passes**

```bash
yarn nx test @zerologementvacant/factories -- src/memory-adapter.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/factories/src/memory-adapter.ts packages/factories/src/memory-adapter.test.ts
git commit -m "feat(factories): add MemoryAdapter"
```

---

## Task 4: User factory

**Files:**
- Create: `packages/factories/src/factories/user.ts`
- Create: `packages/factories/src/factories/user.test.ts`

- [ ] **Step 1: Write failing test `packages/factories/src/factories/user.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { MemoryAdapter } from '../memory-adapter';
import { createUserFactory } from './user';

describe('createUserFactory', () => {
  it('builds a UserDTO with required fields', () => {
    const factory = createUserFactory(new MemoryAdapter());
    const user = factory.build();

    expect(user.id).toBeDefined();
    expect(user.email).toBeDefined();
    expect(user.role).toBeDefined();
    expect(user.activatedAt).toBeDefined();
  });

  it('allows overriding fields', () => {
    const factory = createUserFactory(new MemoryAdapter());
    const user = factory.build({ email: 'custom@example.com' });

    expect(user.email).toBe('custom@example.com');
  });

  it('creates via the adapter with table "users"', async () => {
    const adapter = new MemoryAdapter();
    const spy = vi.spyOn(adapter, 'create');
    const factory = createUserFactory(adapter);

    const user = await factory.create();

    expect(spy).toHaveBeenCalledWith('users', expect.objectContaining({ id: user.id }));
  });

  it('builds a list of users', () => {
    const factory = createUserFactory(new MemoryAdapter());
    const users = factory.buildList(3);

    expect(users).toHaveLength(3);
    expect(new Set(users.map((u) => u.id)).size).toBe(3);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
yarn nx test @zerologementvacant/factories -- src/factories/user.test.ts
```

Expected: FAIL — `Cannot find module './user'`

- [ ] **Step 3: Implement `packages/factories/src/factories/user.ts`**

```ts
import { Factory } from 'fishery';
import { faker } from '@faker-js/faker/locale/fr';
import {
  TIME_PER_WEEK_VALUES,
  UserRole,
  type UserDTO
} from '@zerologementvacant/models';
import type { Adapter } from '../adapter';

export function createUserFactory(adapter: Adapter) {
  return Factory.define<UserDTO>(() => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: faker.phone.number(),
    position: faker.person.jobTitle(),
    timePerWeek: faker.helpers.arrayElement(TIME_PER_WEEK_VALUES),
    activatedAt: faker.date.recent().toJSON(),
    lastAuthenticatedAt: faker.date.recent().toJSON(),
    suspendedAt: null,
    suspendedCause: null,
    updatedAt: faker.date.recent().toJSON(),
    establishmentId: null,
    role: UserRole.USUAL,
    kind: null
  })).onCreate((entity) => adapter.create('users', entity));
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
yarn nx test @zerologementvacant/factories -- src/factories/user.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/factories/src/factories/user.ts packages/factories/src/factories/user.test.ts
git commit -m "feat(factories): add user factory"
```

---

## Task 5: Establishment factory

**Files:**
- Create: `packages/factories/src/factories/establishment.ts`
- Create: `packages/factories/src/factories/establishment.test.ts`

- [ ] **Step 1: Write failing test `packages/factories/src/factories/establishment.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { MemoryAdapter } from '../memory-adapter';
import { createEstablishmentFactory } from './establishment';

describe('createEstablishmentFactory', () => {
  it('builds an EstablishmentDTO with required fields', () => {
    const factory = createEstablishmentFactory(new MemoryAdapter());
    const establishment = factory.build();

    expect(establishment.id).toBeDefined();
    expect(establishment.siren).toBeDefined();
    expect(establishment.geoCodes.length).toBeGreaterThan(0);
  });

  it('allows overriding fields', () => {
    const factory = createEstablishmentFactory(new MemoryAdapter());
    const establishment = factory.build({ siren: '123456789' });

    expect(establishment.siren).toBe('123456789');
  });

  it('creates via the adapter with table "establishments"', async () => {
    const adapter = new MemoryAdapter();
    const spy = vi.spyOn(adapter, 'create');
    const factory = createEstablishmentFactory(adapter);

    const establishment = await factory.create();

    expect(spy).toHaveBeenCalledWith('establishments', expect.objectContaining({ id: establishment.id }));
  });

  it('builds a list of establishments', () => {
    const factory = createEstablishmentFactory(new MemoryAdapter());
    const establishments = factory.buildList(3);

    expect(establishments).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
yarn nx test @zerologementvacant/factories -- src/factories/establishment.test.ts
```

Expected: FAIL — `Cannot find module './establishment'`

- [ ] **Step 3: Implement `packages/factories/src/factories/establishment.ts`**

```ts
import { Factory } from 'fishery';
import { faker } from '@faker-js/faker/locale/fr';
import {
  ESTABLISHMENT_KIND_VALUES,
  ESTABLISHMENT_SOURCE_VALUES,
  type EstablishmentDTO
} from '@zerologementvacant/models';
import type { Adapter } from '../adapter';

export function createEstablishmentFactory(adapter: Adapter) {
  return Factory.define<EstablishmentDTO>(() => {
    const name = faker.location.city();
    return {
      id: faker.string.uuid(),
      name,
      shortName: name,
      siren: faker.string.numeric(9),
      available: true,
      geoCodes: faker.helpers.multiple(() => faker.location.zipCode(), {
        count: { min: 1, max: 10 }
      }),
      kind: faker.helpers.arrayElement(ESTABLISHMENT_KIND_VALUES),
      source: faker.helpers.arrayElement(ESTABLISHMENT_SOURCE_VALUES)
    };
  }).onCreate((entity) => adapter.create('establishments', entity));
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
yarn nx test @zerologementvacant/factories -- src/factories/establishment.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/factories/src/factories/establishment.ts packages/factories/src/factories/establishment.test.ts
git commit -m "feat(factories): add establishment factory"
```

---

## Task 6: Owner factory

**Files:**
- Create: `packages/factories/src/factories/owner.ts`
- Create: `packages/factories/src/factories/owner.test.ts`

- [ ] **Step 1: Write failing test `packages/factories/src/factories/owner.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { MemoryAdapter } from '../memory-adapter';
import { createOwnerFactory } from './owner';

describe('createOwnerFactory', () => {
  it('builds an OwnerDTO with required fields', () => {
    const factory = createOwnerFactory(new MemoryAdapter());
    const owner = factory.build();

    expect(owner.id).toBeDefined();
    expect(owner.fullName).toBeDefined();
  });

  it('allows overriding fields', () => {
    const factory = createOwnerFactory(new MemoryAdapter());
    const owner = factory.build({ fullName: 'Jean Dupont' });

    expect(owner.fullName).toBe('Jean Dupont');
  });

  it('creates via the adapter with table "owners"', async () => {
    const adapter = new MemoryAdapter();
    const spy = vi.spyOn(adapter, 'create');
    const factory = createOwnerFactory(adapter);

    const owner = await factory.create();

    expect(spy).toHaveBeenCalledWith('owners', expect.objectContaining({ id: owner.id }));
  });

  it('builds a list of owners', () => {
    const factory = createOwnerFactory(new MemoryAdapter());
    const owners = factory.buildList(3);

    expect(owners).toHaveLength(3);
    expect(new Set(owners.map((o) => o.id)).size).toBe(3);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
yarn nx test @zerologementvacant/factories -- src/factories/owner.test.ts
```

Expected: FAIL — `Cannot find module './owner'`

- [ ] **Step 3: Implement `packages/factories/src/factories/owner.ts`**

```ts
import { Factory } from 'fishery';
import { faker } from '@faker-js/faker/locale/fr';
import {
  OWNER_KIND_LABELS,
  type AddressDTO,
  type OwnerDTO
} from '@zerologementvacant/models';
import type { Adapter } from '../adapter';

function genAddressDTO(): AddressDTO {
  return {
    banId: faker.string.uuid(),
    label: faker.location.streetAddress({ useFullAddress: true }),
    houseNumber: faker.location.buildingNumber(),
    street: faker.location.street(),
    postalCode: faker.location.zipCode(),
    city: faker.location.city(),
    cityCode: faker.location.zipCode(),
    latitude: faker.location.latitude(),
    longitude: faker.location.longitude(),
    score: faker.number.float({ fractionDigits: 2, min: 0, max: 1 })
  };
}

export function createOwnerFactory(adapter: Adapter) {
  return Factory.define<OwnerDTO>(() => {
    const address = genAddressDTO();
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const kind = faker.helpers.arrayElement(Object.values(OWNER_KIND_LABELS));
    return {
      id: faker.string.uuid(),
      idpersonne:
        faker.helpers.maybe(() => faker.string.alphanumeric(10), {
          probability: 0.8
        }) ?? null,
      administrator: null,
      rawAddress: [
        `${address.houseNumber} ${address.street}`,
        `${address.postalCode} ${address.city}`
      ],
      banAddress: genAddressDTO(),
      additionalAddress:
        faker.helpers.maybe(() => faker.location.county()) ?? null,
      birthDate: faker.date
        .birthdate()
        .toJSON()
        .substring(0, 'yyyy-mm-dd'.length),
      fullName: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }),
      phone: faker.phone.number().replace(/\s+/g, ''),
      kind,
      siren: kind === 'Particulier' ? null : faker.string.numeric(9),
      createdAt: faker.date.past().toJSON(),
      updatedAt: faker.date.recent().toJSON()
    };
  }).onCreate((entity) => adapter.create('owners', entity));
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
yarn nx test @zerologementvacant/factories -- src/factories/owner.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/factories/src/factories/owner.ts packages/factories/src/factories/owner.test.ts
git commit -m "feat(factories): add owner factory"
```

---

## Task 7: Housing factory

**Files:**
- Create: `packages/factories/src/factories/housing.ts`
- Create: `packages/factories/src/factories/housing.test.ts`

- [ ] **Step 1: Write failing test `packages/factories/src/factories/housing.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { MemoryAdapter } from '../memory-adapter';
import { createHousingFactory } from './housing';

describe('createHousingFactory', () => {
  it('builds a HousingDTO with required fields', () => {
    const factory = createHousingFactory(new MemoryAdapter());
    const housing = factory.build();

    expect(housing.id).toBeDefined();
    expect(housing.geoCode).toBeDefined();
    expect(housing.invariant).toBeDefined();
    expect(housing.localId).toBeDefined();
    expect(housing.status).toBeDefined();
    expect(housing.occupancy).toBeDefined();
  });

  it('allows overriding fields', () => {
    const factory = createHousingFactory(new MemoryAdapter());
    const housing = factory.build({ geoCode: '75056' });

    expect(housing.geoCode).toBe('75056');
  });

  it('creates via the adapter with table "housings"', async () => {
    const adapter = new MemoryAdapter();
    const spy = vi.spyOn(adapter, 'create');
    const factory = createHousingFactory(adapter);

    const housing = await factory.create();

    expect(spy).toHaveBeenCalledWith('housings', expect.objectContaining({ id: housing.id }));
  });

  it('builds a list of housings', () => {
    const factory = createHousingFactory(new MemoryAdapter());
    const housings = factory.buildList(5);

    expect(housings).toHaveLength(5);
    expect(new Set(housings.map((h) => h.id)).size).toBe(5);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
yarn nx test @zerologementvacant/factories -- src/factories/housing.test.ts
```

Expected: FAIL — `Cannot find module './housing'`

- [ ] **Step 3: Implement `packages/factories/src/factories/housing.ts`**

```ts
import { Factory } from 'fishery';
import { faker } from '@faker-js/faker/locale/fr';
import {
  CADASTRAL_CLASSIFICATION_VALUES,
  DATA_FILE_YEAR_VALUES,
  ENERGY_CONSUMPTION_VALUES,
  HOUSING_KIND_VALUES,
  HOUSING_SOURCE_VALUES,
  HOUSING_STATUS_VALUES,
  HousingStatus,
  INTERNAL_CO_CONDOMINIUM_VALUES,
  INTERNAL_MONO_CONDOMINIUM_VALUES,
  MUTATION_TYPE_VALUES,
  READ_WRITE_OCCUPANCY_VALUES,
  type HousingDTO
} from '@zerologementvacant/models';
import { match, Pattern } from 'ts-pattern';
import type { Adapter } from '../adapter';

function genGeoCode(): string {
  const geoCode = faker.helpers.arrayElement([
    faker.location.zipCode(),
    faker.helpers.arrayElement(['2A', '2B']) +
      faker.string.numeric({ length: 3 })
  ]);
  const needsReroll =
    geoCode.startsWith('00') ||
    geoCode.startsWith('20') ||
    geoCode.startsWith('96') ||
    geoCode.startsWith('97') ||
    geoCode.startsWith('98') ||
    geoCode.startsWith('99') ||
    geoCode.endsWith('999');
  return needsReroll ? genGeoCode() : geoCode;
}

export function createHousingFactory(adapter: Adapter) {
  return Factory.define<HousingDTO>(() => {
    const geoCode = genGeoCode();
    const department = geoCode.substring(0, 2);
    const locality = geoCode.substring(2, 5);
    const invariant = locality + faker.string.alpha(7);
    const localId = department + invariant;
    const dataFileYears = faker.helpers
      .arrayElements(DATA_FILE_YEAR_VALUES)
      .toSorted();
    const dataYears = dataFileYears
      .map((dataFileYear) =>
        match(dataFileYear)
          .returnType<string>()
          .with(Pattern.string.startsWith('ff-'), (y) =>
            y.substring('ff-'.length, 'ff-YYYY'.length)
          )
          .with(Pattern.string.startsWith('lovac-'), (y) =>
            y.substring('lovac-'.length, 'lovac-YYYY'.length)
          )
          .exhaustive()
      )
      .map(Number);

    return {
      id: faker.string.uuid(),
      geoCode,
      invariant,
      localId,
      rawAddress: [
        faker.location.streetAddress(),
        `${geoCode} ${faker.location.city()}`
      ],
      latitude: faker.location.latitude({ min: 43.19, max: 49.49 }),
      longitude: faker.location.longitude({ min: -1.69, max: 6.8 }),
      owner: null,
      livingArea: faker.number.int({ min: 10, max: 300 }),
      cadastralClassification: faker.helpers.arrayElement([
        null,
        ...CADASTRAL_CLASSIFICATION_VALUES
      ]),
      uncomfortable: faker.datatype.boolean(),
      vacancyStartYear: faker.date.past({ years: 20 }).getUTCFullYear(),
      housingKind: faker.helpers.arrayElement(HOUSING_KIND_VALUES),
      roomsCount: faker.number.int({ min: 0, max: 10 }),
      cadastralReference: faker.string.alpha(),
      buildingId: null,
      buildingYear: faker.date.past({ years: 100 }).getUTCFullYear(),
      taxed: faker.datatype.boolean(),
      dataYears,
      dataFileYears,
      buildingLocation: faker.string.alpha(),
      ownershipKind:
        faker.helpers.maybe(() =>
          faker.helpers.arrayElement([
            ...INTERNAL_MONO_CONDOMINIUM_VALUES,
            ...INTERNAL_CO_CONDOMINIUM_VALUES
          ])
        ) ?? null,
      status: faker.helpers.weightedArrayElement([
        {
          value: HousingStatus.NEVER_CONTACTED,
          weight: HOUSING_STATUS_VALUES.length - 1
        },
        ...HOUSING_STATUS_VALUES.filter(
          (s) => s !== HousingStatus.NEVER_CONTACTED
        ).map((s) => ({ value: s, weight: 1 }))
      ]),
      subStatus: null,
      actualEnergyConsumption: faker.helpers.arrayElement([
        null,
        ...ENERGY_CONSUMPTION_VALUES
      ]),
      energyConsumption: faker.helpers.arrayElement([
        null,
        ...ENERGY_CONSUMPTION_VALUES
      ]),
      energyConsumptionAt: faker.helpers.maybe(() => faker.date.past()) ?? null,
      occupancy: faker.helpers.arrayElement(READ_WRITE_OCCUPANCY_VALUES),
      occupancyIntended: faker.helpers.arrayElement(READ_WRITE_OCCUPANCY_VALUES),
      campaignIds: [],
      source: faker.helpers.arrayElement(HOUSING_SOURCE_VALUES),
      plotId:
        geoCode +
        faker.string.numeric({ length: 3, allowLeadingZeros: true }) +
        faker.string.alpha({ length: 2, casing: 'upper' }) +
        faker.string.numeric({ length: 4, allowLeadingZeros: true }),
      plotArea: faker.number.int({ min: 100, max: 10000 }),
      beneficiaryCount: null,
      rentalValue: faker.number.int({ min: 500, max: 1000 }),
      lastMutationType: faker.helpers.arrayElement(MUTATION_TYPE_VALUES),
      lastMutationDate:
        faker.helpers.maybe(() => faker.date.past({ years: 20 }).toJSON()) ?? null,
      lastTransactionDate:
        faker.helpers.maybe(() => faker.date.past({ years: 20 }).toJSON()) ?? null,
      lastTransactionValue:
        faker.helpers.maybe(() => Number(faker.finance.amount({ dec: 0 }))) ?? null
    };
  }).onCreate((entity) => adapter.create('housings', entity));
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
yarn nx test @zerologementvacant/factories -- src/factories/housing.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/factories/src/factories/housing.ts packages/factories/src/factories/housing.test.ts packages/factories/package.json
git commit -m "feat(factories): add housing factory"
```

---

## Task 8: Group factory

**Files:**
- Create: `packages/factories/src/factories/group.ts`
- Create: `packages/factories/src/factories/group.test.ts`

- [ ] **Step 1: Write failing test `packages/factories/src/factories/group.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { MemoryAdapter } from '../memory-adapter';
import { createGroupFactory } from './group';

describe('createGroupFactory', () => {
  it('builds a GroupDTO with required fields', () => {
    const factory = createGroupFactory(new MemoryAdapter());
    const group = factory.build();

    expect(group.id).toBeDefined();
    expect(group.title).toBeDefined();
    expect(group.description).toBeDefined();
    expect(group.housingCount).toBe(0);
    expect(group.ownerCount).toBe(0);
    expect(group.archivedAt).toBeNull();
  });

  it('allows overriding fields', () => {
    const factory = createGroupFactory(new MemoryAdapter());
    const group = factory.build({ title: 'My Group' });

    expect(group.title).toBe('My Group');
  });

  it('creates via the adapter with table "groups"', async () => {
    const adapter = new MemoryAdapter();
    const spy = vi.spyOn(adapter, 'create');
    const factory = createGroupFactory(adapter);

    const group = await factory.create();

    expect(spy).toHaveBeenCalledWith('groups', expect.objectContaining({ id: group.id }));
  });

  it('builds a list of groups', () => {
    const factory = createGroupFactory(new MemoryAdapter());
    const groups = factory.buildList(3);

    expect(groups).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
yarn nx test @zerologementvacant/factories -- src/factories/group.test.ts
```

Expected: FAIL — `Cannot find module './group'`

- [ ] **Step 3: Implement `packages/factories/src/factories/group.ts`**

```ts
import { Factory } from 'fishery';
import { faker } from '@faker-js/faker/locale/fr';
import { type GroupDTO } from '@zerologementvacant/models';
import type { Adapter } from '../adapter';

export function createGroupFactory(adapter: Adapter) {
  return Factory.define<GroupDTO>(() => ({
    id: faker.string.uuid(),
    title: faker.commerce.productName(),
    description: faker.lorem.sentence(),
    housingCount: 0,
    ownerCount: 0,
    createdAt: new Date().toJSON(),
    archivedAt: null
  })).onCreate((entity) => adapter.create('groups', entity));
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
yarn nx test @zerologementvacant/factories -- src/factories/group.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/factories/src/factories/group.ts packages/factories/src/factories/group.test.ts
git commit -m "feat(factories): add group factory"
```

---

## Task 9: Campaign factory

**Files:**
- Create: `packages/factories/src/factories/campaign.ts`
- Create: `packages/factories/src/factories/campaign.test.ts`

- [ ] **Step 1: Write failing test `packages/factories/src/factories/campaign.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { MemoryAdapter } from '../memory-adapter';
import { createCampaignFactory } from './campaign';

describe('createCampaignFactory', () => {
  it('builds a CampaignDTO with required fields', () => {
    const factory = createCampaignFactory(new MemoryAdapter());
    const campaign = factory.build();

    expect(campaign.id).toBeDefined();
    expect(campaign.title).toBeDefined();
    expect(campaign.status).toBeDefined();
    expect(campaign.createdBy).toBeDefined();
    expect(campaign.createdBy.id).toBeDefined();
  });

  it('allows overriding the creator', () => {
    const factory = createCampaignFactory(new MemoryAdapter());
    const campaign = factory.build({ createdBy: { id: 'user-42' } as any });

    expect(campaign.createdBy.id).toBe('user-42');
  });

  it('creates via the adapter with table "campaigns"', async () => {
    const adapter = new MemoryAdapter();
    const spy = vi.spyOn(adapter, 'create');
    const factory = createCampaignFactory(adapter);

    const campaign = await factory.create();

    expect(spy).toHaveBeenCalledWith('campaigns', expect.objectContaining({ id: campaign.id }));
  });

  it('builds a list of campaigns', () => {
    const factory = createCampaignFactory(new MemoryAdapter());
    const campaigns = factory.buildList(3);

    expect(campaigns).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
yarn nx test @zerologementvacant/factories -- src/factories/campaign.test.ts
```

Expected: FAIL — `Cannot find module './campaign'`

- [ ] **Step 3: Implement `packages/factories/src/factories/campaign.ts`**

```ts
import { Factory } from 'fishery';
import { faker } from '@faker-js/faker/locale/fr';
import {
  CAMPAIGN_STATUS_VALUES,
  TIME_PER_WEEK_VALUES,
  UserRole,
  type CampaignDTO,
  type UserDTO
} from '@zerologementvacant/models';
import type { Adapter } from '../adapter';

function genDefaultUser(): UserDTO {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: faker.phone.number(),
    position: faker.person.jobTitle(),
    timePerWeek: faker.helpers.arrayElement(TIME_PER_WEEK_VALUES),
    activatedAt: faker.date.recent().toJSON(),
    lastAuthenticatedAt: faker.date.recent().toJSON(),
    suspendedAt: null,
    suspendedCause: null,
    updatedAt: faker.date.recent().toJSON(),
    establishmentId: null,
    role: UserRole.USUAL,
    kind: null
  };
}

export function createCampaignFactory(adapter: Adapter) {
  return Factory.define<CampaignDTO>(() => ({
    id: faker.string.uuid(),
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    status: faker.helpers.arrayElement(CAMPAIGN_STATUS_VALUES),
    filters: {},
    createdAt: faker.date.past().toJSON(),
    createdBy: genDefaultUser(),
    sentAt: null,
    housingCount: 0,
    ownerCount: 0,
    returnCount: 0,
    returnRate: null
  })).onCreate((entity) => adapter.create('campaigns', entity));
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
yarn nx test @zerologementvacant/factories -- src/factories/campaign.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/factories/src/factories/campaign.ts packages/factories/src/factories/campaign.test.ts
git commit -m "feat(factories): add campaign factory"
```

---

## Task 10: createFactories + public exports

**Files:**
- Create: `packages/factories/src/create-factories.ts`
- Modify: `packages/factories/src/index.ts`
- Create: `packages/factories/src/create-factories.test.ts`

- [ ] **Step 1: Write failing test `packages/factories/src/create-factories.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import createFactories, { MemoryAdapter } from './index';

describe('createFactories', () => {
  it('returns factories for all entities', () => {
    const factories = createFactories(new MemoryAdapter());

    expect(factories.user).toBeDefined();
    expect(factories.establishment).toBeDefined();
    expect(factories.owner).toBeDefined();
    expect(factories.housing).toBeDefined();
    expect(factories.group).toBeDefined();
    expect(factories.campaign).toBeDefined();
  });

  it('each factory builds its entity', () => {
    const factories = createFactories(new MemoryAdapter());

    expect(factories.user.build().id).toBeDefined();
    expect(factories.establishment.build().siren).toBeDefined();
    expect(factories.owner.build().fullName).toBeDefined();
    expect(factories.housing.build().geoCode).toBeDefined();
    expect(factories.group.build().title).toBeDefined();
    expect(factories.campaign.build().status).toBeDefined();
  });

  it('each factory creates via the adapter', async () => {
    const adapter = new MemoryAdapter();
    const factories = createFactories(adapter);

    const user = await factories.user.create();
    const housing = await factories.housing.create();

    expect(user.id).toBeDefined();
    expect(housing.id).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
yarn nx test @zerologementvacant/factories -- src/create-factories.test.ts
```

Expected: FAIL — `createFactories` not exported from index

- [ ] **Step 3: Implement `packages/factories/src/create-factories.ts`**

```ts
import type { Adapter } from './adapter';
import { createCampaignFactory } from './factories/campaign';
import { createEstablishmentFactory } from './factories/establishment';
import { createGroupFactory } from './factories/group';
import { createHousingFactory } from './factories/housing';
import { createOwnerFactory } from './factories/owner';
import { createUserFactory } from './factories/user';

export type Factories = {
  campaign: ReturnType<typeof createCampaignFactory>;
  establishment: ReturnType<typeof createEstablishmentFactory>;
  group: ReturnType<typeof createGroupFactory>;
  housing: ReturnType<typeof createHousingFactory>;
  owner: ReturnType<typeof createOwnerFactory>;
  user: ReturnType<typeof createUserFactory>;
};

export default function createFactories(adapter: Adapter): Factories {
  return {
    campaign: createCampaignFactory(adapter),
    establishment: createEstablishmentFactory(adapter),
    group: createGroupFactory(adapter),
    housing: createHousingFactory(adapter),
    owner: createOwnerFactory(adapter),
    user: createUserFactory(adapter)
  };
}
```

- [ ] **Step 4: Replace `packages/factories/src/index.ts`**

```ts
export type { Adapter } from './adapter';
export type { EntityMap } from './entity-map';
export { MemoryAdapter } from './memory-adapter';
export type { Factories } from './create-factories';
export { default } from './create-factories';
```

- [ ] **Step 5: Run test — verify it passes**

```bash
yarn nx test @zerologementvacant/factories -- src/create-factories.test.ts
```

Expected: PASS

- [ ] **Step 6: Run all tests for the package**

```bash
yarn nx test @zerologementvacant/factories
```

Expected: all PASS

- [ ] **Step 7: Run typecheck**

```bash
yarn nx typecheck @zerologementvacant/factories
```

Expected: exits 0

- [ ] **Step 8: Commit**

```bash
git add packages/factories/src/create-factories.ts packages/factories/src/index.ts packages/factories/src/create-factories.test.ts
git commit -m "feat(factories): add createFactories and public exports"
```

---

## Task 11: Build verification

- [ ] **Step 1: Build the package**

```bash
yarn nx build @zerologementvacant/factories
```

Expected: exits 0, `packages/factories/dist/lib/` contains JS + `.d.ts` files.

- [ ] **Step 2: Run full workspace typecheck to catch any cross-package issues**

```bash
yarn nx run-many -t typecheck --exclude=zero-logement-vacant
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "chore(factories): verify build passes"
```

If no files changed, skip this step.
