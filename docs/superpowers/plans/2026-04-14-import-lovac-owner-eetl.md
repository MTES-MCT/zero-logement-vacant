# Import LOVAC — Owner EETL Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the owner import pipeline from a streaming N+1 processor to a four-step EETL pipeline (Extract → Enrich → Transform → Load), eliminating per-row DB queries and replacing the `tee()` fan-out with a type-safe `ts-pattern` dispatcher.

**Architecture:** Extract streams `SourceOwner` rows from file/S3. Enrich buffers into chunks and bulk-fetches existing owners in one SELECT per chunk (using `effect/Array` for type-safe lookup). Transform is a pure synchronous function `EnrichedOwner → OwnerChange` with no I/O. Load is a single self-contained `WritableStream` that buffers changes by kind, routing via `ts-pattern` exhaustive match and flushing in per-batch transactions.

**Tech Stack:** TypeScript, Web Streams API, Knex (`Owners()`), `effect` (`Array`, `Option`), `ts-pattern` (`match`), Vitest.

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `server/src/scripts/import-lovac/infra/enrich.ts` | **Create** | Generic `enrichWith<S, E>`: buffers S rows, bulk-fetches E records, emits `Enriched<S, E>` pairs |
| `server/src/scripts/import-lovac/infra/test/enrich.test.ts` | **Create** | Tests for `enrichWith` |
| `server/src/scripts/import-lovac/source-owners/source-owner-enricher.ts` | **Create** | Owner E-step: bulk SELECT by `idpersonne`, emits `EnrichedOwner` |
| `server/src/scripts/import-lovac/source-owners/test/source-owner-enricher.test.ts` | **Create** | Tests for the owner enricher |
| `server/src/scripts/import-lovac/source-owners/source-owner-transform.ts` | **Create** | Owner T-step: pure function `EnrichedOwner → OwnerChange`, no DB calls |
| `server/src/scripts/import-lovac/source-owners/test/source-owner-transform.test.ts` | **Create** | Tests for the pure transform |
| `server/src/scripts/import-lovac/source-owners/source-owner-processor.ts` | **Delete** | Replaced by enricher + transform |
| `server/src/scripts/import-lovac/source-owners/test/source-owner-processor.test.ts` | **Delete** | Replaced by enricher + transform tests |
| `server/src/scripts/import-lovac/source-owners/source-owner-command.ts` | **Modify** | Rewire to EETL; self-contained load sink with inline buffering and `ts-pattern` routing |
| `server/src/scripts/import-lovac/infra/progress-bar.ts` | **Modify** | Make `total` optional (indeterminate mode) |

---

## Task 1: Generic `enrichWith` utility

**Files:**
- Create: `server/src/scripts/import-lovac/infra/enrich.ts`
- Create: `server/src/scripts/import-lovac/infra/test/enrich.test.ts`

- [ ] **Step 1.1: Write the failing tests**

```typescript
// server/src/scripts/import-lovac/infra/test/enrich.test.ts
import { ReadableStream, WritableStream } from 'node:stream/web';
import { describe, expect, it, vi } from 'vitest';
import { enrichWith } from '~/scripts/import-lovac/infra/enrich';

describe('enrichWith', () => {
  it('should pair each source item with its matching enrichment', async () => {
    const sources = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const db = [
      { id: 'a', name: 'Alice' },
      { id: 'c', name: 'Carol' }
    ];
    const result: { source: { id: string }; existing: { id: string; name: string } | null }[] = [];

    await new ReadableStream({
      pull(controller) {
        for (const s of sources) controller.enqueue(s);
        controller.close();
      }
    })
      .pipeThrough(
        enrichWith({
          fetch: async (chunk) => db.filter((e) => chunk.some((s) => s.id === e.id)),
          match: (source, enrichment) => source.id === enrichment.id
        })
      )
      .pipeTo(new WritableStream({ write(item) { result.push(item); } }));

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ source: { id: 'a' }, existing: { id: 'a', name: 'Alice' } });
    expect(result[1]).toEqual({ source: { id: 'b' }, existing: null });
    expect(result[2]).toEqual({ source: { id: 'c' }, existing: { id: 'c', name: 'Carol' } });
  });

  it('should call fetch once per full chunk', async () => {
    const sources = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));
    const fetch = vi.fn().mockResolvedValue([]);

    await new ReadableStream({
      pull(controller) {
        for (const s of sources) controller.enqueue(s);
        controller.close();
      }
    })
      .pipeThrough(enrichWith({ chunkSize: 3, fetch, match: () => false }))
      .pipeTo(new WritableStream({ write() {} }));

    // 10 items / chunkSize 3 → ceil(10/3) = 4 calls
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('should flush remaining items on stream close', async () => {
    const fetch = vi.fn().mockResolvedValue([]);
    const result: unknown[] = [];

    await new ReadableStream({
      pull(controller) {
        controller.enqueue({ id: '1' }); // below default chunkSize
        controller.close();
      }
    })
      .pipeThrough(enrichWith({ fetch, match: () => false }))
      .pipeTo(new WritableStream({ write(item) { result.push(item); } }));

    expect(result).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 1.2: Run to verify they fail**

```bash
yarn nx test server -- enrich.test
```

Expected: 3 failures — `enrichWith` not found.

- [ ] **Step 1.3: Implement `enrichWith`**

Uses `effect/Array.findFirst` + `Option.getOrNull` for type-safe lookup.

```typescript
// server/src/scripts/import-lovac/infra/enrich.ts
import { Array as Arr, Option } from 'effect';
import { TransformStream } from 'node:stream/web';

export interface EnrichOptions<S, E> {
  chunkSize?: number;
  fetch(sources: ReadonlyArray<S>): Promise<ReadonlyArray<E>>;
  match(source: S, enrichment: E): boolean;
}

export type Enriched<S, E> = { source: S; existing: E | null };

export function enrichWith<S, E>(
  options: EnrichOptions<S, E>
): TransformStream<S, Enriched<S, E>> {
  const { chunkSize = 500, fetch, match } = options;
  const buffer: S[] = [];

  async function flushBuffer(
    controller: TransformStreamDefaultController<Enriched<S, E>>
  ): Promise<void> {
    if (buffer.length === 0) return;
    const enrichments = await fetch([...buffer]);
    for (const source of buffer) {
      const existing = Option.getOrNull(
        Arr.findFirst(enrichments, (e) => match(source, e))
      );
      controller.enqueue({ source, existing });
    }
    buffer.length = 0;
  }

  return new TransformStream<S, Enriched<S, E>>({
    async transform(source, controller) {
      buffer.push(source);
      if (buffer.length >= chunkSize) {
        await flushBuffer(controller);
      }
    },
    async flush(controller) {
      await flushBuffer(controller);
    }
  });
}
```

- [ ] **Step 1.4: Run to verify they pass**

```bash
yarn nx test server -- enrich.test
```

Expected: 3 passing.

- [ ] **Step 1.5: Commit**

```bash
git add server/src/scripts/import-lovac/infra/enrich.ts \
        server/src/scripts/import-lovac/infra/test/enrich.test.ts
git commit -m "feat(server): add generic enrichWith stream utility for EETL pipelines"
```

---

## Task 2: Owner enricher (E step)

**Files:**
- Create: `server/src/scripts/import-lovac/source-owners/source-owner-enricher.ts`
- Create: `server/src/scripts/import-lovac/source-owners/test/source-owner-enricher.test.ts`

- [ ] **Step 2.1: Write the failing tests**

```typescript
// server/src/scripts/import-lovac/source-owners/test/source-owner-enricher.test.ts
import { ReadableStream, WritableStream } from 'node:stream/web';
import { beforeEach, describe, expect, it } from 'vitest';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import { genSourceOwner } from '~/scripts/import-lovac/infra/fixtures';
import {
  createOwnerEnricher,
  EnrichedOwner
} from '~/scripts/import-lovac/source-owners/source-owner-enricher';
import { genOwnerApi } from '~/test/testFixtures';

describe('createOwnerEnricher', () => {
  beforeEach(async () => {
    await Owners().delete();
  });

  it('should annotate a known owner with its existing DB record', async () => {
    const source = genSourceOwner();
    await Owners().insert(formatOwnerApi(genOwnerApi({ idpersonne: source.idpersonne })));

    const result: EnrichedOwner[] = [];
    await new ReadableStream({
      pull(controller) {
        controller.enqueue(source);
        controller.close();
      }
    })
      .pipeThrough(createOwnerEnricher())
      .pipeTo(new WritableStream({ write(item) { result.push(item); } }));

    expect(result).toHaveLength(1);
    expect(result[0].source).toEqual(source);
    expect(result[0].existing?.idpersonne).toBe(source.idpersonne);
  });

  it('should annotate an unknown owner with null', async () => {
    const source = genSourceOwner();

    const result: EnrichedOwner[] = [];
    await new ReadableStream({
      pull(controller) {
        controller.enqueue(source);
        controller.close();
      }
    })
      .pipeThrough(createOwnerEnricher())
      .pipeTo(new WritableStream({ write(item) { result.push(item); } }));

    expect(result).toHaveLength(1);
    expect(result[0].existing).toBeNull();
  });

  it('should resolve multiple owners in a single bulk fetch', async () => {
    const sources = Array.from({ length: 5 }, () => genSourceOwner());
    await Owners().insert(
      sources
        .slice(0, 2)
        .map((s) => formatOwnerApi(genOwnerApi({ idpersonne: s.idpersonne })))
    );

    const result: EnrichedOwner[] = [];
    await new ReadableStream({
      pull(controller) {
        for (const s of sources) controller.enqueue(s);
        controller.close();
      }
    })
      .pipeThrough(createOwnerEnricher())
      .pipeTo(new WritableStream({ write(item) { result.push(item); } }));

    expect(result).toHaveLength(5);
    expect(result.filter((r) => r.existing !== null)).toHaveLength(2);
    expect(result.filter((r) => r.existing === null)).toHaveLength(3);
  });
});
```

- [ ] **Step 2.2: Run to verify they fail**

```bash
yarn nx test server -- source-owner-enricher.test
```

Expected: 3 failures — `createOwnerEnricher` not found.

- [ ] **Step 2.3: Implement the owner enricher**

```typescript
// server/src/scripts/import-lovac/source-owners/source-owner-enricher.ts
import { TransformStream } from 'node:stream/web';
import { Enriched, enrichWith } from '~/scripts/import-lovac/infra/enrich';
import { Owners, OwnerDBO } from '~/repositories/ownerRepository';
import { SourceOwner } from '~/scripts/import-lovac/source-owners/source-owner';

export type EnrichedOwner = Enriched<SourceOwner, OwnerDBO>;

export function createOwnerEnricher(): TransformStream<SourceOwner, EnrichedOwner> {
  return enrichWith<SourceOwner, OwnerDBO>({
    async fetch(sources) {
      const idpersonnes = sources.map((s) => s.idpersonne);
      return Owners().whereIn('idpersonne', idpersonnes);
    },
    match: (source, owner) => owner.idpersonne === source.idpersonne
  });
}
```

- [ ] **Step 2.4: Run to verify they pass**

```bash
yarn nx test server -- source-owner-enricher.test
```

Expected: 3 passing.

- [ ] **Step 2.5: Commit**

```bash
git add server/src/scripts/import-lovac/source-owners/source-owner-enricher.ts \
        server/src/scripts/import-lovac/source-owners/test/source-owner-enricher.test.ts
git commit -m "feat(server): add owner enricher with batch DB lookup (E step)"
```

---

## Task 3: Pure transform (T step)

Replace `source-owner-processor.ts` with `source-owner-transform.ts`. No DB calls. No async.

**Files:**
- Create: `server/src/scripts/import-lovac/source-owners/source-owner-transform.ts`
- Create: `server/src/scripts/import-lovac/source-owners/test/source-owner-transform.test.ts`
- Delete: `server/src/scripts/import-lovac/source-owners/source-owner-processor.ts`
- Delete: `server/src/scripts/import-lovac/source-owners/test/source-owner-processor.test.ts`

- [ ] **Step 3.1: Write the failing tests**

```typescript
// server/src/scripts/import-lovac/source-owners/test/source-owner-transform.test.ts
import { describe, expect, it } from 'vitest';
import { formatOwnerApi } from '~/repositories/ownerRepository';
import { genSourceOwner } from '~/scripts/import-lovac/infra/fixtures';
import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';
import {
  createOwnerTransform,
  OwnerChange
} from '~/scripts/import-lovac/source-owners/source-owner-transform';
import { genOwnerApi } from '~/test/testFixtures';

describe('createOwnerTransform', () => {
  const reporter = createNoopReporter<any>();

  it('should produce a create change when the owner does not exist', () => {
    const source = genSourceOwner();
    const transform = createOwnerTransform({ reporter, abortEarly: false });

    const change = transform({ source, existing: null });

    expect(change).toMatchObject<OwnerChange>({
      type: 'owner',
      kind: 'create',
      value: expect.objectContaining({
        idpersonne: source.idpersonne,
        fullName: source.full_name,
        dataSource: 'lovac-2026'
      })
    });
    expect(change.value.id).toBeDefined();
  });

  it('should produce an update change when the owner exists', () => {
    const source = genSourceOwner();
    const existing = formatOwnerApi(genOwnerApi({ idpersonne: source.idpersonne }));
    const transform = createOwnerTransform({ reporter, abortEarly: false });

    const change = transform({ source, existing });

    expect(change).toMatchObject<OwnerChange>({
      type: 'owner',
      kind: 'update',
      value: expect.objectContaining({
        id: existing.id,
        idpersonne: source.idpersonne,
        fullName: source.full_name
      })
    });
  });

  it('should preserve existing email and phone on update', () => {
    const source = genSourceOwner();
    const existing = formatOwnerApi(
      genOwnerApi({
        idpersonne: source.idpersonne,
        email: 'keep@example.com',
        phone: '0600000000'
      })
    );
    const transform = createOwnerTransform({ reporter, abortEarly: false });

    const change = transform({ source, existing });

    expect(change.value.email).toBe('keep@example.com');
    expect(change.value.phone).toBe('0600000000');
  });

  it('should prefer source siren over existing on update', () => {
    const source = genSourceOwner();
    source.siren = '123456789';
    const existing = formatOwnerApi(
      genOwnerApi({ idpersonne: source.idpersonne, siren: '999999999' })
    );
    const transform = createOwnerTransform({ reporter, abortEarly: false });

    const change = transform({ source, existing });

    expect(change.value.siren).toBe('123456789');
  });
});
```

- [ ] **Step 3.2: Run to verify they fail**

```bash
yarn nx test server -- source-owner-transform.test
```

Expected: 4 failures — `createOwnerTransform` not found.

- [ ] **Step 3.3: Implement the pure transform**

```typescript
// server/src/scripts/import-lovac/source-owners/source-owner-transform.ts
import { v4 as uuidv4 } from 'uuid';
import { OwnerApi } from '~/models/OwnerApi';
import { OwnerDBO } from '~/repositories/ownerRepository';
import {
  ReporterError,
  ReporterOptions
} from '~/scripts/import-lovac/infra/reporters';
import { EnrichedOwner } from '~/scripts/import-lovac/source-owners/source-owner-enricher';
import { SourceOwner } from '~/scripts/import-lovac/source-owners/source-owner';

interface Change<Value, Type extends string> {
  type: Type;
  kind: 'create' | 'update';
  value: Value;
}

export type OwnerChange = Change<OwnerApi, 'owner'>;

type TransformOptions = ReporterOptions<SourceOwner>;

/**
 * Returns a pure synchronous function mapping EnrichedOwner → OwnerChange.
 * No DB calls — all enrichment is pre-fetched by the enricher step.
 */
export function createOwnerTransform(options: TransformOptions) {
  const { abortEarly, reporter } = options;

  return function transform(enriched: EnrichedOwner): OwnerChange {
    const { source, existing } = enriched;
    try {
      const change: OwnerChange = existing
        ? toUpdate(source, existing)
        : toCreate(source);
      reporter.passed(source);
      return change;
    } catch (error) {
      reporter.failed(
        source,
        new ReporterError((error as Error).message, source)
      );
      if (abortEarly) throw error;
      throw error;
    }
  };
}

function toCreate(source: SourceOwner): OwnerChange {
  const now = new Date().toJSON();
  return {
    type: 'owner',
    kind: 'create',
    value: {
      id: uuidv4(),
      idpersonne: source.idpersonne,
      fullName: source.full_name,
      birthDate: source.birth_date?.toJSON() ?? null,
      administrator: null,
      siren: source.siren ?? null,
      rawAddress: source.dgfip_address ? [source.dgfip_address] : null,
      banAddress: null,
      additionalAddress: null,
      email: null,
      phone: null,
      dataSource: 'lovac-2026',
      kind: source.ownership_type,
      entity: source.entity,
      createdAt: now,
      updatedAt: now
    }
  };
}

function toUpdate(source: SourceOwner, existing: OwnerDBO): OwnerChange {
  return {
    type: 'owner',
    kind: 'update',
    value: {
      id: existing.id,
      idpersonne: source.idpersonne,
      fullName: source.full_name,
      birthDate: source.birth_date
        ? source.birth_date.toJSON().substring(0, 'yyyy-mm-dd'.length)
        : existing.birth_date
          ? new Date(existing.birth_date).toJSON()
          : null,
      administrator: existing.administrator ?? null,
      siren: source.siren ?? existing.siren ?? null,
      rawAddress: source.dgfip_address ? [source.dgfip_address] : null,
      banAddress: null,
      additionalAddress: existing.additional_address ?? null,
      email: existing.email ?? null,
      phone: existing.phone ?? null,
      dataSource: existing.data_source ?? undefined,
      kind: source.ownership_type,
      entity: source.entity,
      createdAt: existing.created_at
        ? new Date(existing.created_at).toJSON()
        : null,
      updatedAt: new Date().toJSON()
    }
  };
}
```

- [ ] **Step 3.4: Run to verify they pass**

```bash
yarn nx test server -- source-owner-transform.test
```

Expected: 4 passing.

- [ ] **Step 3.5: Delete the old processor files**

```bash
git rm server/src/scripts/import-lovac/source-owners/source-owner-processor.ts \
       server/src/scripts/import-lovac/source-owners/test/source-owner-processor.test.ts
```

- [ ] **Step 3.6: Commit**

```bash
git add server/src/scripts/import-lovac/source-owners/source-owner-transform.ts \
        server/src/scripts/import-lovac/source-owners/test/source-owner-transform.test.ts
git commit -m "feat(server): add pure owner transform, remove N+1 processor (T step)"
```

---

## Task 4: Rewire the command to EETL (L step)

Drop the `count()` pre-pass, temp-table management, and `tee()` fan-out. The load sink is a single self-contained `WritableStream` with internal per-kind buffers, routed via `ts-pattern` exhaustive match.

**Files:**
- Modify: `server/src/scripts/import-lovac/infra/progress-bar.ts`
- Modify: `server/src/scripts/import-lovac/source-owners/source-owner-command.ts`

- [ ] **Step 4.1: Make `total` optional in the progress bar**

Open `server/src/scripts/import-lovac/infra/progress-bar.ts`.

```typescript
// Replace:
interface ProgressOptions {
  initial: number;
  total: number;
  name?: string;
}

// With:
interface ProgressOptions {
  initial?: number;
  total?: number;
  name?: string;
}
```

```typescript
// Replace:
bar.start(opts.total, opts.initial);

// With:
bar.start(opts.total ?? 0, opts.initial ?? 0);
```

When `total` is `0`, `cli-progress` displays count and elapsed time without a percentage.

- [ ] **Step 4.2: Rewrite `source-owner-command.ts`**

The load sink buffers inserts and upserts separately, flushing at 1 000 items each. Each flush wraps the upsert in a transaction. `ts-pattern` exhaustive match ensures a compile error if a new change kind is added without handling it.

```typescript
// server/src/scripts/import-lovac/source-owners/source-owner-command.ts
import { map } from '@zerologementvacant/utils/node';
import { match } from 'ts-pattern';
import { WritableStream } from 'node:stream/web';
import db from '~/infra/database';
import config from '~/infra/config';
import { createLogger } from '~/infra/logger';
import { OwnerApi } from '~/models/OwnerApi';
import { createLoggerReporter } from '~/scripts/import-lovac/infra';
import { FromOptionValue } from '~/scripts/import-lovac/infra/options/from';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import validator from '~/scripts/import-lovac/infra/validator';
import {
  formatOwnerApi,
  Owners,
  ownerTable
} from '~/repositories/ownerRepository';
import {
  SourceOwner,
  sourceOwnerSchema
} from '~/scripts/import-lovac/source-owners/source-owner';
import { createOwnerEnricher } from '~/scripts/import-lovac/source-owners/source-owner-enricher';
import {
  createOwnerTransform,
  OwnerChange
} from '~/scripts/import-lovac/source-owners/source-owner-transform';
import { createSourceOwnerRepository } from '~/scripts/import-lovac/source-owners/source-owner-repository';

const logger = createLogger('sourceOwnerCommand');

export interface ExecOptions {
  abortEarly?: boolean;
  departments?: string[];
  dryRun?: boolean;
  from: FromOptionValue;
}

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

export function createSourceOwnerCommand() {
  const reporter = createLoggerReporter<SourceOwner>();

  return async (file: string, options: ExecOptions): Promise<void> => {
    try {
      console.time('Import owners');
      logger.info('Starting import...', { file });

      await createSourceOwnerRepository({ from: options.from, file, ...config.s3 })
        .stream({ departments: options.departments })
        .pipeThrough(progress({ name: 'Importing owners' }))
        .pipeThrough(
          validator(sourceOwnerSchema, { abortEarly: options.abortEarly, reporter })
        )
        .pipeThrough(createOwnerEnricher())
        .pipeThrough(map(createOwnerTransform({ reporter, abortEarly: options.abortEarly })))
        .pipeTo(createOwnerLoadSink(options));

      logger.info(`File ${file} imported.`);
    } finally {
      reporter.report();
      console.timeEnd('Import owners');
    }
  };
}

function createOwnerLoadSink(options: ExecOptions): WritableStream<OwnerChange> {
  const insertBuffer: OwnerApi[] = [];
  const upsertBuffer: OwnerApi[] = [];

  async function flushInserts(): Promise<void> {
    if (insertBuffer.length === 0) return;
    const batch = insertBuffer.splice(0);
    if (options.dryRun) return;
    logger.debug(`Inserting ${batch.length} owners...`);
    await Owners().insert(batch.map(formatOwnerApi));
  }

  async function flushUpserts(): Promise<void> {
    if (upsertBuffer.length === 0) return;
    const batch = upsertBuffer.splice(0);
    if (options.dryRun) return;
    logger.debug(`Upserting ${batch.length} owners...`);
    await db.transaction(async (trx) => {
      await trx(ownerTable)
        .insert(batch.map(formatOwnerApi))
        .onConflict('idpersonne')
        .merge([...UPSERT_COLUMNS]);
    });
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

- [ ] **Step 4.3: Run the full owner test suite**

```bash
yarn nx test server -- source-owner
```

Expected: all tests passing. No references to old processor, temp table, or `tee`.

- [ ] **Step 4.4: Commit**

```bash
git add server/src/scripts/import-lovac/source-owners/source-owner-command.ts \
        server/src/scripts/import-lovac/infra/progress-bar.ts
git commit -m "feat(server): rewire owner command to EETL pipeline with ts-pattern dispatch (L step)"
```

---

## Self-review

**Spec coverage:**
- `enrichWith` with `effect/Array.findFirst` + `Option.getOrNull`: Task 1 ✓
- Owner enricher with bulk SELECT by `idpersonne`: Task 2 ✓
- Pure synchronous transform, renamed to `source-owner-transform.ts`: Task 3 ✓
- Old processor files deleted: Task 3.5 ✓
- `count()` pre-pass dropped, progress bar total-optional: Task 4.1 ✓
- `tee()` replaced by `ts-pattern` exhaustive routing in load sink: Task 4.2 ✓
- Temp table replaced by `ON CONFLICT DO UPDATE` with per-batch transaction: Task 4.2 ✓
- No `compose` usage: confirmed — load sink uses inline buffers ✓
- `feat(server)` commit scope throughout ✓

**Placeholder scan:** None found.

**Type consistency:**
- `Enriched<S, E>` in `enrich.ts` → aliased as `EnrichedOwner` in `source-owner-enricher.ts` → parameter type of `createOwnerTransform` in `source-owner-transform.ts` ✓
- `OwnerChange.kind` is `'create' | 'update'` — matches `.with({ kind: 'create' })` and `.with({ kind: 'update' })` in the exhaustive match ✓
- `UPSERT_COLUMNS` typed as `const` array — passed to `.merge([...UPSERT_COLUMNS])` ✓
