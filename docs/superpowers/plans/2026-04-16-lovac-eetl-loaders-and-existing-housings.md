# LOVAC EETL — loader extraction & existing-housings command

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the load step of three LOVAC pipelines into named `loader` files (single demultiplexing `WritableStream`, no `tee()`), and split `housings/housing-processor.ts` into `housing-transform.ts` + `housing-loader.ts` + `housing-command.ts`, exposed via a new CLI subcommand `existing-housings`.

**Architecture:** Each pipeline ends in `.pipeTo(createXxxLoader(...))`. The loader owns chunked buffering and per-kind flushing internally, replicating the inline `createOwnerLoadSink` pattern that already exists in `source-owner-command.ts`. The verification logic that currently runs as Phase 3 of `source-housing-command.ts` is moved to its own command so it can be invoked independently after the source import.

**Tech Stack:** TypeScript, Knex, PostgreSQL, node:stream/web, Vitest, ts-pattern.

---

## File Map

```
server/src/scripts/import-lovac/

source-owners/
  source-owner-loader.ts                 NEW    extracts createOwnerLoadSink as createOwnerLoader
  source-owner-command.ts                MODIFY .pipeTo(createOwnerLoader(...)); drop sink + helpers
  test/source-owner-loader.test.ts       NEW    integration

source-housings/
  source-housing-loader.ts               NEW    demultiplexer for HousingChange | HousingEventChange | AddressChange
  source-housing-command.ts              MODIFY Phase 2 ends in pipeTo(createHousingLoader(...)); Phase 3 deleted
  test/source-housing-loader.test.ts     NEW    integration
  test/source-housing-command.test.ts    MODIFY remove Phase 3 assertions + seed data

source-housing-owners/
  source-housing-owner-loader.ts         NEW    demultiplexer for HousingOwnersChange | HousingEventChange
  source-housing-owner-command.ts        MODIFY .pipeTo(createHousingOwnerLoader(...))
  test/source-housing-owner-loader.test.ts NEW  integration

housings/
  housing-transform.ts                   NEW    pure fn — port of housing-processor logic, parameterized by year
  housing-loader.ts                      NEW    demultiplexer for HousingUpdateChange | HousingEventChange
  housing-command.ts                     NEW    standalone command — wires transform + loader
  housing-processor.ts                   DELETE
  test/housing-transform.test.ts         NEW    unit (no DB)
  test/housing-loader.test.ts            NEW    integration
  test/housing-command.test.ts           NEW    integration (covers Phase 3 cases moved out of source-housing-command.test.ts)
  test/housing-processor.test.ts         DELETE

cli.ts                                   MODIFY register `existing-housings` subcommand
```

---

## Task 1: Extract `createOwnerLoader`

**Files:**
- Create: `server/src/scripts/import-lovac/source-owners/source-owner-loader.ts`
- Create: `server/src/scripts/import-lovac/source-owners/test/source-owner-loader.test.ts`
- Modify: `server/src/scripts/import-lovac/source-owners/source-owner-command.ts`

The current `createOwnerLoadSink` in `source-owner-command.ts:141-188` is the reference shape. We move it verbatim to its own file and rename, then rewire the command.

- [ ] **Step 1.1: Write the failing loader test**

```typescript
// server/src/scripts/import-lovac/source-owners/test/source-owner-loader.test.ts
import { faker } from '@faker-js/faker/locale/fr';
import { ReadableStream } from 'node:stream/web';

import {
  formatOwnerApi,
  Owners,
  OwnerRecordDBO
} from '~/repositories/ownerRepository';
import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';
import { createOwnerLoader } from '../source-owner-loader';
import { OwnerChange } from '../source-owner-transform';
import { genOwnerApi } from '~/test/testFixtures';

describe('createOwnerLoader', () => {
  it('inserts new owners', async () => {
    const reporter = createNoopReporter();
    const owner = formatOwnerApi(genOwnerApi());
    const change: OwnerChange = { type: 'owner', kind: 'create', value: owner };

    await ReadableStream.from([change]).pipeTo(
      createOwnerLoader({ dryRun: false, reporter })
    );

    const actual = await Owners().where({ id: owner.id }).first();
    expect(actual).toBeDefined();
    expect(actual?.idpersonne).toBe(owner.idpersonne);
  });

  it('upserts existing owners', async () => {
    const reporter = createNoopReporter();
    const existing = formatOwnerApi(genOwnerApi());
    await Owners().insert(existing);
    const updated: OwnerRecordDBO = {
      ...existing,
      full_name: 'CHANGED NAME',
      updated_at: new Date()
    };
    const change: OwnerChange = { type: 'owner', kind: 'update', value: updated };

    await ReadableStream.from([change]).pipeTo(
      createOwnerLoader({ dryRun: false, reporter })
    );

    const actual = await Owners().where({ id: existing.id }).first();
    expect(actual?.full_name).toBe('CHANGED NAME');
  });

  it('skips writes when dryRun is true', async () => {
    const reporter = createNoopReporter();
    const owner = formatOwnerApi(genOwnerApi());
    const change: OwnerChange = { type: 'owner', kind: 'create', value: owner };

    await ReadableStream.from([change]).pipeTo(
      createOwnerLoader({ dryRun: true, reporter })
    );

    const actual = await Owners().where({ id: owner.id }).first();
    expect(actual).toBeUndefined();
  });

  it('reports created and updated counts', async () => {
    const reporter = createNoopReporter();
    const createdSpy = vi.spyOn(reporter, 'created');
    const updatedSpy = vi.spyOn(reporter, 'updated');

    const newOwner = formatOwnerApi(genOwnerApi());
    const existing = formatOwnerApi(genOwnerApi());
    await Owners().insert(existing);
    const updated: OwnerRecordDBO = { ...existing, full_name: 'X', updated_at: new Date() };

    const changes: OwnerChange[] = [
      { type: 'owner', kind: 'create', value: newOwner },
      { type: 'owner', kind: 'update', value: updated }
    ];

    await ReadableStream.from(changes).pipeTo(
      createOwnerLoader({ dryRun: false, reporter })
    );

    expect(createdSpy).toHaveBeenCalledWith(1);
    expect(updatedSpy).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 1.2: Run test to verify it fails**

```bash
yarn nx test server -- source-owner-loader
```

Expected: `Cannot find module '../source-owner-loader'`.

- [ ] **Step 1.3: Implement `createOwnerLoader`**

```typescript
// server/src/scripts/import-lovac/source-owners/source-owner-loader.ts
import { match } from 'ts-pattern';
import { WritableStream } from 'node:stream/web';

import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import {
  Owners,
  OwnerRecordDBO,
  ownerTable
} from '~/repositories/ownerRepository';
import { Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';
import { SourceOwner } from '~/scripts/import-lovac/source-owners/source-owner';
import { OwnerChange } from '~/scripts/import-lovac/source-owners/source-owner-transform';

const logger = createLogger('createOwnerLoader');

const CHUNK_SIZE = 1_000;
const UPSERT_COLUMNS = [
  'full_name',
  'birth_date',
  'siren',
  'address_dgfip',
  'kind_class',
  'data_source',
  'updated_at'
] as const;

export interface OwnerLoaderOptions {
  dryRun?: boolean;
  reporter: Reporter<SourceOwner>;
}

export function createOwnerLoader(
  options: OwnerLoaderOptions
): WritableStream<OwnerChange> {
  const insertBuffer: OwnerRecordDBO[] = [];
  const upsertBuffer: OwnerRecordDBO[] = [];

  async function flushInserts(): Promise<void> {
    if (insertBuffer.length === 0) return;
    const batch = insertBuffer.splice(0);
    if (options.dryRun) return;
    logger.debug(`Inserting ${batch.length} owners...`);
    await Owners().insert(batch);
    options.reporter.created(batch.length);
  }

  async function flushUpserts(): Promise<void> {
    if (upsertBuffer.length === 0) return;
    const batch = upsertBuffer.splice(0);
    if (options.dryRun) return;
    logger.debug(`Upserting ${batch.length} owners...`);
    await db.transaction(async (trx) => {
      await trx(ownerTable)
        .insert(batch)
        .onConflict('idpersonne')
        .merge([...UPSERT_COLUMNS]);
    });
    options.reporter.updated(batch.length);
  }

  return new WritableStream<OwnerChange>({
    async write(change) {
      await match(change)
        .with({ kind: 'create' }, async (c) => {
          insertBuffer.push(c.value);
          if (insertBuffer.length >= CHUNK_SIZE) await flushInserts();
        })
        .with({ kind: 'update' }, async (c) => {
          upsertBuffer.push(c.value);
          if (upsertBuffer.length >= CHUNK_SIZE) await flushUpserts();
        })
        .exhaustive();
    },
    async close() {
      await Promise.all([flushInserts(), flushUpserts()]);
    }
  });
}
```

- [ ] **Step 1.4: Run loader test to verify it passes**

```bash
yarn nx test server -- source-owner-loader
```

Expected: all tests PASS.

- [ ] **Step 1.5: Rewire `source-owner-command.ts` to use the loader**

Replace the entire contents of `server/src/scripts/import-lovac/source-owners/source-owner-command.ts` with:

```typescript
import { count, createS3, map } from '@zerologementvacant/utils/node';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { match } from 'ts-pattern';
import { writeFileSync } from 'node:fs';

import config from '~/infra/config';
import { createLogger } from '~/infra/logger';
import { createLoggerReporter } from '~/scripts/import-lovac/infra';
import { Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';
import { FromOptionValue } from '~/scripts/import-lovac/infra/options/from';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import validator from '~/scripts/import-lovac/infra/validator';
import {
  SourceOwner,
  sourceOwnerSchema
} from '~/scripts/import-lovac/source-owners/source-owner';
import { createOwnerEnricher } from '~/scripts/import-lovac/source-owners/source-owner-enricher';
import { createOwnerLoader } from '~/scripts/import-lovac/source-owners/source-owner-loader';
import { createOwnerTransform } from '~/scripts/import-lovac/source-owners/source-owner-transform';
import { createSourceOwnerRepository } from '~/scripts/import-lovac/source-owners/source-owner-repository';

const logger = createLogger('sourceOwnerCommand');

export interface ExecOptions {
  abortEarly?: boolean;
  departments?: string[];
  dryRun?: boolean;
  from: FromOptionValue;
  year: string;
}

export function createSourceOwnerCommand() {
  const reporter = createLoggerReporter<SourceOwner>();

  return async (file: string, options: ExecOptions): Promise<void> => {
    try {
      console.time('Import owners');
      logger.info('Computing total...', { file });
      const total = await count(
        createSourceOwnerRepository({
          from: options.from,
          file,
          ...config.s3
        }).stream({
          departments: options.departments
        })
      );

      logger.info('Starting import...', { file, total });
      await createSourceOwnerRepository({
        from: options.from,
        file,
        ...config.s3
      })
        .stream({ departments: options.departments })
        .pipeThrough(
          progress({
            initial: 0,
            total,
            name: 'Importing owners'
          })
        )
        .pipeThrough(
          validator(sourceOwnerSchema, {
            abortEarly: options.abortEarly,
            reporter
          })
        )
        .pipeThrough(createOwnerEnricher())
        .pipeThrough(
          map(
            createOwnerTransform({
              reporter,
              abortEarly: options.abortEarly,
              year: options.year
            })
          )
        )
        .pipeTo(createOwnerLoader({ dryRun: options.dryRun, reporter }));

      logger.info(`File ${file} imported.`);
    } finally {
      reporter.report();
      await writeReport(file, options, reporter);
      console.timeEnd('Import owners');
    }
  };
}

async function writeReport(
  file: string,
  options: ExecOptions,
  reporter: Reporter<SourceOwner>
): Promise<void> {
  const json = JSON.stringify(reporter.getSummary(), null, 2);
  try {
    await match(options)
      .with({ from: 's3' }, async () => {
        const s3 = createS3(config.s3);
        await s3.send(
          new PutObjectCommand({
            Bucket: config.s3.bucket,
            Key: `${file}.report.json`,
            Body: json,
            ContentType: 'application/json'
          })
        );
      })
      .with({ from: 'file' }, async () => {
        writeFileSync(
          `./import-lovac-${options.year}-owners.report.json`,
          json,
          'utf8'
        );
      })
      .exhaustive();
  } catch (error) {
    logger.warn('Failed to write report', { error });
  }
}
```

- [ ] **Step 1.6: Run the existing source-owner-command test to verify behavior is preserved**

```bash
yarn nx test server -- source-owner-command
```

Expected: all tests PASS — behavior is unchanged because the loader is a pure extraction of the inline sink.

- [ ] **Step 1.7: Commit**

```bash
git add server/src/scripts/import-lovac/source-owners/source-owner-loader.ts \
        server/src/scripts/import-lovac/source-owners/test/source-owner-loader.test.ts \
        server/src/scripts/import-lovac/source-owners/source-owner-command.ts
git commit -m "feat(server): extract source-owner load sink into createOwnerLoader"
```

---

## Task 2: Extract `createHousingOwnerLoader`

**Files:**
- Create: `server/src/scripts/import-lovac/source-housing-owners/source-housing-owner-loader.ts`
- Create: `server/src/scripts/import-lovac/source-housing-owners/test/source-housing-owner-loader.test.ts`
- Modify: `server/src/scripts/import-lovac/source-housing-owners/source-housing-owner-command.ts`

The two sinks in `source-housing-owner-command.ts:118-170` collapse into one demultiplexer.

- [ ] **Step 2.1: Write the failing loader test**

```typescript
// server/src/scripts/import-lovac/source-housing-owners/test/source-housing-owner-loader.test.ts
import { faker } from '@faker-js/faker/locale/fr';
import { ACTIVE_OWNER_RANKS, ActiveOwnerRank } from '@zerologementvacant/models';
import { ReadableStream } from 'node:stream/web';

import {
  Events,
  formatEventApi,
  HOUSING_EVENTS_TABLE
} from '~/repositories/eventRepository';
import {
  formatHousingOwnerApi,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import {
  formatOwnerApi,
  Owners
} from '~/repositories/ownerRepository';
import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';
import { createHousingOwnerLoader } from '../source-housing-owner-loader';
import {
  HousingEventChange,
  HousingOwnerChange,
  HousingOwnersChange
} from '../source-housing-owner-transform';
import {
  genEstablishmentApi,
  genEventApi,
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi,
  genUserApi
} from '~/test/testFixtures';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { Users, toUserDBO } from '~/repositories/userRepository';

describe('createHousingOwnerLoader', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));
  });

  it('replaces housing owners transactionally per group', async () => {
    const reporter = createNoopReporter();
    const housing = genHousingApi();
    const owner = genOwnerApi();
    await Housing().insert(formatHousingRecordApi(housing));
    await Owners().insert(formatOwnerApi(owner));

    const newHousingOwner = formatHousingOwnerApi({
      ...genHousingOwnerApi(housing, owner),
      rank: 1 as ActiveOwnerRank
    });
    const change: HousingOwnersChange = {
      type: 'housingOwners',
      kind: 'replace',
      value: [newHousingOwner]
    };

    await ReadableStream.from([change]).pipeTo(
      createHousingOwnerLoader({ dryRun: false, reporter })
    );

    const actual = await HousingOwners()
      .where({
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      });
    expect(actual).toHaveLength(1);
    expect(actual[0].owner_id).toBe(owner.id);
  });

  it('inserts events in batches', async () => {
    const reporter = createNoopReporter();
    const housing = genHousingApi();
    const owner = genOwnerApi();
    await Housing().insert(formatHousingRecordApi(housing));
    await Owners().insert(formatOwnerApi(owner));

    const eventApi = {
      ...genEventApi({ type: 'housing:owner-attached', creator: user }),
      ownerId: owner.id,
      housingGeoCode: housing.geoCode,
      housingId: housing.id
    };
    const change: HousingEventChange = {
      type: 'event',
      kind: 'create',
      value: eventApi
    };

    await ReadableStream.from([change]).pipeTo(
      createHousingOwnerLoader({ dryRun: false, reporter })
    );

    const actual = await Events().where({ id: eventApi.id }).first();
    expect(actual).toBeDefined();
  });

  it('skips writes when dryRun is true', async () => {
    const reporter = createNoopReporter();
    const housing = genHousingApi();
    const owner = genOwnerApi();
    await Housing().insert(formatHousingRecordApi(housing));
    await Owners().insert(formatOwnerApi(owner));

    const newHousingOwner = formatHousingOwnerApi({
      ...genHousingOwnerApi(housing, owner),
      rank: 1 as ActiveOwnerRank
    });
    const change: HousingOwnersChange = {
      type: 'housingOwners',
      kind: 'replace',
      value: [newHousingOwner]
    };

    await ReadableStream.from([change]).pipeTo(
      createHousingOwnerLoader({ dryRun: true, reporter })
    );

    const actual = await HousingOwners()
      .where({ housing_geo_code: housing.geoCode, housing_id: housing.id });
    expect(actual).toHaveLength(0);
  });
});
```

- [ ] **Step 2.2: Run test to verify it fails**

```bash
yarn nx test server -- source-housing-owner-loader
```

Expected: `Cannot find module '../source-housing-owner-loader'`.

- [ ] **Step 2.3: Implement `createHousingOwnerLoader`**

```typescript
// server/src/scripts/import-lovac/source-housing-owners/source-housing-owner-loader.ts
import { chunkify } from '@zerologementvacant/utils/node';
import { match } from 'ts-pattern';
import { Transform, Writable } from 'node:stream';
import { TransformStream, WritableStream } from 'node:stream/web';

import { withinTransaction } from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import { HousingEventApi } from '~/models/EventApi';
import eventRepository from '~/repositories/eventRepository';
import {
  HousingOwnerDBO,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import { Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';
import { SourceHousingOwner } from './source-housing-owner';
import { HousingOwnerChange } from './source-housing-owner-transform';

const logger = createLogger('createHousingOwnerLoader');

const EVENT_CHUNK_SIZE = 1_000;

export interface HousingOwnerLoaderOptions {
  dryRun?: boolean;
  reporter: Reporter<SourceHousingOwner>;
}

export function createHousingOwnerLoader(
  options: HousingOwnerLoaderOptions
): WritableStream<HousingOwnerChange> {
  const eventBuffer: HousingEventApi[] = [];

  async function flushEvents(): Promise<void> {
    if (eventBuffer.length === 0) return;
    const batch = eventBuffer.splice(0);
    if (options.dryRun) return;
    logger.debug(`Inserting ${batch.length} housing-owner events...`);
    await eventRepository.insertManyHousingEvents(batch);
  }

  async function replaceHousingOwners(
    housingOwners: ReadonlyArray<HousingOwnerDBO>
  ): Promise<void> {
    if (housingOwners.length === 0 || options.dryRun) return;
    const housingGeoCode = housingOwners[0].housing_geo_code;
    const housingId = housingOwners[0].housing_id;
    await withinTransaction(async (transaction) => {
      await HousingOwners(transaction)
        .where({
          housing_geo_code: housingGeoCode,
          housing_id: housingId
        })
        .delete();
      await HousingOwners(transaction).insert(housingOwners as HousingOwnerDBO[]);
    });
  }

  return new WritableStream<HousingOwnerChange>({
    async write(change) {
      await match(change)
        .with({ type: 'housingOwners', kind: 'replace' }, async (c) => {
          await replaceHousingOwners(c.value);
        })
        .with({ type: 'event', kind: 'create' }, async (c) => {
          eventBuffer.push(c.value);
          if (eventBuffer.length >= EVENT_CHUNK_SIZE) {
            await flushEvents();
          }
        })
        .exhaustive();
    },
    async close() {
      await flushEvents();
    }
  });
}
```

- [ ] **Step 2.4: Run loader test to verify it passes**

```bash
yarn nx test server -- source-housing-owner-loader
```

Expected: all tests PASS.

- [ ] **Step 2.5: Rewire `source-housing-owner-command.ts`**

Replace the entire contents of `server/src/scripts/import-lovac/source-housing-owners/source-housing-owner-command.ts` with:

```typescript
import {
  count,
  createS3,
  flatten,
  groupBy,
  map
} from '@zerologementvacant/utils/node';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { writeFileSync } from 'node:fs';
import { match } from 'ts-pattern';

import UserMissingError from '~/errors/userMissingError';
import config from '~/infra/config';
import { createLogger } from '~/infra/logger';
import userRepository from '~/repositories/userRepository';
import { createLoggerReporter } from '~/scripts/import-lovac/infra';
import { FromOptionValue } from '~/scripts/import-lovac/infra/options/from';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import { Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';
import validator from '~/scripts/import-lovac/infra/validator';
import {
  SourceHousingOwner,
  sourceHousingOwnerSchema
} from '~/scripts/import-lovac/source-housing-owners/source-housing-owner';
import { createSourceHousingOwnerEnricher } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-enricher';
import { createHousingOwnerLoader } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-loader';
import {
  createHousingOwnerTransform,
  HousingOwnerChange
} from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-transform';
import { createSourceHousingOwnerRepository } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-repository';

const logger = createLogger('sourceHousingOwnerCommand');

export interface ExecOptions {
  abortEarly?: boolean;
  departments?: string[];
  dryRun?: boolean;
  from: FromOptionValue;
  year: string;
}

export function createSourceHousingOwnerCommand() {
  const reporter = createLoggerReporter<SourceHousingOwner>();

  return async (file: string, options: ExecOptions): Promise<void> => {
    try {
      console.time('Import housing owners');
      logger.debug('Starting source housing owner command...', {
        file,
        options
      });

      const auth = await userRepository.getByEmail(config.app.system);
      if (!auth) {
        throw new UserMissingError(config.app.system);
      }

      logger.info('Computing total...');
      const total = await count(
        createSourceHousingOwnerRepository({
          ...config.s3,
          file,
          from: options.from
        }).stream({
          departments: options.departments
        })
      );

      logger.info('Starting import...', { file });
      await createSourceHousingOwnerRepository({
        ...config.s3,
        file,
        from: options.from
      })
        .stream({
          departments: options.departments
        })
        .pipeThrough(
          progress({
            initial: 0,
            total,
            name: '(1/1) Updating housing owners'
          })
        )
        .pipeThrough(
          validator(sourceHousingOwnerSchema, {
            abortEarly: options.abortEarly,
            reporter
          })
        )
        .pipeThrough(groupBy((a, b) => a.local_id === b.local_id))
        .pipeThrough(createSourceHousingOwnerEnricher())
        .pipeThrough(
          map(
            createHousingOwnerTransform({
              abortEarly: options.abortEarly,
              adminUserId: auth.id,
              reporter,
              year: options.year
            })
          )
        )
        .pipeThrough(flatten<HousingOwnerChange>())
        .pipeTo(createHousingOwnerLoader({ dryRun: options.dryRun, reporter }));

      logger.info(`File ${file} imported.`);
    } finally {
      reporter.report();
      await writeReport(file, options, reporter);
      console.timeEnd('Import housing owners');
    }
  };
}

async function writeReport(
  file: string,
  options: ExecOptions,
  reporter: Reporter<SourceHousingOwner>
): Promise<void> {
  const json = JSON.stringify(reporter.getSummary(), null, 2);
  try {
    await match(options)
      .with({ from: 's3' }, async () => {
        const s3 = createS3(config.s3);
        await s3.send(
          new PutObjectCommand({
            Bucket: config.s3.bucket,
            Key: `${file}.report.json`,
            Body: json,
            ContentType: 'application/json'
          })
        );
      })
      .with({ from: 'file' }, async () => {
        writeFileSync(
          `./import-lovac-${options.year}-housing-owners.report.json`,
          json,
          'utf8'
        );
      })
      .exhaustive();
  } catch (error) {
    logger.warn('Failed to write report', { error });
  }
}
```

- [ ] **Step 2.6: Run the existing source-housing-owner-command test to verify behavior is preserved**

```bash
yarn nx test server -- source-housing-owner-command
```

Expected: all tests PASS.

- [ ] **Step 2.7: Commit**

```bash
git add server/src/scripts/import-lovac/source-housing-owners/source-housing-owner-loader.ts \
        server/src/scripts/import-lovac/source-housing-owners/test/source-housing-owner-loader.test.ts \
        server/src/scripts/import-lovac/source-housing-owners/source-housing-owner-command.ts
git commit -m "feat(server): extract source-housing-owner load sinks into createHousingOwnerLoader"
```

---

## Task 3: Extract `createHousingLoader` (Phase 2 only)

**Files:**
- Create: `server/src/scripts/import-lovac/source-housings/source-housing-loader.ts`
- Create: `server/src/scripts/import-lovac/source-housings/test/source-housing-loader.test.ts`
- Modify: `server/src/scripts/import-lovac/source-housings/source-housing-command.ts`

The 4-way `tee()` block in `source-housing-command.ts:222-311` collapses into a single loader. Phase 1 (geo-code update) and Phase 3 (verification) stay untouched in this task — Phase 3 leaves later in Task 7.

The helpers `insertHousings`, `updateHousings`, and `stripReadOnlyFields` move from `source-housing-command.ts` into `source-housing-loader.ts` as private internals. **Important**: the existing `source-housing-command.test.ts` imports `updateHousings` directly (line 51). After moving it, the test must import it from `source-housing-loader.ts` instead.

- [ ] **Step 3.1: Write the failing loader test**

```typescript
// server/src/scripts/import-lovac/source-housings/test/source-housing-loader.test.ts
import { faker } from '@faker-js/faker/locale/fr';
import {
  AddressKinds,
  HousingStatus,
  Occupancy
} from '@zerologementvacant/models';
import { ReadableStream } from 'node:stream/web';

import { AddressApi } from '~/models/AddressApi';
import { HousingEventApi } from '~/models/EventApi';
import { Addresses } from '~/repositories/banAddressesRepository';
import { Events } from '~/repositories/eventRepository';
import {
  formatHousingRecordApi,
  Housing,
  HousingRecordDBO
} from '~/repositories/housingRepository';
import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';
import { createHousingLoader } from '../source-housing-loader';
import {
  AddressChange,
  HousingChange,
  HousingEventChange,
  SourceHousingChange
} from '../source-housing-transform';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { Users, toUserDBO } from '~/repositories/userRepository';
import {
  genEstablishmentApi,
  genEventApi,
  genHousingApi,
  genUserApi
} from '~/test/testFixtures';

describe('createHousingLoader', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));
  });

  it('inserts new housings on create changes', async () => {
    const reporter = createNoopReporter();
    const housing = formatHousingRecordApi(genHousingApi());
    const change: HousingChange = {
      type: 'housing',
      kind: 'create',
      value: housing
    };

    await ReadableStream.from<SourceHousingChange>([change]).pipeTo(
      createHousingLoader({ dryRun: false, reporter })
    );

    const actual = await Housing()
      .where({ id: housing.id, geo_code: housing.geo_code })
      .first();
    expect(actual).toBeDefined();
  });

  it('updates existing housings on update changes', async () => {
    const reporter = createNoopReporter();
    const housing = formatHousingRecordApi(genHousingApi());
    await Housing().insert(housing);
    const updated: HousingRecordDBO = {
      ...housing,
      occupancy: Occupancy.VACANT,
      status: HousingStatus.NEVER_CONTACTED,
      sub_status: null
    };
    const change: HousingChange = {
      type: 'housing',
      kind: 'update',
      value: updated
    };

    await ReadableStream.from<SourceHousingChange>([change]).pipeTo(
      createHousingLoader({ dryRun: false, reporter })
    );

    const actual = await Housing()
      .where({ id: housing.id, geo_code: housing.geo_code })
      .first();
    expect(actual?.occupancy).toBe(Occupancy.VACANT);
    expect(actual?.status).toBe(HousingStatus.NEVER_CONTACTED);
  });

  it('inserts events on event changes', async () => {
    const reporter = createNoopReporter();
    const housing = formatHousingRecordApi(genHousingApi());
    await Housing().insert(housing);
    const eventApi: HousingEventApi = {
      ...genEventApi({ type: 'housing:occupancy-updated', creator: user }),
      housingGeoCode: housing.geo_code,
      housingId: housing.id
    };
    const change: HousingEventChange = {
      type: 'event',
      kind: 'create',
      value: eventApi
    };

    await ReadableStream.from<SourceHousingChange>([change]).pipeTo(
      createHousingLoader({ dryRun: false, reporter })
    );

    const actual = await Events().where({ id: eventApi.id }).first();
    expect(actual).toBeDefined();
  });

  it('inserts addresses on address changes', async () => {
    const reporter = createNoopReporter();
    const housing = formatHousingRecordApi(genHousingApi());
    await Housing().insert(housing);
    const address: AddressApi = {
      refId: housing.id,
      addressKind: AddressKinds.Housing,
      label: 'X rue Y',
      postalCode: '75001',
      city: 'Paris'
    };
    const change: AddressChange = {
      type: 'address',
      kind: 'create',
      value: address
    };

    await ReadableStream.from<SourceHousingChange>([change]).pipeTo(
      createHousingLoader({ dryRun: false, reporter })
    );

    const actual = await Addresses()
      .where({ ref_id: housing.id, address_kind: AddressKinds.Housing })
      .first();
    expect(actual).toBeDefined();
  });

  it('skips writes when dryRun is true', async () => {
    const reporter = createNoopReporter();
    const housing = formatHousingRecordApi(genHousingApi());
    const change: HousingChange = {
      type: 'housing',
      kind: 'create',
      value: housing
    };

    await ReadableStream.from<SourceHousingChange>([change]).pipeTo(
      createHousingLoader({ dryRun: true, reporter })
    );

    const actual = await Housing()
      .where({ id: housing.id, geo_code: housing.geo_code })
      .first();
    expect(actual).toBeUndefined();
  });
});
```

- [ ] **Step 3.2: Run test to verify it fails**

```bash
yarn nx test server -- source-housing-loader
```

Expected: `Cannot find module '../source-housing-loader'`.

- [ ] **Step 3.3: Implement `createHousingLoader`**

```typescript
// server/src/scripts/import-lovac/source-housings/source-housing-loader.ts
import { Knex } from 'knex';
import fp from 'lodash/fp';
import path from 'node:path';
import { match } from 'ts-pattern';
import { WritableStream } from 'node:stream/web';

import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import { AddressApi } from '~/models/AddressApi';
import { HousingEventApi } from '~/models/EventApi';
import {
  Addresses,
  formatAddressApi
} from '~/repositories/banAddressesRepository';
import eventRepository from '~/repositories/eventRepository';
import {
  Housing,
  HousingRecordDBO,
  housingTable
} from '~/repositories/housingRepository';
import { Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';
import { createUpdater } from '~/scripts/import-lovac/infra/updater';
import { SourceHousing } from './source-housing';
import {
  HousingRecordInsert,
  SourceHousingChange
} from './source-housing-transform';

const logger = createLogger('createHousingLoader');

const CHUNK_SIZE = 1_000;
const TEMPORARY_TABLE = 'source_housing_updates_tmp';

export interface HousingLoaderOptions {
  dryRun?: boolean;
  reporter: Reporter<SourceHousing>;
}

export function createHousingLoader(
  options: HousingLoaderOptions
): WritableStream<SourceHousingChange> {
  const insertBuffer: HousingRecordInsert[] = [];
  const eventBuffer: HousingEventApi[] = [];
  const addressBuffer: AddressApi[] = [];

  // Updates go through a temporary-table-based bulk updater (createUpdater handles its own chunking).
  const updateWriter = options.dryRun
    ? createUpdater<HousingRecordInsert>({
        destination: 'file',
        file: path.join(import.meta.dirname, 'source-housing-updates.jsonl')
      })
    : createUpdater<HousingRecordInsert>({
        destination: 'database',
        temporaryTable: TEMPORARY_TABLE,
        likeTable: housingTable,
        async update(housings): Promise<void> {
          await updateHousings(housings as ReadonlyArray<HousingRecordDBO>, {
            temporaryTable: TEMPORARY_TABLE
          });
        }
      });
  const updateWriterStream = updateWriter.getWriter();

  async function flushInserts(): Promise<void> {
    if (insertBuffer.length === 0) return;
    const batch = insertBuffer.splice(0);
    if (options.dryRun) return;
    logger.debug(`Inserting ${batch.length} housings...`);
    await insertHousings(batch);
  }

  async function flushEvents(): Promise<void> {
    if (eventBuffer.length === 0) return;
    const batch = eventBuffer.splice(0);
    if (options.dryRun) return;
    logger.debug(`Inserting ${batch.length} housing events...`);
    await eventRepository.insertManyHousingEvents(batch);
  }

  async function flushAddresses(): Promise<void> {
    if (addressBuffer.length === 0) return;
    const batch = addressBuffer.splice(0);
    if (options.dryRun) return;
    logger.debug(`Inserting ${batch.length} addresses...`);
    await Addresses()
      .insert(batch.map(formatAddressApi))
      .onConflict(['ref_id', 'address_kind'])
      .ignore();
  }

  return new WritableStream<SourceHousingChange>({
    async write(change) {
      await match(change)
        .with({ type: 'housing', kind: 'create' }, async (c) => {
          insertBuffer.push(c.value);
          if (insertBuffer.length >= CHUNK_SIZE) await flushInserts();
        })
        .with({ type: 'housing', kind: 'update' }, async (c) => {
          await updateWriterStream.write(stripReadOnlyFields(c.value));
        })
        .with({ type: 'event', kind: 'create' }, async (c) => {
          eventBuffer.push(c.value);
          if (eventBuffer.length >= CHUNK_SIZE) await flushEvents();
        })
        .with({ type: 'address', kind: 'create' }, async (c) => {
          addressBuffer.push(c.value);
          if (addressBuffer.length >= CHUNK_SIZE) await flushAddresses();
        })
        .exhaustive();
    },
    async close() {
      await Promise.all([
        flushInserts(),
        flushEvents(),
        flushAddresses(),
        updateWriterStream.close()
      ]);
    }
  });
}

async function insertHousings(
  housings: ReadonlyArray<HousingRecordInsert>
): Promise<void> {
  await Housing().insert(housings as ReadonlyArray<HousingRecordDBO>);
}

interface UpdateHousingsOptions {
  temporaryTable: string;
  keys?: ReadonlyArray<keyof HousingRecordDBO>;
}

export async function updateHousings(
  housings: ReadonlyArray<HousingRecordDBO>,
  opts: UpdateHousingsOptions
): Promise<void> {
  const { temporaryTable } = opts;
  const keys: ReadonlyArray<keyof HousingRecordDBO> = opts.keys?.length
    ? opts.keys
    : [
        'invariant',
        'building_id',
        'building_group_id',
        'plot_id',
        'address_dgfip',
        'longitude_dgfip',
        'latitude_dgfip',
        'geolocation',
        'cadastral_classification',
        'uncomfortable',
        'vacancy_start_year',
        'housing_kind',
        'rooms_count',
        'living_area',
        'cadastral_reference',
        'building_year',
        'mutation_date',
        'last_mutation_date',
        'last_transaction_date',
        'last_transaction_value',
        'taxed',
        'data_years',
        'data_file_years',
        'data_source',
        'beneficiary_count',
        'building_location',
        'rental_value',
        'condominium',
        'status',
        'sub_status',
        'occupancy',
        'occupancy_source',
        'occupancy_intended',
        'energy_consumption_bdnb',
        'energy_consumption_at_bdnb'
      ];
  const updates: Record<string, Knex.Ref<string, any>> = fp.fromPairs(
    keys.map((key) => [key, db.ref(`${temporaryTable}.${key}`)])
  );

  await Housing()
    .update(updates)
    .updateFrom(temporaryTable)
    .where(`${housingTable}.geo_code`, db.ref(`${temporaryTable}.geo_code`))
    .where(`${housingTable}.id`, db.ref(`${temporaryTable}.id`))
    .whereIn(
      [`${temporaryTable}.geo_code`, `${temporaryTable}.id`],
      housings.map((housing) => [housing.geo_code, housing.id])
    );
}

function stripReadOnlyFields(housing: HousingRecordInsert): HousingRecordInsert {
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    last_mutation_type,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    occupancy_history,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    plot_area,
    ...rest
  } = housing as unknown as HousingRecordDBO;
  return rest as HousingRecordInsert;
}
```

- [ ] **Step 3.4: Run loader test to verify it passes**

```bash
yarn nx test server -- source-housing-loader
```

Expected: all tests PASS.

- [ ] **Step 3.5: Rewire `source-housing-command.ts` Phase 2 to use the loader**

In `server/src/scripts/import-lovac/source-housings/source-housing-command.ts`:

(a) Update the imports from `source-housing-transform` (drop `AddressChange`, `HousingChange`, `HousingEventChange as SourceHousingEventChange` — the loader handles these internally; keep `createHousingTransform` and `HousingRecordInsert` since Phase 1 still uses the latter):

```typescript
import {
  createHousingTransform,
  HousingRecordInsert
} from '~/scripts/import-lovac/source-housings/source-housing-transform';
```

(b) Add the loader import:

```typescript
import { createHousingLoader } from '~/scripts/import-lovac/source-housings/source-housing-loader';
```

(c) Drop these now-unused imports (they were only used by Phase 2's tee'd sinks):
- `chunkify`, `filter` from `@zerologementvacant/utils/node` (Phase 1 still uses `filter` for the Phase 1 update path — re-check after typecheck and only drop what's truly unused)
- `Addresses`, `formatAddressApi` from `~/repositories/banAddressesRepository`
- `WritableStream` from `node:stream/web` (Phase 3 still uses it inline — keep until Task 8)

The typecheck step (3.6) will surface any leftover orphan imports.

(d) Replace the Phase 2 main import block (lines 189-311 in the current file):

```typescript
      logger.info('Starting import...', { file });
      await createSourceHousingRepository({
        ...config.s3,
        file: file,
        from: options.from
      })
        .stream({ departments })
        .pipeThrough(
          progress({
            initial: 0,
            total: total,
            name: '(2/3) Importing from LOVAC'
          })
        )
        .pipeThrough(
          validator(sourceHousingSchema, {
            abortEarly: options.abortEarly,
            reporter: sourceHousingReporter
          })
        )
        .pipeThrough(createSourceHousingEnricher())
        .pipeThrough(
          map(
            createHousingTransform({
              abortEarly: options.abortEarly,
              adminUserId: auth.id,
              reporter: sourceHousingReporter,
              year: options.year
            })
          )
        )
        .pipeThrough(flatten())
        .pipeTo(
          createHousingLoader({
            dryRun: options.dryRun,
            reporter: sourceHousingReporter
          })
        );
      logger.info(`File ${file} imported.`);
```

(e) Remove the now-unused exported helpers `insertHousings`, `updateHousings`, and `stripReadOnlyFields` from `source-housing-command.ts` — they live in `source-housing-loader.ts` now. The `findOneHousing` helper stays (Phase 1 uses it).

(f) Update `test/source-housing-command.test.ts` to import `updateHousings` from the loader instead of the command:

```typescript
// Replace:
import {
  createSourceHousingCommand,
  updateHousings
} from '~/scripts/import-lovac/source-housings/source-housing-command';

// With:
import { createSourceHousingCommand } from '~/scripts/import-lovac/source-housings/source-housing-command';
import { updateHousings } from '~/scripts/import-lovac/source-housings/source-housing-loader';
```

- [ ] **Step 3.6: Run the existing source-housing-command test to verify Phase 2 behavior is preserved**

```bash
yarn nx test server -- source-housing-command
```

Expected: all tests PASS — Phase 2 behavior is unchanged, Phase 3 still runs as before.

- [ ] **Step 3.7: Commit**

```bash
git add server/src/scripts/import-lovac/source-housings/source-housing-loader.ts \
        server/src/scripts/import-lovac/source-housings/test/source-housing-loader.test.ts \
        server/src/scripts/import-lovac/source-housings/source-housing-command.ts \
        server/src/scripts/import-lovac/source-housings/test/source-housing-command.test.ts
git commit -m "feat(server): extract source-housing load sinks into createHousingLoader"
```

---

## Task 4: Build `housings/housing-transform.ts`

**Files:**
- Create: `server/src/scripts/import-lovac/housings/housing-transform.ts`
- Create: `server/src/scripts/import-lovac/housings/test/housing-transform.test.ts`

Pure synchronous port of `housing-processor.ts` logic, parameterized by `year` (currently hardcoded to `'lovac-2025'`). Same change types, same `isInProgress`/`isCompleted` predicates.

- [ ] **Step 4.1: Write the failing transform test**

```typescript
// server/src/scripts/import-lovac/housings/test/housing-transform.test.ts
import {
  HOUSING_STATUS_LABELS,
  HOUSING_STATUS_VALUES,
  HousingStatus,
  Occupancy,
  OCCUPANCY_LABELS
} from '@zerologementvacant/models';
import { HousingApi } from '~/models/HousingApi';
import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';
import {
  createExistingHousingTransform,
  ExistingHousingChange,
  HousingUpdateChange,
  HousingEventChange,
  isCompleted,
  isInProgress
} from '~/scripts/import-lovac/housings/housing-transform';
import { genEstablishmentApi, genHousingApi, genUserApi } from '~/test/testFixtures';

describe('createExistingHousingTransform', () => {
  const establishment = genEstablishmentApi();
  const auth = genUserApi(establishment.id);
  const transform = createExistingHousingTransform({
    auth,
    year: 'lovac-2025',
    reporter: createNoopReporter()
  });

  let housing: HousingApi;
  beforeEach(() => {
    housing = genHousingApi();
  });

  describe('If the housing is present in LOVAC 2025', () => {
    beforeEach(() => {
      housing.dataFileYears = ['lovac-2023', 'lovac-2024', 'lovac-2025'];
    });

    it('should skip it', () => {
      expect(transform(housing)).toHaveLength(0);
    });
  });

  describe('Otherwise the housing is missing from LOVAC 2025', () => {
    beforeEach(() => {
      housing.dataFileYears = ['lovac-2023'];
    });

    describe('if it is vacant', () => {
      beforeEach(() => {
        housing.occupancy = Occupancy.VACANT;
        housing.status = HousingStatus.NEVER_CONTACTED;
        housing.subStatus = null;
      });

      describe('if it is currently monitored', () => {
        beforeEach(() => {
          housing.status = HousingStatus.IN_PROGRESS;
        });

        it.each(['En accompagnement', 'Intervention publique'])(
          'should remain untouched (subStatus=%s)',
          (subStatus) => {
            expect(transform({ ...housing, subStatus })).toHaveLength(0);
          }
        );
      });

      describe('if it was set as completed', () => {
        beforeEach(() => {
          housing.status = HousingStatus.COMPLETED;
        });

        it('should remain untouched', () => {
          expect(transform(housing)).toHaveLength(0);
        });
      });

      const statuses = HOUSING_STATUS_VALUES.filter(
        (status) => status !== HousingStatus.COMPLETED
      ).filter((status) => status !== HousingStatus.IN_PROGRESS);

      it.each(statuses)('should be set as out of vacancy otherwise', (status) => {
        const actual = transform({ ...housing, status });
        expect(actual).toPartiallyContain<HousingUpdateChange>({
          type: 'housing',
          kind: 'update',
          value: expect.objectContaining<Partial<HousingUpdateChange['value']>>({
            occupancy: Occupancy.UNKNOWN,
            status: HousingStatus.COMPLETED,
            subStatus: 'Sortie de la vacance'
          })
        });
      });

      it('should create a "Changement de statut d’occupation" event', () => {
        const actual = transform(housing);
        expect(actual).toPartiallyContain<HousingEventChange>({
          type: 'event',
          kind: 'create',
          value: expect.objectContaining<Partial<HousingEventChange['value']>>({
            type: 'housing:occupancy-updated',
            nextOld: { occupancy: OCCUPANCY_LABELS[housing.occupancy] },
            nextNew: { occupancy: OCCUPANCY_LABELS[Occupancy.UNKNOWN] },
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
        });
      });

      it('should create a "Changement de statut de suivi" event', () => {
        const actual = transform(housing);
        expect(actual).toPartiallyContain<HousingEventChange>({
          type: 'event',
          kind: 'create',
          value: expect.objectContaining<Partial<HousingEventChange['value']>>({
            type: 'housing:status-updated',
            nextOld: {
              status: HOUSING_STATUS_LABELS[housing.status],
              subStatus: null
            },
            nextNew: {
              status: HOUSING_STATUS_LABELS[HousingStatus.COMPLETED],
              subStatus: 'Sortie de la vacance'
            },
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
        });
      });
    });
  });

  describe('isInProgress', () => {
    it('should return true for status=IN_PROGRESS + matching subStatus', () => {
      const housing = {
        ...genHousingApi(),
        status: HousingStatus.IN_PROGRESS,
        subStatus: 'En accompagnement'
      };
      expect(isInProgress(housing)).toBeTrue();
    });

    it('should return false otherwise', () => {
      expect(
        isInProgress({ ...genHousingApi(), status: HousingStatus.WAITING })
      ).toBeFalse();
    });
  });

  describe('isCompleted', () => {
    it('should return true for status=COMPLETED', () => {
      expect(
        isCompleted({ ...genHousingApi(), status: HousingStatus.COMPLETED })
      ).toBeTrue();
    });

    it('should return false otherwise', () => {
      expect(
        isCompleted({ ...genHousingApi(), status: HousingStatus.WAITING })
      ).toBeFalse();
    });
  });
});
```

- [ ] **Step 4.2: Run test to verify it fails**

```bash
yarn nx test server -- housing-transform
```

Expected: `Cannot find module '~/scripts/import-lovac/housings/housing-transform'`.

- [ ] **Step 4.3: Implement the transform**

```typescript
// server/src/scripts/import-lovac/housings/housing-transform.ts
import {
  HOUSING_STATUS_LABELS,
  HousingStatus,
  Occupancy,
  OCCUPANCY_LABELS
} from '@zerologementvacant/models';
import { v4 as uuidv4 } from 'uuid';

import { createLogger } from '~/infra/logger';
import { HousingEventApi } from '~/models/EventApi';
import { HousingApi } from '~/models/HousingApi';
import { UserApi } from '~/models/UserApi';
import { ReporterError, ReporterOptions } from '~/scripts/import-lovac/infra';

const logger = createLogger('existingHousingTransform');

interface Change<Value, Type extends string> {
  type: Type;
  kind: 'create' | 'update';
  value: Value;
}

export type HousingUpdateChange = Change<HousingApi, 'housing'> & {
  kind: 'update';
};
export type HousingEventChange = Change<HousingEventApi, 'event'> & {
  kind: 'create';
};
export type ExistingHousingChange = HousingUpdateChange | HousingEventChange;

export interface ExistingHousingTransformOptions
  extends ReporterOptions<HousingApi> {
  auth: UserApi;
  year: string;
}

export function createExistingHousingTransform(
  opts: ExistingHousingTransformOptions
) {
  const { abortEarly, auth, reporter, year } = opts;

  return function transform(housing: HousingApi): ExistingHousingChange[] {
    try {
      logger.debug('Processing existing housing...', { housing });

      if (housing.dataFileYears.includes(year)) {
        reporter.skipped(housing);
        return [];
      }

      if (housing.occupancy !== Occupancy.VACANT) {
        reporter.skipped(housing);
        return [];
      }

      if (isInProgress(housing) || isCompleted(housing)) {
        reporter.skipped(housing);
        return [];
      }

      const changes: ExistingHousingChange[] = [
        {
          type: 'housing',
          kind: 'update',
          value: {
            ...housing,
            occupancy: Occupancy.UNKNOWN,
            status: HousingStatus.COMPLETED,
            subStatus: 'Sortie de la vacance'
          }
        },
        {
          type: 'event',
          kind: 'create',
          value: {
            id: uuidv4(),
            type: 'housing:occupancy-updated',
            nextOld: { occupancy: OCCUPANCY_LABELS[housing.occupancy] },
            nextNew: { occupancy: OCCUPANCY_LABELS[Occupancy.UNKNOWN] },
            createdAt: new Date().toJSON(),
            createdBy: auth.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          }
        },
        {
          type: 'event',
          kind: 'create',
          value: {
            id: uuidv4(),
            type: 'housing:status-updated',
            nextOld: {
              status: HOUSING_STATUS_LABELS[housing.status],
              subStatus: housing.subStatus
            },
            nextNew: {
              status: HOUSING_STATUS_LABELS[HousingStatus.COMPLETED],
              subStatus: 'Sortie de la vacance'
            },
            createdAt: new Date().toJSON(),
            createdBy: auth.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          }
        }
      ];
      reporter.passed(housing);
      return changes;
    } catch (error) {
      reporter.failed(
        housing,
        new ReporterError((error as Error).message, housing)
      );
      if (abortEarly) throw error;
      return [];
    }
  };
}

export function isInProgress(housing: HousingApi): boolean {
  return (
    housing.status === HousingStatus.IN_PROGRESS &&
    !!housing.subStatus &&
    ['En accompagnement', 'Intervention publique'].includes(housing.subStatus)
  );
}

export function isCompleted(housing: HousingApi): boolean {
  return housing.status === HousingStatus.COMPLETED;
}
```

- [ ] **Step 4.4: Run transform test to verify it passes**

```bash
yarn nx test server -- housing-transform
```

Expected: all tests PASS.

- [ ] **Step 4.5: Commit**

```bash
git add server/src/scripts/import-lovac/housings/housing-transform.ts \
        server/src/scripts/import-lovac/housings/test/housing-transform.test.ts
git commit -m "feat(server): add existing-housing transform (port of housing-processor)"
```

---

## Task 5: Build `housings/housing-loader.ts`

**Files:**
- Create: `server/src/scripts/import-lovac/housings/housing-loader.ts`
- Create: `server/src/scripts/import-lovac/housings/test/housing-loader.test.ts`

Demultiplexer for `ExistingHousingChange`. Updates pass through `formatHousingRecordApi` then through `createUpdater` (staged via temporary table). Events buffer in chunks of 1_000.

- [ ] **Step 5.1: Write the failing loader test**

```typescript
// server/src/scripts/import-lovac/housings/test/housing-loader.test.ts
import {
  HousingStatus,
  Occupancy
} from '@zerologementvacant/models';
import { v4 as uuidv4 } from 'uuid';
import { ReadableStream } from 'node:stream/web';

import { HousingApi } from '~/models/HousingApi';
import { Events } from '~/repositories/eventRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';
import { createExistingHousingLoader } from '../housing-loader';
import {
  ExistingHousingChange,
  HousingEventChange,
  HousingUpdateChange
} from '../housing-transform';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { Users, toUserDBO } from '~/repositories/userRepository';
import {
  genEstablishmentApi,
  genHousingApi,
  genUserApi
} from '~/test/testFixtures';

describe('createExistingHousingLoader', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));
  });

  it('updates housings on update changes', async () => {
    const reporter = createNoopReporter();
    const housing = genHousingApi();
    await Housing().insert(formatHousingRecordApi(housing));
    const updated: HousingApi = {
      ...housing,
      occupancy: Occupancy.UNKNOWN,
      status: HousingStatus.COMPLETED,
      subStatus: 'Sortie de la vacance'
    };
    const change: HousingUpdateChange = {
      type: 'housing',
      kind: 'update',
      value: updated
    };

    await ReadableStream.from<ExistingHousingChange>([change]).pipeTo(
      createExistingHousingLoader({ dryRun: false, reporter })
    );

    const actual = await Housing()
      .where({ id: housing.id, geo_code: housing.geoCode })
      .first();
    expect(actual?.occupancy).toBe(Occupancy.UNKNOWN);
    expect(actual?.status).toBe(HousingStatus.COMPLETED);
    expect(actual?.sub_status).toBe('Sortie de la vacance');
  });

  it('inserts events on event changes', async () => {
    const reporter = createNoopReporter();
    const housing = genHousingApi();
    await Housing().insert(formatHousingRecordApi(housing));
    const eventId = uuidv4();
    const change: HousingEventChange = {
      type: 'event',
      kind: 'create',
      value: {
        id: eventId,
        type: 'housing:occupancy-updated',
        nextOld: { occupancy: 'Vacant' },
        nextNew: { occupancy: 'Inconnu' },
        createdAt: new Date().toJSON(),
        createdBy: user.id,
        housingId: housing.id,
        housingGeoCode: housing.geoCode
      }
    };

    await ReadableStream.from<ExistingHousingChange>([change]).pipeTo(
      createExistingHousingLoader({ dryRun: false, reporter })
    );

    const actual = await Events().where({ id: eventId }).first();
    expect(actual).toBeDefined();
  });

  it('skips writes when dryRun is true', async () => {
    const reporter = createNoopReporter();
    const housing = genHousingApi();
    await Housing().insert(formatHousingRecordApi(housing));
    const updated: HousingApi = { ...housing, occupancy: Occupancy.UNKNOWN };
    const change: HousingUpdateChange = {
      type: 'housing',
      kind: 'update',
      value: updated
    };

    await ReadableStream.from<ExistingHousingChange>([change]).pipeTo(
      createExistingHousingLoader({ dryRun: true, reporter })
    );

    const actual = await Housing()
      .where({ id: housing.id, geo_code: housing.geoCode })
      .first();
    expect(actual?.occupancy).toBe(housing.occupancy); // unchanged
  });
});
```

- [ ] **Step 5.2: Run test to verify it fails**

```bash
yarn nx test server -- housing-loader
```

Expected: `Cannot find module '../housing-loader'`.

- [ ] **Step 5.3: Implement the loader**

```typescript
// server/src/scripts/import-lovac/housings/housing-loader.ts
import { Knex } from 'knex';
import fp from 'lodash/fp';
import path from 'node:path';
import { match } from 'ts-pattern';
import { WritableStream } from 'node:stream/web';

import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import { HousingApi } from '~/models/HousingApi';
import { HousingEventApi } from '~/models/EventApi';
import eventRepository from '~/repositories/eventRepository';
import {
  formatHousingRecordApi,
  Housing,
  HousingRecordDBO,
  housingTable
} from '~/repositories/housingRepository';
import { Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';
import { createUpdater } from '~/scripts/import-lovac/infra/updater';
import { ExistingHousingChange } from './housing-transform';

const logger = createLogger('createExistingHousingLoader');

const EVENT_CHUNK_SIZE = 1_000;
const TEMPORARY_TABLE = 'existing_housing_updates_tmp';

export interface ExistingHousingLoaderOptions {
  dryRun?: boolean;
  reporter: Reporter<HousingApi>;
}

export function createExistingHousingLoader(
  options: ExistingHousingLoaderOptions
): WritableStream<ExistingHousingChange> {
  const eventBuffer: HousingEventApi[] = [];

  const updateWriter = options.dryRun
    ? createUpdater<HousingRecordDBO>({
        destination: 'file',
        file: path.join(import.meta.dirname, 'existing-housing-updates.jsonl')
      })
    : createUpdater<HousingRecordDBO>({
        destination: 'database',
        temporaryTable: TEMPORARY_TABLE,
        likeTable: housingTable,
        async update(housings): Promise<void> {
          await updateHousings(housings, { temporaryTable: TEMPORARY_TABLE });
        }
      });
  const updateWriterStream = updateWriter.getWriter();

  async function flushEvents(): Promise<void> {
    if (eventBuffer.length === 0) return;
    const batch = eventBuffer.splice(0);
    if (options.dryRun) return;
    logger.debug(`Inserting ${batch.length} housing events...`);
    await eventRepository.insertManyHousingEvents(batch);
  }

  return new WritableStream<ExistingHousingChange>({
    async write(change) {
      await match(change)
        .with({ type: 'housing', kind: 'update' }, async (c) => {
          await updateWriterStream.write(formatHousingRecordApi(c.value));
        })
        .with({ type: 'event', kind: 'create' }, async (c) => {
          eventBuffer.push(c.value);
          if (eventBuffer.length >= EVENT_CHUNK_SIZE) await flushEvents();
        })
        .exhaustive();
    },
    async close() {
      await Promise.all([flushEvents(), updateWriterStream.close()]);
    }
  });
}

interface UpdateHousingsOptions {
  temporaryTable: string;
  keys?: ReadonlyArray<keyof HousingRecordDBO>;
}

async function updateHousings(
  housings: ReadonlyArray<HousingRecordDBO>,
  opts: UpdateHousingsOptions
): Promise<void> {
  const { temporaryTable } = opts;
  const keys: ReadonlyArray<keyof HousingRecordDBO> = opts.keys?.length
    ? opts.keys
    : [
        'invariant',
        'building_id',
        'building_group_id',
        'plot_id',
        'address_dgfip',
        'longitude_dgfip',
        'latitude_dgfip',
        'geolocation',
        'cadastral_classification',
        'uncomfortable',
        'vacancy_start_year',
        'housing_kind',
        'rooms_count',
        'living_area',
        'cadastral_reference',
        'building_year',
        'mutation_date',
        'last_mutation_date',
        'last_transaction_date',
        'last_transaction_value',
        'taxed',
        'data_years',
        'data_file_years',
        'data_source',
        'beneficiary_count',
        'building_location',
        'rental_value',
        'condominium',
        'status',
        'sub_status',
        'occupancy',
        'occupancy_source',
        'occupancy_intended',
        'energy_consumption_bdnb',
        'energy_consumption_at_bdnb'
      ];
  const updates: Record<string, Knex.Ref<string, any>> = fp.fromPairs(
    keys.map((key) => [key, db.ref(`${temporaryTable}.${key}`)])
  );

  await Housing()
    .update(updates)
    .updateFrom(temporaryTable)
    .where(`${housingTable}.geo_code`, db.ref(`${temporaryTable}.geo_code`))
    .where(`${housingTable}.id`, db.ref(`${temporaryTable}.id`))
    .whereIn(
      [`${temporaryTable}.geo_code`, `${temporaryTable}.id`],
      housings.map((housing) => [housing.geo_code, housing.id])
    );
}
```

- [ ] **Step 5.4: Run loader test to verify it passes**

```bash
yarn nx test server -- housing-loader
```

Expected: all tests PASS.

- [ ] **Step 5.5: Commit**

```bash
git add server/src/scripts/import-lovac/housings/housing-loader.ts \
        server/src/scripts/import-lovac/housings/test/housing-loader.test.ts
git commit -m "feat(server): add existing-housing loader"
```

---

## Task 6: Build `housings/housing-command.ts`

**Files:**
- Create: `server/src/scripts/import-lovac/housings/housing-command.ts`
- Create: `server/src/scripts/import-lovac/housings/test/housing-command.test.ts`

Wires `housingRepository.stream → progress → transform → loader` and handles trigger toggling + writeReport. The integration test moves the Phase-3-style assertions from `source-housing-command.test.ts` to here.

- [ ] **Step 6.1: Write the failing command test**

```typescript
// server/src/scripts/import-lovac/housings/test/housing-command.test.ts
import { faker } from '@faker-js/faker/locale/fr';
import {
  HousingStatus,
  Occupancy
} from '@zerologementvacant/models';

import config from '~/infra/config';
import { HousingApi } from '~/models/HousingApi';
import { UserApi } from '~/models/UserApi';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  EVENTS_TABLE,
  Events,
  formatEventApi,
  HOUSING_EVENTS_TABLE,
  HousingEvents,
  formatHousingEventApi
} from '~/repositories/eventRepository';
import {
  formatHousingRecordApi,
  Housing,
  HousingRecordDBO
} from '~/repositories/housingRepository';
import { toUserDBO, Users } from '~/repositories/userRepository';
import { createExistingHousingCommand } from '~/scripts/import-lovac/housings/housing-command';
import {
  genEstablishmentApi,
  genHousingApi,
  genUserApi
} from '~/test/testFixtures';

describe('Existing housing command', () => {
  const command = createExistingHousingCommand();

  // Vacant housings missing from current LOVAC, with no supervision: should be reset
  const vacantUnsupervisedHousings: ReadonlyArray<HousingApi> =
    faker.helpers.multiple(
      () => ({
        ...genHousingApi(),
        dataFileYears: ['lovac-2024'],
        occupancy: Occupancy.VACANT,
        status: faker.helpers.arrayElement([
          HousingStatus.NEVER_CONTACTED,
          HousingStatus.WAITING,
          HousingStatus.FIRST_CONTACT,
          HousingStatus.BLOCKED
        ]),
        subStatus: null
      }),
      { count: { min: 5, max: 20 } }
    );

  // Vacant housings under supervision: should be left alone
  const vacantSupervisedHousings: ReadonlyArray<HousingApi> =
    faker.helpers.multiple(
      () => {
        const status = faker.helpers.arrayElement([
          HousingStatus.COMPLETED,
          HousingStatus.IN_PROGRESS
        ]);
        const subStatus =
          status === HousingStatus.IN_PROGRESS
            ? faker.helpers.arrayElement([
                'En accompagnement',
                'Intervention publique'
              ])
            : null;
        return {
          ...genHousingApi(),
          dataFileYears: ['lovac-2024'],
          occupancy: Occupancy.VACANT,
          occupancyRegistered: Occupancy.VACANT,
          status,
          subStatus
        };
      },
      { count: { min: 5, max: 20 } }
    );

  // Housings still present in LOVAC 2025: should be skipped
  const presentHousings: ReadonlyArray<HousingApi> = faker.helpers.multiple(
    () => ({
      ...genHousingApi(),
      dataFileYears: ['lovac-2024', 'lovac-2025'],
      occupancy: Occupancy.VACANT,
      status: HousingStatus.NEVER_CONTACTED,
      subStatus: null
    }),
    { count: { min: 5, max: 20 } }
  );

  beforeAll(async () => {
    const establishment = genEstablishmentApi();
    await Establishments().insert(formatEstablishmentApi(establishment));
    const auth: UserApi = {
      ...genUserApi(establishment.id),
      email: config.app.system
    };
    await Users().insert(toUserDBO(auth));
    await Housing().insert(
      [
        ...vacantUnsupervisedHousings,
        ...vacantSupervisedHousings,
        ...presentHousings
      ].map(formatHousingRecordApi)
    );

    await command({
      abortEarly: true,
      dryRun: false,
      year: 'lovac-2025'
    });
  });

  function refresh(
    housings: ReadonlyArray<Pick<HousingApi, 'id' | 'geoCode'>>
  ): Promise<ReadonlyArray<HousingRecordDBO>> {
    return Housing().whereIn(
      ['geo_code', 'id'],
      housings.map((housing) => [housing.geoCode, housing.id])
    );
  }

  it('sets vacant unsupervised housings as out of vacancy', async () => {
    const actual = await refresh(vacantUnsupervisedHousings);
    expect(actual).toHaveLength(vacantUnsupervisedHousings.length);
    actual.forEach((housing) => {
      expect(housing).toMatchObject<Partial<HousingRecordDBO>>({
        occupancy: Occupancy.UNKNOWN,
        status: HousingStatus.COMPLETED,
        sub_status: 'Sortie de la vacance'
      });
    });
  });

  it('leaves vacant supervised housings untouched', async () => {
    const actual = await refresh(vacantSupervisedHousings);
    expect(actual).toHaveLength(vacantSupervisedHousings.length);
    actual.forEach((actualHousing) => {
      const before = vacantSupervisedHousings.find(
        (h) => h.id === actualHousing.id
      );
      expect(actualHousing).toMatchObject<Partial<HousingRecordDBO>>({
        occupancy: before?.occupancy,
        status: before?.status,
        sub_status: before?.subStatus
      });
    });
  });

  it('leaves housings still present in LOVAC 2025 untouched', async () => {
    const actual = await refresh(presentHousings);
    expect(actual).toHaveLength(presentHousings.length);
    actual.forEach((actualHousing) => {
      expect(actualHousing.occupancy).toBe(Occupancy.VACANT);
    });
  });

  it('emits events for reset housings', async () => {
    const actual = await refresh(vacantUnsupervisedHousings);
    const events = await Events()
      .join(
        HOUSING_EVENTS_TABLE,
        `${HOUSING_EVENTS_TABLE}.event_id`,
        `${EVENTS_TABLE}.id`
      )
      .whereIn(
        [
          `${HOUSING_EVENTS_TABLE}.housing_geo_code`,
          `${HOUSING_EVENTS_TABLE}.housing_id`
        ],
        actual.map((h) => [h.geo_code, h.id])
      );
    expect(events.length).toBeGreaterThanOrEqual(actual.length * 2);
  });
});
```

- [ ] **Step 6.2: Run test to verify it fails**

```bash
yarn nx test server -- housings/test/housing-command
```

Expected: `Cannot find module '~/scripts/import-lovac/housings/housing-command'`.

- [ ] **Step 6.3: Implement the command**

```typescript
// server/src/scripts/import-lovac/housings/housing-command.ts
import { count, createS3, flatten, map } from '@zerologementvacant/utils/node';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { writeFileSync } from 'node:fs';
import { match } from 'ts-pattern';

import UserMissingError from '~/errors/userMissingError';
import config from '~/infra/config';
import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import { HousingApi } from '~/models/HousingApi';
import housingRepository from '~/repositories/housingRepository';
import userRepository from '~/repositories/userRepository';
import { createLoggerReporter } from '~/scripts/import-lovac/infra';
import { FromOptionValue } from '~/scripts/import-lovac/infra/options/from';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import { Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';
import { createExistingHousingLoader } from './housing-loader';
import { createExistingHousingTransform } from './housing-transform';

const logger = createLogger('existingHousingCommand');

export interface ExecOptions {
  abortEarly?: boolean;
  departments?: string[];
  dryRun?: boolean;
  from?: FromOptionValue;
  year: string;
}

export function createExistingHousingCommand() {
  const reporter = createLoggerReporter<HousingApi>();

  return async (options: ExecOptions): Promise<void> => {
    try {
      console.time('Verify existing housings');
      logger.debug('Starting existing housing command...', { options });

      const auth = await userRepository.getByEmail(config.app.system);
      if (!auth) {
        throw new UserMissingError(config.app.system);
      }

      logger.info('Disabling building triggers...');
      await db.raw(`
        ALTER TABLE fast_housing DISABLE TRIGGER housing_insert_building_trigger;
        ALTER TABLE fast_housing DISABLE TRIGGER housing_update_building_trigger;
        ALTER TABLE fast_housing DISABLE TRIGGER housing_delete_building_trigger;
      `);

      const total = await count(
        housingRepository.stream({ filters: {} })
      );

      logger.info('Starting verification...', { total });
      await housingRepository
        .stream({ filters: {} })
        .pipeThrough(
          progress({
            initial: 0,
            total,
            name: 'Verifying existing housings'
          })
        )
        .pipeThrough(
          map(
            createExistingHousingTransform({
              auth,
              year: options.year,
              reporter,
              abortEarly: options.abortEarly
            })
          )
        )
        .pipeThrough(flatten())
        .pipeTo(
          createExistingHousingLoader({ dryRun: options.dryRun, reporter })
        );
      logger.info('Verification done.');

      logger.info('Updating building counts...');
      await db.raw(`
        WITH building_counts AS (
          SELECT
            building_id,
            COUNT(*) FILTER (WHERE occupancy = 'L') as rent_count,
            COUNT(*) FILTER (WHERE occupancy = 'V') as vacant_count
          FROM fast_housing
          WHERE building_id IS NOT NULL
          GROUP BY building_id
        )
        UPDATE buildings b
        SET
          rent_housing_count = COALESCE(bc.rent_count, 0),
          vacant_housing_count = COALESCE(bc.vacant_count, 0)
          FROM building_counts bc
        WHERE b.id = bc.building_id
      `);
    } finally {
      logger.info('Enabling building triggers...');
      await db.raw(`
        ALTER TABLE fast_housing ENABLE TRIGGER housing_insert_building_trigger;
        ALTER TABLE fast_housing ENABLE TRIGGER housing_update_building_trigger;
        ALTER TABLE fast_housing ENABLE TRIGGER housing_delete_building_trigger;
      `);

      reporter.report();
      await writeReport(options, reporter);
      console.timeEnd('Verify existing housings');
    }
  };
}

async function writeReport(
  options: ExecOptions,
  reporter: Reporter<HousingApi>
): Promise<void> {
  const json = JSON.stringify(reporter.getSummary(), null, 2);
  try {
    await match(options.from ?? 'file')
      .with('s3', async () => {
        const s3 = createS3(config.s3);
        await s3.send(
          new PutObjectCommand({
            Bucket: config.s3.bucket,
            Key: `existing-housings/${options.year}.report.json`,
            Body: json,
            ContentType: 'application/json'
          })
        );
      })
      .with('file', async () => {
        writeFileSync(
          `./import-lovac-${options.year}-existing-housings.report.json`,
          json,
          'utf8'
        );
      })
      .exhaustive();
  } catch (error) {
    logger.warn('Failed to write report', { error });
  }
}
```

- [ ] **Step 6.4: Run command test to verify it passes**

```bash
yarn nx test server -- housings/test/housing-command
```

Expected: all tests PASS.

- [ ] **Step 6.5: Commit**

```bash
git add server/src/scripts/import-lovac/housings/housing-command.ts \
        server/src/scripts/import-lovac/housings/test/housing-command.test.ts
git commit -m "feat(server): add existing-housings standalone command"
```

---

## Task 7: Register `existing-housings` CLI subcommand

**Files:**
- Modify: `server/src/scripts/import-lovac/cli.ts`

- [ ] **Step 7.1: Add the import and the subcommand registration**

In `server/src/scripts/import-lovac/cli.ts`:

(a) Add the import near the other `createX` imports:

```typescript
import { createExistingHousingCommand } from '~/scripts/import-lovac/housings/housing-command';
```

(b) Add the subcommand block after the existing `housing-owners` block (around line 107):

```typescript
program
  .command('existing-housings')
  .description(
    'Verify existing housings against the imported LOVAC year. Resets occupancy/status for housings missing from the file. Run after `housings`.'
  )
  .addOption(abortEarly)
  .addOption(departments)
  .addOption(dryRun)
  .addOption(year)
  .action(async (options) => {
    const command = createExistingHousingCommand();
    await command(options).then(() => {
      process.exit();
    });
  });
```

Note: this subcommand takes no `<file>` argument and no `from` option (no input file).

- [ ] **Step 7.2: Verify the CLI compiles**

```bash
yarn nx typecheck server
```

Expected: PASS.

- [ ] **Step 7.3: Commit**

```bash
git add server/src/scripts/import-lovac/cli.ts
git commit -m "feat(server): register existing-housings CLI subcommand"
```

---

## Task 8: Remove Phase 3 from `source-housing-command.ts`; delete `housing-processor.ts`

**Files:**
- Modify: `server/src/scripts/import-lovac/source-housings/source-housing-command.ts`
- Modify: `server/src/scripts/import-lovac/source-housings/test/source-housing-command.test.ts`
- Delete: `server/src/scripts/import-lovac/housings/housing-processor.ts`
- Delete: `server/src/scripts/import-lovac/housings/test/housing-processor.test.ts`

- [ ] **Step 8.1: Remove Phase 3 block from `source-housing-command.ts`**

In `server/src/scripts/import-lovac/source-housings/source-housing-command.ts`, delete the entire Phase 3 block:
- From `logger.info('Checking for missing housings from the file...')` (around current line 314)
- Through the end of the second `await Promise.all([...])` block + the `logger.info('Check done.')` line (around current line 390)

**Keep the "Updating building counts" `db.raw` block** (around lines 392-409). It applies to Phase 2 inserts as well as Phase 3 updates; both commands need it. The new `existing-housings` command already runs the same SQL block (added in Task 6).

**Keep the trigger disable/enable** in `try`/`finally`. They protect Phase 2's bulk inserts.

Other deletions:
- The `housingReporter` variable declaration (`const housingReporter = createLoggerReporter<HousingApi>();`)
- The `housingReporter.report()` call in `finally`

Imports to remove (will be confirmed by typecheck):
- `chunkify` from `@zerologementvacant/utils/node` (Phase-3-only; Phase 2 used the loader's internal chunking)
- `WritableStream` from `node:stream/web` (Phase 3's inline writables are gone; Phase 2 uses the loader)
- `createHousingProcessor` and `HousingEventChange` from `~/scripts/import-lovac/housings/housing-processor`
- `eventRepository` (Phase 3 used `eventRepository.insertManyHousingEvents`)
- `HousingApi` (was used to type `housingReporter`; no longer needed)

Imports to keep:
- `parseHousingApi`, `HousingDBO` (Phase 1's `findOneHousing`)
- `Housing`, `housingTable`, `HousingRecordDBO` (Phase 1's `createUpdater` config + helpers)
- `formatHousingRecordApi` only if still referenced — drop if not

Update progress step labels (Phase 3 is gone, so renumber 1/3 → 1/2 and 2/3 → 2/2):

```typescript
// Phase 1 progress
.pipeThrough(
  progress({
    initial: 0,
    total: total,
    name: '(1/2) Updating housing geo codes'
  })
)

// Phase 2 progress
.pipeThrough(
  progress({
    initial: 0,
    total: total,
    name: '(2/2) Importing from LOVAC'
  })
)
```

- [ ] **Step 8.2: Remove Phase 3 assertions from `source-housing-command.test.ts`**

In `server/src/scripts/import-lovac/source-housings/test/source-housing-command.test.ts`, delete:

- The `vacantUnsupervisedHousings` and `vacantSupervisedHousings` declarations (lines 147-189)
- Their inclusion in `housingsBefore` (lines 198-200, the two trailing `...` spreads)
- The entire `describe('Missing from LOVAC, present in our database', ...)` block (lines 468-537)

These cases are now covered by `housings/test/housing-command.test.ts` (added in Task 6).

- [ ] **Step 8.3: Run all source-housings tests to confirm clean state**

```bash
yarn nx test server -- source-housings
```

Expected: all tests PASS. The remaining tests cover Phase 1 (geo code) and Phase 2 (source housings) only.

- [ ] **Step 8.4: Delete the old processor and its test**

```bash
git rm server/src/scripts/import-lovac/housings/housing-processor.ts \
       server/src/scripts/import-lovac/housings/test/housing-processor.test.ts
```

- [ ] **Step 8.5: Commit**

```bash
git add server/src/scripts/import-lovac/source-housings/source-housing-command.ts \
        server/src/scripts/import-lovac/source-housings/test/source-housing-command.test.ts
git commit -m "refactor(server): move existing-housings verification out of source-housing command"
```

---

## Task 9: Final verification

- [ ] **Step 9.1: Run the full server test suite**

```bash
yarn nx test server
```

Expected: all tests PASS, no regressions.

- [ ] **Step 9.2: Verify no orphan references remain**

```bash
yarn nx typecheck server
```

Expected: PASS — no compile errors from removed types.

Then check for orphan references:

```bash
grep -r "createHousingProcessor" server/src/
grep -r "housingReporter" server/src/scripts/import-lovac/source-housings/source-housing-command.ts
grep -rE "\.tee\(\)" server/src/scripts/import-lovac/source-housings/source-housing-command.ts \
                    server/src/scripts/import-lovac/source-housing-owners/source-housing-owner-command.ts \
                    server/src/scripts/import-lovac/source-owners/source-owner-command.ts \
                    server/src/scripts/import-lovac/housings/housing-command.ts
```

Expected: no output for each grep.

- [ ] **Step 9.3: Verify `existing-housings` is registered in the CLI**

```bash
grep -n "existing-housings" server/src/scripts/import-lovac/cli.ts
```

Expected: one match showing the `.command('existing-housings')` registration.

- [ ] **Step 9.4: Final commit if cleanups were needed**

If steps 9.1-9.3 surfaced issues, fix them, then:

```bash
git add -p
git commit -m "chore(server): final cleanup after EETL loaders refactor"
```

If no issues, no commit needed.
