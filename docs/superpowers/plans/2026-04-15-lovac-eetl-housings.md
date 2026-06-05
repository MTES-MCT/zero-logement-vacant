# LOVAC EETL — source-housings & source-housing-owners

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the EETL pattern to `source-housings` and `source-housing-owners`, replacing the fat processor with a separate enricher (batch DB fetch) and pure synchronous transform, and eliminating `HousingApi` in favour of `HousingRecordDBO`.

**Architecture:** Each pipeline gets a dedicated `TransformStream` enricher that fetches existing DB data in bulk (no per-record queries), and a pure function transform that computes changes from the enriched data. The command wires Extract → Enrich → Transform → Load and gains `writeReport`. The source-housing-owner command also gains `console.time` and a clean `try/finally`.

**Tech Stack:** TypeScript, Knex, PostgreSQL `json_agg`, node:stream/web, Vitest

---

## File Map

```
server/src/scripts/import-lovac/

source-housings/
  source-housing-enricher.ts          CREATE   batch json_agg query; TransformStream<SourceHousing, EnrichedSourceHousing>
  source-housing-transform.ts          CREATE   pure fn: EnrichedSourceHousing → SourceHousingChange[]
  source-housing-processor.ts          DELETE   replaced by enricher + transform
  source-housing-command.ts            MODIFY   wire EETL, add writeReport, remove formatHousingRecordApi
  test/source-housing-enricher.test.ts CREATE   integration: DB seeding + stream assertions
  test/source-housing-transform.test.ts CREATE  unit: pure function, no DB
  test/source-housing-processor.test.ts DELETE  superseded

source-housing-owners/
  source-housing-owner-enricher.ts     CREATE   2-query enricher per group
  source-housing-owner-transform.ts    CREATE   pure fn: EnrichedSourceHousingOwners → HousingOwnerChange[]
  source-housing-owner-processor.ts    DELETE   replaced
  source-housing-owner-command.ts      MODIFY   wire EETL, console.time, writeReport, try/finally
  test/source-housing-owner-enricher.test.ts CREATE
  test/source-housing-owner-transform.test.ts  CREATE
  test/source-housing-owner-processor.test.ts  DELETE  superseded
  test/source-housing-owner-command.test.ts    MODIFY  add write() helper + afterAll cleanup
```

---

## Task 1: Source housing enricher — tests

**Files:**
- Create: `server/src/scripts/import-lovac/source-housings/test/source-housing-enricher.test.ts`

- [ ] **Step 1.1: Write the failing test file**

```typescript
// server/src/scripts/import-lovac/source-housings/test/source-housing-enricher.test.ts
import { toArray } from '@zerologementvacant/utils/node';
import { faker } from '@faker-js/faker/locale/fr';
import { ReadableStream } from 'node:stream/web';
import {
  Events,
  formatEventApi,
  formatHousingEventApi,
  HousingEvents
} from '~/repositories/eventRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import {
  formatHousingNoteApi,
  formatNoteApi,
  HousingNotes,
  Notes
} from '~/repositories/noteRepository';
import { genSourceHousing } from '~/scripts/import-lovac/infra/fixtures';
import { createSourceHousingEnricher } from '../source-housing-enricher';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { Users, toUserDBO } from '~/repositories/userRepository';
import {
  genEstablishmentApi,
  genEventApi,
  genHousingApi,
  genNoteApi,
  genUserApi
} from '~/test/testFixtures';

describe('createSourceHousingEnricher', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);
  const housing = genHousingApi();

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert([toUserDBO(user)]);
    await Housing().insert(formatHousingRecordApi(housing));
  });

  it('should set existing.housing to null when housing is not found', async () => {
    const source = genSourceHousing(); // random geo_code/local_id — not in DB
    const [result] = await toArray(
      ReadableStream.from([source]).pipeThrough(createSourceHousingEnricher())
    );
    expect(result.existing.housing).toBeNull();
    expect(result.existing.events).toStrictEqual([]);
    expect(result.existing.notes).toStrictEqual([]);
  });

  it('should populate existing.housing when found, with empty events and notes', async () => {
    const source = {
      ...genSourceHousing(),
      geo_code: housing.geoCode,
      local_id: housing.localId
    };
    const [result] = await toArray(
      ReadableStream.from([source]).pipeThrough(createSourceHousingEnricher())
    );
    expect(result.existing.housing).toMatchObject({
      id: housing.id,
      geo_code: housing.geoCode,
      local_id: housing.localId
    });
    expect(result.existing.events).toStrictEqual([]);
    expect(result.existing.notes).toStrictEqual([]);
  });

  describe('with events', () => {
    const housingWithEvents = genHousingApi();
    const occupancyEvent = {
      ...genEventApi({ type: 'housing:occupancy-updated', creator: user }),
      housingGeoCode: housingWithEvents.geoCode,
      housingId: housingWithEvents.id
    };
    const otherEvent = {
      ...genEventApi({ type: 'housing:created', creator: user }),
      housingGeoCode: housingWithEvents.geoCode,
      housingId: housingWithEvents.id
    };

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housingWithEvents));
      await Events().insert([occupancyEvent, otherEvent].map(formatEventApi));
      await HousingEvents().insert(
        [occupancyEvent, otherEvent].map(formatHousingEventApi)
      );
    });

    it('should include occupancy-updated and status-updated events', async () => {
      const source = {
        ...genSourceHousing(),
        geo_code: housingWithEvents.geoCode,
        local_id: housingWithEvents.localId
      };
      const [result] = await toArray(
        ReadableStream.from([source]).pipeThrough(createSourceHousingEnricher())
      );
      expect(result.existing.events).toHaveLength(1);
      expect(result.existing.events[0]).toMatchObject({ id: occupancyEvent.id });
    });

    it('should exclude events of other types', async () => {
      const source = {
        ...genSourceHousing(),
        geo_code: housingWithEvents.geoCode,
        local_id: housingWithEvents.localId
      };
      const [result] = await toArray(
        ReadableStream.from([source]).pipeThrough(createSourceHousingEnricher())
      );
      const hasOtherEvent = result.existing.events.some(
        (e: any) => e.id === otherEvent.id
      );
      expect(hasOtherEvent).toBe(false);
    });
  });

  describe('with notes', () => {
    const housingWithNotes = genHousingApi();
    const note = genNoteApi(user);
    const housingNote = {
      ...note,
      housingId: housingWithNotes.id,
      housingGeoCode: housingWithNotes.geoCode
    };

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housingWithNotes));
      await Notes().insert(formatNoteApi(note));
      await HousingNotes().insert(formatHousingNoteApi(housingNote));
    });

    it('should populate notes when found', async () => {
      const source = {
        ...genSourceHousing(),
        geo_code: housingWithNotes.geoCode,
        local_id: housingWithNotes.localId
      };
      const [result] = await toArray(
        ReadableStream.from([source]).pipeThrough(createSourceHousingEnricher())
      );
      expect(result.existing.notes).toHaveLength(1);
      expect(result.existing.notes[0]).toMatchObject({ id: note.id });
    });
  });

  it('should process a batch of N sources in a single db.raw call', async () => {
    const sources = [housing, genHousingApi()].map((h) => ({
      ...genSourceHousing(),
      geo_code: h.geoCode,
      local_id: h.localId
    }));
    const results = await toArray(
      ReadableStream.from(sources).pipeThrough(createSourceHousingEnricher())
    );
    expect(results).toHaveLength(2);
  });
});
```

- [ ] **Step 1.2: Run test to verify it fails**

```bash
yarn nx test server -- source-housing-enricher
```

Expected: `Cannot find module '../source-housing-enricher'`

---

## Task 2: Source housing enricher — implementation

**Files:**
- Create: `server/src/scripts/import-lovac/source-housings/source-housing-enricher.ts`

- [ ] **Step 2.1: Implement the enricher**

```typescript
// server/src/scripts/import-lovac/source-housings/source-housing-enricher.ts
import { EventType } from '@zerologementvacant/models';
import { TransformStream } from 'node:stream/web';
import db from '~/infra/database';
import { EventRecordDBO } from '~/repositories/eventRepository';
import { HousingRecordDBO } from '~/repositories/housingRepository';
import { NoteRecordDBO } from '~/repositories/noteRepository';
import { SourceHousing } from './source-housing';

const CHUNK_SIZE = 500;

interface HousingEnrichment {
  housing: HousingRecordDBO | null;
  events: ReadonlyArray<EventRecordDBO<EventType>>;
  notes: ReadonlyArray<NoteRecordDBO>;
}

export type EnrichedSourceHousing = {
  source: SourceHousing;
  existing: HousingEnrichment;
};

export function createSourceHousingEnricher(): TransformStream<
  SourceHousing,
  EnrichedSourceHousing
> {
  const buffer: SourceHousing[] = [];

  async function flush(
    controller: TransformStreamDefaultController<EnrichedSourceHousing>
  ): Promise<void> {
    if (buffer.length === 0) return;
    const chunk = buffer.splice(0);

    const placeholders = chunk.map(() => '(?, ?)').join(', ');
    const values = chunk.flatMap((s) => [s.geo_code, s.local_id]);

    const { rows } = await db.raw<{
      rows: Array<
        HousingRecordDBO & {
          events: EventRecordDBO<EventType>[];
          notes: NoteRecordDBO[];
        }
      >;
    }>(
      `
      SELECT h.*,
        COALESCE(
          json_agg(DISTINCT to_jsonb(e.*)) FILTER (WHERE e.id IS NOT NULL),
          '[]'
        ) AS events,
        COALESCE(
          json_agg(DISTINCT to_jsonb(n.*)) FILTER (WHERE n.id IS NOT NULL),
          '[]'
        ) AS notes
      FROM fast_housing h
      LEFT JOIN housing_events he
        ON he.housing_geo_code = h.geo_code AND he.housing_id = h.id
      LEFT JOIN events e
        ON e.id = he.event_id
        AND e.type IN ('housing:occupancy-updated', 'housing:status-updated')
      LEFT JOIN housing_notes hn
        ON hn.housing_geo_code = h.geo_code AND hn.housing_id = h.id
      LEFT JOIN notes n ON n.id = hn.note_id
      WHERE (h.geo_code, h.local_id) IN (${placeholders})
      GROUP BY h.id
      `,
      values
    );

    const byKey = new Map(
      rows.map((r) => [`${r.geo_code}:${r.local_id}`, r])
    );

    for (const source of chunk) {
      const row = byKey.get(`${source.geo_code}:${source.local_id}`);
      if (!row) {
        controller.enqueue({
          source,
          existing: { housing: null, events: [], notes: [] }
        });
      } else {
        const { events, notes, ...housing } = row;
        controller.enqueue({
          source,
          existing: {
            housing: housing as HousingRecordDBO,
            events,
            notes
          }
        });
      }
    }
  }

  return new TransformStream<SourceHousing, EnrichedSourceHousing>({
    async transform(source, controller) {
      buffer.push(source);
      if (buffer.length >= CHUNK_SIZE) {
        await flush(controller);
      }
    },
    async flush(controller) {
      await flush(controller);
    }
  });
}
```

- [ ] **Step 2.2: Run tests to verify they pass**

```bash
yarn nx test server -- source-housing-enricher
```

Expected: all tests PASS

- [ ] **Step 2.3: Commit**

```bash
git add server/src/scripts/import-lovac/source-housings/source-housing-enricher.ts \
        server/src/scripts/import-lovac/source-housings/test/source-housing-enricher.test.ts
git commit -m "feat(server): add source-housing enricher with batch json_agg query"
```

---

## Task 3: Source housing transform — tests

**Files:**
- Create: `server/src/scripts/import-lovac/source-housings/test/source-housing-transform.test.ts`

- [ ] **Step 3.1: Write the failing test file**

```typescript
// server/src/scripts/import-lovac/source-housings/test/source-housing-transform.test.ts
import { faker } from '@faker-js/faker/locale/fr';
import {
  HousingStatus,
  Occupancy
} from '@zerologementvacant/models';
import { v5 as uuidv5 } from 'uuid';
import {
  formatHousingRecordApi,
  HousingRecordDBO
} from '~/repositories/housingRepository';
import { LOVAC_NAMESPACE } from '~/scripts/import-lovac/infra';
import { genSourceHousing } from '~/scripts/import-lovac/infra/fixtures';
import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';
import { EnrichedSourceHousing } from '../source-housing-enricher';
import {
  createHousingTransform,
  HousingChange,
  SourceHousingChange
} from '../source-housing-transform';
import { genHousingApi } from '~/test/testFixtures';

const ADMIN_USER_ID = faker.string.uuid();

describe('createHousingTransform', () => {
  const reporter = createNoopReporter<any>();
  const transform = createHousingTransform({
    reporter,
    adminUserId: ADMIN_USER_ID,
    year: 'lovac-2025'
  });

  describe('housing not in DB (existing.housing === null)', () => {
    it('should produce a create change', () => {
      const source = genSourceHousing();
      const enriched: EnrichedSourceHousing = {
        source,
        existing: { housing: null, events: [], notes: [] }
      };
      const changes = transform(enriched);
      expect(changes).toContainEqual(
        expect.objectContaining<Partial<HousingChange>>({
          type: 'housing',
          kind: 'create'
        })
      );
    });

    it('should set occupancy to VACANT and status to NEVER_CONTACTED', () => {
      const source = genSourceHousing();
      const enriched: EnrichedSourceHousing = {
        source,
        existing: { housing: null, events: [], notes: [] }
      };
      const changes = transform(enriched);
      const housingChange = changes.find(
        (c): c is HousingChange => c.type === 'housing'
      )!;
      expect(housingChange.value).toMatchObject<Partial<HousingRecordDBO>>({
        occupancy: Occupancy.VACANT,
        occupancy_source: Occupancy.VACANT,
        status: HousingStatus.NEVER_CONTACTED,
        data_file_years: ['lovac-2025']
      });
    });

    it('should produce a deterministic id', () => {
      const source = genSourceHousing();
      const enriched: EnrichedSourceHousing = {
        source,
        existing: { housing: null, events: [], notes: [] }
      };
      const [c1, c2] = [transform(enriched), transform(enriched)];
      const id1 = (c1.find((c): c is HousingChange => c.type === 'housing')!).value.id;
      const id2 = (c2.find((c): c is HousingChange => c.type === 'housing')!).value.id;
      expect(id1).toBe(id2);
      expect(id1).toBe(
        uuidv5(source.local_id + ':' + source.geo_code, LOVAC_NAMESPACE)
      );
    });

    it('should add an address change when ban_label is present', () => {
      const source = { ...genSourceHousing(), ban_label: 'some address' };
      const enriched: EnrichedSourceHousing = {
        source,
        existing: { housing: null, events: [], notes: [] }
      };
      const changes = transform(enriched);
      expect(changes.some((c) => c.type === 'address')).toBe(true);
    });

    it('should NOT add an address change when ban_label is absent', () => {
      const source = { ...genSourceHousing(), ban_label: null };
      const enriched: EnrichedSourceHousing = {
        source,
        existing: { housing: null, events: [], notes: [] }
      };
      const changes = transform(enriched);
      expect(changes.some((c) => c.type === 'address')).toBe(false);
    });
  });

  describe('housing in DB (existing.housing !== null)', () => {
    it('should produce an update change with lovac-2025 appended to data_file_years', () => {
      const housing = formatHousingRecordApi({
        ...genHousingApi(),
        dataFileYears: ['lovac-2024']
      });
      const source = {
        ...genSourceHousing(),
        geo_code: housing.geo_code,
        local_id: housing.local_id
      };
      const enriched: EnrichedSourceHousing = {
        source,
        existing: { housing, events: [], notes: [] }
      };
      const changes = transform(enriched);
      const housingChange = changes.find(
        (c): c is HousingChange => c.type === 'housing'
      )!;
      expect(housingChange.kind).toBe('update');
      expect(housingChange.value.data_file_years).toContain('lovac-2025');
    });

    describe('non-vacant housing with no user events or notes', () => {
      it('should reset occupancy to VACANT and status to NEVER_CONTACTED', () => {
        const housing = formatHousingRecordApi({
          ...genHousingApi(),
          occupancy: Occupancy.RENT,
          status: HousingStatus.IN_PROGRESS
        });
        const source = {
          ...genSourceHousing(),
          geo_code: housing.geo_code,
          local_id: housing.local_id
        };
        const enriched: EnrichedSourceHousing = {
          source,
          existing: { housing, events: [], notes: [] }
        };
        const changes = transform(enriched);
        const housingChange = changes.find(
          (c): c is HousingChange => c.type === 'housing'
        )!;
        expect(housingChange.value).toMatchObject<Partial<HousingRecordDBO>>({
          occupancy: Occupancy.VACANT,
          status: HousingStatus.NEVER_CONTACTED,
          sub_status: null
        });
      });

      it('should produce an occupancy-updated event', () => {
        const housing = formatHousingRecordApi({
          ...genHousingApi(),
          occupancy: Occupancy.RENT,
          status: HousingStatus.IN_PROGRESS
        });
        const source = {
          ...genSourceHousing(),
          geo_code: housing.geo_code,
          local_id: housing.local_id
        };
        const enriched: EnrichedSourceHousing = {
          source,
          existing: { housing, events: [], notes: [] }
        };
        const changes = transform(enriched);
        expect(
          changes.some(
            (c) =>
              c.type === 'event' &&
              (c.value as any).type === 'housing:occupancy-updated'
          )
        ).toBe(true);
      });
    });

    describe('non-vacant housing with a user-authored occupancy event', () => {
      it('should NOT reset occupancy', () => {
        const housing = formatHousingRecordApi({
          ...genHousingApi(),
          occupancy: Occupancy.RENT,
          status: HousingStatus.IN_PROGRESS
        });
        // A user event: created_by is NOT the admin user
        const userEvent = {
          id: faker.string.uuid(),
          type: 'housing:occupancy-updated',
          next_old: { occupancy: Occupancy.VACANT },
          next_new: { occupancy: Occupancy.RENT },
          created_by: faker.string.uuid(), // different from ADMIN_USER_ID
          created_at: new Date()
        };
        const source = {
          ...genSourceHousing(),
          geo_code: housing.geo_code,
          local_id: housing.local_id
        };
        const enriched: EnrichedSourceHousing = {
          source,
          existing: { housing, events: [userEvent as any], notes: [] }
        };
        const changes = transform(enriched);
        const housingChange = changes.find(
          (c): c is HousingChange => c.type === 'housing'
        )!;
        expect(housingChange.value.occupancy).toBe(Occupancy.RENT);
      });
    });
  });
});
```

- [ ] **Step 3.2: Run test to verify it fails**

```bash
yarn nx test server -- source-housing-transform
```

Expected: `Cannot find module '../source-housing-transform'`

---

## Task 4: Source housing transform — implementation

**Files:**
- Create: `server/src/scripts/import-lovac/source-housings/source-housing-transform.ts`
- Delete: `server/src/scripts/import-lovac/source-housings/source-housing-processor.ts`
- Delete: `server/src/scripts/import-lovac/source-housings/test/source-housing-processor.test.ts`

- [ ] **Step 4.1: Implement the transform**

```typescript
// server/src/scripts/import-lovac/source-housings/source-housing-transform.ts
import {
  AddressKinds,
  CadastralClassification,
  EventType,
  HousingSource,
  HousingStatus,
  Occupancy,
  toEventHousingStatus
} from '@zerologementvacant/models';
import { Predicate } from '@zerologementvacant/utils';
import { v5 as uuidv5 } from 'uuid';
import { AddressApi } from '~/models/AddressApi';
import { HousingEventApi } from '~/models/EventApi';
import { normalizeDataFileYears } from '~/models/HousingApi';
import { EventRecordDBO } from '~/repositories/eventRepository';
import {
  HousingRecordDBO
} from '~/repositories/housingRepository';
import { NoteRecordDBO } from '~/repositories/noteRepository';
import {
  LOVAC_NAMESPACE,
  ReporterError,
  ReporterOptions
} from '~/scripts/import-lovac/infra';
import { EnrichedSourceHousing } from './source-housing-enricher';
import { SourceHousing } from './source-housing';

type READ_ONLY_FIELDS = 'last_mutation_type' | 'plot_area' | 'occupancy_history';
export type HousingRecordInsert = Omit<HousingRecordDBO, READ_ONLY_FIELDS>;

interface Change<Value, Type extends string> {
  type: Type;
  kind: 'create' | 'update';
  value: Value;
}

export type HousingChange = Change<HousingRecordInsert, 'housing'>;
export type HousingEventChange = Change<HousingEventApi, 'event'>;
export type AddressChange = Change<AddressApi, 'address'>;
export type SourceHousingChange =
  | HousingChange
  | HousingEventChange
  | AddressChange;

interface TransformOptions extends ReporterOptions<SourceHousing> {
  adminUserId: string;
  year: string;
}

export function createHousingTransform(opts: TransformOptions) {
  const { reporter, abortEarly, adminUserId, year } = opts;

  return function transform(
    enriched: EnrichedSourceHousing
  ): SourceHousingChange[] {
    const { source, existing } = enriched;
    try {
      const changes = existing.housing
        ? toUpdate(source, existing.housing, existing.events, existing.notes, { adminUserId, year })
        : toCreate(source, year);
      reporter.passed(source);
      return changes;
    } catch (error) {
      reporter.failed(
        source,
        new ReporterError((error as Error).message, source)
      );
      if (abortEarly) throw error;
      return [];
    }
  };
}

function toCreate(source: SourceHousing, year: string): SourceHousingChange[] {
  const id = uuidv5(source.local_id + ':' + source.geo_code, LOVAC_NAMESPACE);

  const housing: HousingRecordInsert = {
    id,
    invariant: source.invariant,
    local_id: source.local_id,
    building_id: source.building_id,
    building_group_id: null,
    building_location: source.building_location,
    building_year: source.building_year ?? null,
    plot_id: source.plot_id,
    geo_code: source.geo_code,
    address_dgfip: [source.dgfip_address],
    longitude_dgfip: source.dgfip_longitude ?? null,
    latitude_dgfip: source.dgfip_latitude ?? null,
    geolocation: null,
    cadastral_classification: source.cadastral_classification,
    uncomfortable: source.uncomfortable ?? false,
    vacancy_start_year: source.vacancy_start_year,
    housing_kind: source.housing_kind,
    rooms_count: source.rooms_count,
    living_area: source.living_area,
    cadastral_reference: source.cadastral_reference,
    beneficiary_count: null,
    taxed: source.taxed,
    rental_value: source.rental_value ?? null,
    condominium: source.condominium ?? null,
    occupancy: Occupancy.VACANT,
    occupancy_source: Occupancy.VACANT,
    occupancy_intended: null,
    status: HousingStatus.NEVER_CONTACTED,
    sub_status: null,
    data_years: [2024],
    data_file_years: [year],
    data_source: 'lovac' as HousingSource,
    actual_dpe: null,
    energy_consumption_bdnb: null,
    energy_consumption_at_bdnb: null,
    last_mutation_date: source.last_mutation_date ?? null,
    last_transaction_date: source.last_transaction_date ?? null,
    last_transaction_value: source.last_transaction_value,
    mutation_date: null
  };

  const changes: SourceHousingChange[] = [
    { type: 'housing', kind: 'create', value: housing }
  ];

  if (source.ban_label) {
    const address: AddressApi = {
      refId: id,
      addressKind: AddressKinds.Housing,
      banId: source.ban_id ?? undefined,
      label: source.ban_label,
      postalCode: '',
      city: '',
      latitude: source.ban_latitude ?? undefined,
      longitude: source.ban_longitude ?? undefined,
      score: source.ban_score ?? undefined
    };
    changes.push({ type: 'address', kind: 'create', value: address });
  }

  return changes;
}

function toUpdate(
  source: SourceHousing,
  existing: HousingRecordDBO,
  events: ReadonlyArray<EventRecordDBO<EventType>>,
  notes: ReadonlyArray<NoteRecordDBO>,
  opts: { adminUserId: string; year: string }
): SourceHousingChange[] {
  const { adminUserId, year } = opts;
  const dataFileYears = normalizeDataFileYears(
    (existing.data_file_years ?? []).concat(year)
  ) as string[];

  const patch = applyChanges(existing, events, notes, adminUserId);
  const eventChanges: HousingEventChange[] = [];

  if (
    patch.occupancy !== undefined &&
    existing.occupancy !== patch.occupancy
  ) {
    eventChanges.push({
      type: 'event',
      kind: 'create',
      value: {
        id: uuidv5(
          existing.id + ':housing:occupancy-updated:' + year,
          LOVAC_NAMESPACE
        ),
        type: 'housing:occupancy-updated',
        nextOld: { occupancy: existing.occupancy },
        nextNew: { occupancy: patch.occupancy },
        createdBy: adminUserId,
        createdAt: new Date().toISOString(),
        housingGeoCode: existing.geo_code,
        housingId: existing.id
      }
    });
  }

  if (
    patch.status !== undefined &&
    existing.status !== patch.status
  ) {
    eventChanges.push({
      type: 'event',
      kind: 'create',
      value: {
        id: uuidv5(
          existing.id + ':housing:status-updated:' + year,
          LOVAC_NAMESPACE
        ),
        type: 'housing:status-updated',
        nextOld: {
          status: toEventHousingStatus(existing.status),
          subStatus: existing.sub_status
        },
        nextNew: {
          status: toEventHousingStatus(patch.status ?? existing.status),
          subStatus: patch.sub_status ?? null
        },
        createdBy: adminUserId,
        createdAt: new Date().toISOString(),
        housingGeoCode: existing.geo_code,
        housingId: existing.id
      }
    });
  }

  const housing: HousingRecordInsert = {
    ...existing,
    ...patch,
    data_file_years: dataFileYears,
    local_id: source.local_id,
    invariant: source.invariant,
    building_id: source.building_id,
    building_location: source.building_location,
    building_year: source.building_year ?? null,
    plot_id: source.plot_id,
    address_dgfip: [source.dgfip_address],
    longitude_dgfip: source.dgfip_latitude ?? null,
    latitude_dgfip: source.dgfip_latitude ?? null,
    housing_kind: source.housing_kind,
    condominium: source.condominium ?? null,
    living_area: source.living_area,
    rooms_count: source.rooms_count,
    uncomfortable: source.uncomfortable ?? false,
    cadastral_classification:
      (source.cadastral_classification as CadastralClassification) ?? null,
    cadastral_reference: source.cadastral_reference,
    taxed: source.taxed,
    rental_value: source.rental_value ?? null,
    vacancy_start_year: source.vacancy_start_year,
    last_mutation_date: source.last_mutation_date ?? null,
    last_transaction_date: source.last_transaction_date ?? null,
    last_transaction_value: source.last_transaction_value
  };

  return [
    { type: 'housing', kind: 'update', value: housing },
    ...eventChanges
  ];
}

function applyChanges(
  housing: HousingRecordDBO,
  events: ReadonlyArray<EventRecordDBO<EventType>>,
  notes: ReadonlyArray<NoteRecordDBO>,
  adminUserId: string
): Partial<HousingRecordInsert> {
  const rules: ReadonlyArray<Predicate<void>> = [
    () => housing.occupancy !== Occupancy.VACANT,
    () =>
      events.length === 0 ||
      !hasUserEvents(events, adminUserId),
    () =>
      notes.length === 0 ||
      !hasUserNotes(notes, adminUserId)
  ];

  if (rules.every((rule) => rule())) {
    return {
      occupancy: Occupancy.VACANT,
      status: HousingStatus.NEVER_CONTACTED,
      sub_status: null
    };
  }

  return {};
}

function hasUserEvents(
  events: ReadonlyArray<EventRecordDBO<EventType>>,
  adminUserId: string
): boolean {
  return events
    .filter((e) =>
      ['housing:occupancy-updated', 'housing:status-updated'].includes(e.type)
    )
    .some((e) => e.created_by !== adminUserId);
}

function hasUserNotes(
  notes: ReadonlyArray<NoteRecordDBO>,
  adminUserId: string
): boolean {
  return notes.some((n) => n.created_by !== adminUserId);
}
```

- [ ] **Step 4.2: Run tests to verify they pass**

```bash
yarn nx test server -- source-housing-transform
```

Expected: all tests PASS

- [ ] **Step 4.3: Delete processor and its test**

```bash
rm server/src/scripts/import-lovac/source-housings/source-housing-processor.ts
rm server/src/scripts/import-lovac/source-housings/test/source-housing-processor.test.ts
```

- [ ] **Step 4.4: Commit**

```bash
git add server/src/scripts/import-lovac/source-housings/source-housing-transform.ts \
        server/src/scripts/import-lovac/source-housings/test/source-housing-transform.test.ts
git rm server/src/scripts/import-lovac/source-housings/source-housing-processor.ts \
       server/src/scripts/import-lovac/source-housings/test/source-housing-processor.test.ts
git commit -m "feat(server): add source-housing transform, delete processor"
```

---

## Task 5: Wire source housing command

**Files:**
- Modify: `server/src/scripts/import-lovac/source-housings/source-housing-command.ts`

Replace the `createSourceHousingProcessor` import and usage with `createSourceHousingEnricher` + `createHousingTransform`. Add `writeReport`. Remove `formatHousingRecordApi` from the update pipeline step.

- [ ] **Step 5.1: Update the command**

Replace the import block (remove processor, add enricher + transform):

```typescript
// REMOVE these imports:
// import { createSourceHousingProcessor, HousingEventChange, HousingChange, AddressChange } from './source-housing-processor';
// import { formatHousingRecordApi } from '~/repositories/housingRepository';

// ADD these imports:
import { createS3 } from '@zerologementvacant/utils/node';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { writeFileSync } from 'node:fs';
import { Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';
import { createSourceHousingEnricher } from './source-housing-enricher';
import {
  createHousingTransform,
  HousingChange,
  AddressChange,
  HousingEventChange
} from './source-housing-transform';
```

Replace the main import pipeline in phase 2 (find the `createSourceHousingProcessor` call and replace with):

```typescript
      .pipeThrough(
        createSourceHousingEnricher()
      )
      .pipeThrough(
        map(
          createHousingTransform({
            abortEarly: options.abortEarly,
            auth,                         // keep for adminUserId
            adminUserId: auth.id,
            reporter: sourceHousingReporter,
            year: options.year
          })
        )
      )
```

In the housing **update** sink, remove the `.pipeThrough(map(formatHousingRecordApi))` step — the transform now emits `HousingRecordInsert` directly:

```typescript
        housingUpdates
          .pipeThrough(
            filter(
              (change): change is HousingChange =>
                change.type === 'housing' && change.kind === 'update'
            )
          )
          .pipeThrough(map((change) => change.value))
          // NO MORE .pipeThrough(map(formatHousingRecordApi))
          .pipeTo(
            createUpdater<HousingRecordDBO>({
              destination: options.dryRun ? 'file' : 'database',
              file: path.join(import.meta.dirname, 'source-housing-updates.jsonl'),
              temporaryTable: 'source_housing_updates_tmp',
              likeTable: housingTable,
              async update(housings): Promise<void> {
                await updateHousings(housings, {
                  temporaryTable: 'source_housing_updates_tmp'
                });
              }
            })
          ),
```

In the housing **creation** sink, the `insertHousings` function already calls `formatHousingRecordApi` internally — update its signature:

```typescript
export async function insertHousings(
  housings: ReadonlyArray<HousingRecordInsert>  // was ReadonlyArray<HousingApi>
): Promise<void> {
  await Housing().insert(housings);             // no more map(formatHousingRecordApi)
}
```

Add `writeReport` function and call it in `finally`:

```typescript
async function writeReport(
  file: string,
  options: ExecOptions,
  reporter: Reporter<SourceHousing>
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
          `./import-lovac-${options.year}-housings.report.json`,
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

Update `finally`:
```typescript
    } finally {
      logger.info('Enabling building triggers...');
      await db.raw(`
        ALTER TABLE fast_housing ENABLE TRIGGER housing_insert_building_trigger;
        ALTER TABLE fast_housing ENABLE TRIGGER housing_update_building_trigger;
        ALTER TABLE fast_housing ENABLE TRIGGER housing_delete_building_trigger;
      `);
      sourceHousingReporter.report();
      housingReporter.report();
      await writeReport(file, options, sourceHousingReporter);
      console.timeEnd('Import housings');
    }
```

- [ ] **Step 5.2: Run existing housing command tests**

```bash
yarn nx test server -- source-housing-command
```

Expected: all tests PASS (behavior is unchanged, only the internals changed)

- [ ] **Step 5.3: Commit**

```bash
git add server/src/scripts/import-lovac/source-housings/source-housing-command.ts
git commit -m "feat(server): wire EETL pipeline and writeReport in source-housing command"
```

---

## Task 6: Source housing-owner enricher — tests

**Files:**
- Create: `server/src/scripts/import-lovac/source-housing-owners/test/source-housing-owner-enricher.test.ts`

- [ ] **Step 6.1: Write the failing test file**

```typescript
// server/src/scripts/import-lovac/source-housing-owners/test/source-housing-owner-enricher.test.ts
import { toArray } from '@zerologementvacant/utils/node';
import { faker } from '@faker-js/faker/locale/fr';
import { ACTIVE_OWNER_RANKS, ActiveOwnerRank } from '@zerologementvacant/models';
import { ReadableStream } from 'node:stream/web';
import {
  formatHousingOwnerApi,
  HousingOwnerDBO,
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
import { createSourceHousingOwnerEnricher } from '../source-housing-owner-enricher';
import {
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi
} from '~/test/testFixtures';
import { SourceHousingOwner } from '../source-housing-owner';

function genValidIdpersonne(): string {
  return (
    faker.string.numeric(2) +
    faker.string.alphanumeric({ length: 6, casing: 'upper' })
  );
}

describe('createSourceHousingOwnerEnricher', () => {
  const housing = genHousingApi();
  const owner = { ...genOwnerApi(), idpersonne: genValidIdpersonne() };

  beforeAll(async () => {
    await Housing().insert(formatHousingRecordApi(housing));
    await Owners().insert(formatOwnerApi(owner));
  });

  function makeGroup(
    housingOverride: { geo_code: string; local_id: string },
    idpersonnes: string[]
  ): SourceHousingOwner[] {
    return idpersonnes.map((idpersonne, i) => ({
      idpersonne,
      idprocpte: faker.string.alphanumeric(8),
      idprodroit: faker.string.alphanumeric(8),
      rank: ((i % ACTIVE_OWNER_RANKS.length) + 1) as ActiveOwnerRank,
      geo_code: housingOverride.geo_code,
      local_id: housingOverride.local_id,
      locprop_source: 1,
      property_right: 'autre' as const
    }));
  }

  it('should set existing.housing to null when housing is not found', async () => {
    const group = makeGroup(
      { geo_code: '99000', local_id: 'UNKNOWN' },
      [owner.idpersonne as string]
    );
    const [result] = await toArray(
      ReadableStream.from([group]).pipeThrough(
        createSourceHousingOwnerEnricher()
      )
    );
    expect(result.existing.housing).toBeNull();
    expect(result.existing.existingHousingOwners).toStrictEqual([]);
  });

  it('should populate housing and owners when found', async () => {
    const group = makeGroup(
      { geo_code: housing.geoCode, local_id: housing.localId },
      [owner.idpersonne as string]
    );
    const [result] = await toArray(
      ReadableStream.from([group]).pipeThrough(
        createSourceHousingOwnerEnricher()
      )
    );
    expect(result.existing.housing).toMatchObject({
      id: housing.id,
      geo_code: housing.geoCode
    });
    expect(result.existing.owners).toHaveLength(1);
    expect(result.existing.owners[0].idpersonne).toBe(owner.idpersonne);
    expect(result.existing.existingHousingOwners).toStrictEqual([]);
  });

  describe('with existing housing owners', () => {
    const housingWithOwners = genHousingApi();
    const existingOwner = { ...genOwnerApi(), idpersonne: genValidIdpersonne() };
    const newSourceOwner = { ...genOwnerApi(), idpersonne: genValidIdpersonne() };
    let existingHousingOwner: HousingOwnerDBO;

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housingWithOwners));
      await Owners().insert(
        [existingOwner, newSourceOwner].map(formatOwnerApi)
      );
      const housingOwnerApi = {
        ...genHousingOwnerApi(housingWithOwners, existingOwner),
        rank: 1 as ActiveOwnerRank
      };
      existingHousingOwner = formatHousingOwnerApi(housingOwnerApi);
      await HousingOwners().insert(existingHousingOwner);
    });

    it('should populate existingHousingOwners', async () => {
      const group = makeGroup(
        { geo_code: housingWithOwners.geoCode, local_id: housingWithOwners.localId },
        [existingOwner.idpersonne as string, newSourceOwner.idpersonne as string]
      );
      const [result] = await toArray(
        ReadableStream.from([group]).pipeThrough(
          createSourceHousingOwnerEnricher()
        )
      );
      expect(result.existing.existingHousingOwners).toHaveLength(1);
      expect(result.existing.existingHousingOwners[0].owner_id).toBe(
        existingOwner.id
      );
    });

    it('should fetch owners for both source idpersonnes and existing housing owners', async () => {
      const group = makeGroup(
        { geo_code: housingWithOwners.geoCode, local_id: housingWithOwners.localId },
        [newSourceOwner.idpersonne as string] // only the NEW owner in source
      );
      const [result] = await toArray(
        ReadableStream.from([group]).pipeThrough(
          createSourceHousingOwnerEnricher()
        )
      );
      // Should include both the source owner AND the existing housing owner's owner record
      const ownerIds = result.existing.owners.map((o) => o.id);
      expect(ownerIds).toContain(newSourceOwner.id);
      expect(ownerIds).toContain(existingOwner.id);
    });
  });
});
```

- [ ] **Step 6.2: Run test to verify it fails**

```bash
yarn nx test server -- source-housing-owner-enricher
```

Expected: `Cannot find module '../source-housing-owner-enricher'`

---

## Task 7: Source housing-owner enricher — implementation

**Files:**
- Create: `server/src/scripts/import-lovac/source-housing-owners/source-housing-owner-enricher.ts`

- [ ] **Step 7.1: Implement the enricher**

```typescript
// server/src/scripts/import-lovac/source-housing-owners/source-housing-owner-enricher.ts
import { TransformStream } from 'node:stream/web';
import db from '~/infra/database';
import { HousingOwnerDBO } from '~/repositories/housingOwnerRepository';
import { HousingRecordDBO } from '~/repositories/housingRepository';
import { OwnerDBO, Owners } from '~/repositories/ownerRepository';
import { SourceHousingOwner } from './source-housing-owner';

interface HousingOwnerEnrichment {
  housing: HousingRecordDBO | null;
  owners: ReadonlyArray<OwnerDBO>;
  existingHousingOwners: ReadonlyArray<HousingOwnerDBO>;
}

export type EnrichedSourceHousingOwners = {
  source: ReadonlyArray<SourceHousingOwner>;
  existing: HousingOwnerEnrichment;
};

export function createSourceHousingOwnerEnricher(): TransformStream<
  ReadonlyArray<SourceHousingOwner>,
  EnrichedSourceHousingOwners
> {
  return new TransformStream<
    ReadonlyArray<SourceHousingOwner>,
    EnrichedSourceHousingOwners
  >({
    async transform(group, controller) {
      const { geo_code: geoCode, local_id: localId } = group[0];
      const sourceIdpersonnes = group.map((s) => s.idpersonne);

      // Query 1: housing + existing housing owners (single JOIN)
      const rows: Array<HousingRecordDBO & Partial<HousingOwnerDBO>> =
        await db('fast_housing as h')
          .select([
            'h.*',
            'ho.owner_id',
            'ho.rank',
            'ho.start_date',
            'ho.end_date',
            'ho.origin',
            'ho.idprocpte',
            'ho.idprodroit',
            'ho.locprop_source',
            'ho.locprop_relative_ban',
            'ho.locprop_distance_ban',
            'ho.property_right'
          ])
          .leftJoin('housing_owners as ho', function (this: any) {
            this.on('ho.housing_geo_code', '=', 'h.geo_code').andOn(
              'ho.housing_id',
              '=',
              'h.id'
            );
          })
          .where('h.geo_code', geoCode)
          .andWhere('h.local_id', localId);

      if (rows.length === 0) {
        controller.enqueue({
          source: group,
          existing: { housing: null, owners: [], existingHousingOwners: [] }
        });
        return;
      }

      // Extract housing from first row (ho.* fields are separate)
      const {
        owner_id,
        rank,
        start_date,
        end_date,
        origin,
        idprocpte,
        idprodroit,
        locprop_source,
        locprop_relative_ban,
        locprop_distance_ban,
        property_right,
        ...housingFields
      } = rows[0];
      const housing = housingFields as HousingRecordDBO;

      const existingHousingOwners: HousingOwnerDBO[] = rows
        .filter((r) => r.owner_id != null)
        .map((r) => ({
          owner_id: r.owner_id!,
          housing_id: housing.id,
          housing_geo_code: housing.geo_code,
          rank: r.rank!,
          start_date: r.start_date ?? null,
          end_date: r.end_date ?? null,
          origin: r.origin ?? null,
          idprocpte: r.idprocpte ?? null,
          idprodroit: r.idprodroit ?? null,
          locprop_source: r.locprop_source ?? null,
          locprop_relative_ban: r.locprop_relative_ban ?? null,
          locprop_distance_ban: r.locprop_distance_ban ?? null,
          property_right: r.property_right ?? null
        }));

      // Query 2: owners by idpersonne (source) + by id (existing housing owners)
      const existingOwnerIds = existingHousingOwners.map((ho) => ho.owner_id);
      const owners: OwnerDBO[] = await Owners()
        .whereIn('idpersonne', sourceIdpersonnes)
        .modify((qb) => {
          if (existingOwnerIds.length > 0) {
            qb.orWhereIn('id', existingOwnerIds);
          }
        });

      controller.enqueue({
        source: group,
        existing: { housing, owners, existingHousingOwners }
      });
    }
  });
}
```

- [ ] **Step 7.2: Run tests to verify they pass**

```bash
yarn nx test server -- source-housing-owner-enricher
```

Expected: all tests PASS

- [ ] **Step 7.3: Commit**

```bash
git add server/src/scripts/import-lovac/source-housing-owners/source-housing-owner-enricher.ts \
        server/src/scripts/import-lovac/source-housing-owners/test/source-housing-owner-enricher.test.ts
git commit -m "feat(server): add source-housing-owner enricher with 2-query JOIN"
```

---

## Task 8: Source housing-owner transform — tests

**Files:**
- Create: `server/src/scripts/import-lovac/source-housing-owners/test/source-housing-owner-transform.test.ts`

- [ ] **Step 8.1: Write the failing test file**

```typescript
// server/src/scripts/import-lovac/source-housing-owners/test/source-housing-owner-transform.test.ts
import { faker } from '@faker-js/faker/locale/fr';
import {
  ACTIVE_OWNER_RANKS,
  ActiveOwnerRank,
  isActiveOwnerRank,
  isPreviousOwnerRank,
  PREVIOUS_OWNER_RANK
} from '@zerologementvacant/models';
import {
  formatHousingOwnerApi,
  HousingOwnerDBO
} from '~/repositories/housingOwnerRepository';
import { formatHousingRecordApi } from '~/repositories/housingRepository';
import { formatOwnerApi, OwnerRecordDBO } from '~/repositories/ownerRepository';
import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';
import { EnrichedSourceHousingOwners } from '../source-housing-owner-enricher';
import {
  createHousingOwnerTransform,
  HousingOwnersChange
} from '../source-housing-owner-transform';
import {
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi
} from '~/test/testFixtures';
import { SourceHousingOwner } from '../source-housing-owner';

const ADMIN_USER_ID = faker.string.uuid();

function genValidIdpersonne(): string {
  return (
    faker.string.numeric(2) +
    faker.string.alphanumeric({ length: 6, casing: 'upper' })
  );
}

function makeSourceOwner(
  housingGeoCode: string,
  housingLocalId: string,
  idpersonne: string,
  rank: ActiveOwnerRank
): SourceHousingOwner {
  return {
    idpersonne,
    idprocpte: faker.string.alphanumeric(8),
    idprodroit: faker.string.alphanumeric(8),
    rank,
    geo_code: housingGeoCode,
    local_id: housingLocalId,
    locprop_source: 1,
    property_right: 'autre' as const
  };
}

describe('createHousingOwnerTransform', () => {
  const reporter = createNoopReporter<any>();
  const transform = createHousingOwnerTransform({
    reporter,
    adminUserId: ADMIN_USER_ID,
    year: 'lovac-2025'
  });

  describe('missing housing', () => {
    it('should call reporter.failed and return []', () => {
      const spy = vi.spyOn(reporter, 'failed');
      const source: SourceHousingOwner[] = [
        makeSourceOwner('75001', 'LOCAL001', genValidIdpersonne(), 1)
      ];
      const enriched: EnrichedSourceHousingOwners = {
        source,
        existing: { housing: null, owners: [], existingHousingOwners: [] }
      };
      const changes = transform(enriched);
      expect(changes).toStrictEqual([]);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('missing owners', () => {
    it('should call reporter.failed when a source owner is not in existing.owners', () => {
      const housing = formatHousingRecordApi(genHousingApi());
      const spy = vi.spyOn(reporter, 'failed');
      const source: SourceHousingOwner[] = [
        makeSourceOwner(housing.geo_code, housing.local_id, genValidIdpersonne(), 1)
      ];
      const enriched: EnrichedSourceHousingOwners = {
        source,
        existing: { housing, owners: [], existingHousingOwners: [] }
      };
      const changes = transform(enriched);
      expect(changes).toStrictEqual([]);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('new housing owners (no existing)', () => {
    const housing = formatHousingRecordApi(genHousingApi());
    const owner = formatOwnerApi({ ...genOwnerApi(), idpersonne: genValidIdpersonne() });
    const source = [
      makeSourceOwner(housing.geo_code, housing.local_id, owner.idpersonne!, 1)
    ];
    const enriched: EnrichedSourceHousingOwners = {
      source,
      existing: {
        housing,
        owners: [owner as any],
        existingHousingOwners: []
      }
    };

    it('should produce a housingOwners replace change with the new owner as active', () => {
      const changes = transform(enriched);
      const ownerChange = changes.find(
        (c): c is HousingOwnersChange => c.type === 'housingOwners'
      )!;
      expect(ownerChange.kind).toBe('replace');
      const activeOwners = ownerChange.value.filter((ho) =>
        isActiveOwnerRank(ho.rank)
      );
      expect(activeOwners).toHaveLength(1);
      expect(activeOwners[0].owner_id).toBe(owner.id);
      expect(activeOwners[0].housing_id).toBe(housing.id);
      expect(activeOwners[0].end_date).toBeNull();
    });
  });

  describe('replacing existing housing owners', () => {
    const housing = formatHousingRecordApi(genHousingApi());
    const existingOwner = formatOwnerApi({ ...genOwnerApi(), idpersonne: genValidIdpersonne() });
    const newOwner = formatOwnerApi({ ...genOwnerApi(), idpersonne: genValidIdpersonne() });
    const existingHousingOwner: HousingOwnerDBO = formatHousingOwnerApi({
      ...genHousingOwnerApi(genHousingApi(), genOwnerApi()),
      ownerId: existingOwner.id,
      housingId: housing.id,
      housingGeoCode: housing.geo_code,
      rank: 1
    });
    const source = [
      makeSourceOwner(housing.geo_code, housing.local_id, newOwner.idpersonne!, 1)
    ];
    const enriched: EnrichedSourceHousingOwners = {
      source,
      existing: {
        housing,
        owners: [existingOwner as any, newOwner as any],
        existingHousingOwners: [existingHousingOwner]
      }
    };

    it('should archive the old owner with PREVIOUS_OWNER_RANK', () => {
      const changes = transform(enriched);
      const ownerChange = changes.find(
        (c): c is HousingOwnersChange => c.type === 'housingOwners'
      )!;
      const archivedOwner = ownerChange.value.find(
        (ho) => ho.owner_id === existingOwner.id
      );
      expect(archivedOwner).toBeDefined();
      expect(isPreviousOwnerRank(archivedOwner!.rank)).toBe(true);
      expect(archivedOwner!.end_date).toBeDefined();
    });

    it('should produce an owner-attached event for the new owner', () => {
      const changes = transform(enriched);
      const eventChange = changes.find(
        (c) =>
          c.type === 'event' &&
          (c.value as any).type === 'housing:owner-attached'
      );
      expect(eventChange).toBeDefined();
    });

    it('should produce an owner-detached event for the removed owner', () => {
      const changes = transform(enriched);
      const eventChange = changes.find(
        (c) =>
          c.type === 'event' &&
          (c.value as any).type === 'housing:owner-detached'
      );
      expect(eventChange).toBeDefined();
    });
  });
});
```

- [ ] **Step 8.2: Run test to verify it fails**

```bash
yarn nx test server -- source-housing-owner-transform
```

Expected: `Cannot find module '../source-housing-owner-transform'`

---

## Task 9: Source housing-owner transform — implementation

**Files:**
- Create: `server/src/scripts/import-lovac/source-housing-owners/source-housing-owner-transform.ts`
- Delete: `server/src/scripts/import-lovac/source-housing-owners/source-housing-owner-processor.ts`
- Delete: `server/src/scripts/import-lovac/source-housing-owners/test/source-housing-owner-processor.test.ts`

- [ ] **Step 9.1: Implement the transform**

```typescript
// server/src/scripts/import-lovac/source-housing-owners/source-housing-owner-transform.ts
import {
  isActiveOwnerRank,
  isInactiveOwnerRank,
  PREVIOUS_OWNER_RANK
} from '@zerologementvacant/models';
import fp from 'lodash/fp';
import { v5 as uuidv5 } from 'uuid';
import HousingMissingError from '~/errors/housingMissingError';
import OwnerMissingError from '~/errors/ownerMissingError';
import { HousingOwnerEventApi } from '~/models/EventApi';
import {
  HousingOwnerDBO
} from '~/repositories/housingOwnerRepository';
import { OwnerDBO } from '~/repositories/ownerRepository';
import {
  LOVAC_NAMESPACE,
  ReporterError,
  ReporterOptions
} from '~/scripts/import-lovac/infra';
import { EnrichedSourceHousingOwners } from './source-housing-owner-enricher';
import { SourceHousingOwner } from './source-housing-owner';

export type HousingOwnersChange = {
  type: 'housingOwners';
  kind: 'replace';
  value: ReadonlyArray<HousingOwnerDBO>;
};

export type HousingEventChange = {
  type: 'event';
  kind: 'create';
  value: HousingOwnerEventApi;
};

export type HousingOwnerChange = HousingOwnersChange | HousingEventChange;

interface TransformOptions extends ReporterOptions<SourceHousingOwner> {
  adminUserId: string;
  year: string;
}

export function createHousingOwnerTransform(options: TransformOptions) {
  const { abortEarly, reporter, adminUserId, year } = options;

  return function transform(
    enriched: EnrichedSourceHousingOwners
  ): HousingOwnerChange[] {
    const { source, existing } = enriched;
    try {
      if (!existing.housing) {
        throw new HousingMissingError(source[0]?.local_id ?? 'unknown');
      }

      const missingOwners = source.filter(
        (s) =>
          !existing.owners.some((o) => o.idpersonne === s.idpersonne)
      );
      if (missingOwners.length > 0) {
        throw new OwnerMissingError(
          ...missingOwners.map((o) => o.idpersonne)
        );
      }

      const housing = existing.housing;

      const existingActive = existing.existingHousingOwners.filter((ho) =>
        isActiveOwnerRank(ho.rank)
      );
      const existingInactive = existing.existingHousingOwners.filter((ho) =>
        isInactiveOwnerRank(ho.rank)
      );

      const activeOwners: HousingOwnerDBO[] = source.map(
        (sourceOwner): HousingOwnerDBO => {
          const owner = existing.owners.find(
            (o) => o.idpersonne === sourceOwner.idpersonne
          ) as OwnerDBO;
          return {
            owner_id: owner.id,
            housing_id: housing.id,
            housing_geo_code: housing.geo_code,
            idprocpte: sourceOwner.idprocpte,
            idprodroit: sourceOwner.idprodroit,
            rank: sourceOwner.rank,
            locprop_source: String(sourceOwner.locprop_source),
            locprop_relative_ban: null,
            locprop_distance_ban: null,
            property_right: sourceOwner.property_right,
            start_date: new Date(),
            end_date: null,
            origin: null
          };
        }
      );

      const removedActive = fp.differenceBy(
        'owner_id',
        existingActive,
        activeOwners
      ) as HousingOwnerDBO[];
      const inactiveOwners: HousingOwnerDBO[] = [
        ...removedActive.map((ho) => ({
          ...ho,
          rank: PREVIOUS_OWNER_RANK,
          end_date: new Date()
        })),
        ...fp.differenceBy('owner_id', existingInactive, activeOwners)
      ];

      const allOwners: ReadonlyArray<HousingOwnerDBO> = [
        ...activeOwners,
        ...inactiveOwners
      ];

      function ownerName(ownerId: string): string {
        return (
          existing.owners.find((o) => o.id === ownerId)?.full_name ?? ''
        );
      }

      const added = fp.differenceBy('owner_id', activeOwners, existingActive) as HousingOwnerDBO[];
      const removed = fp.differenceBy('owner_id', existingActive, activeOwners) as HousingOwnerDBO[];
      const updated = fp.intersectionBy('owner_id', existingActive, activeOwners).filter(
        (existingHo: HousingOwnerDBO) => {
          const newHo = activeOwners.find(
            (ho) => ho.owner_id === existingHo.owner_id
          );
          return newHo && newHo.rank !== existingHo.rank;
        }
      ) as HousingOwnerDBO[];

      const events: HousingOwnerEventApi[] = [
        ...added.map(
          (ho): HousingOwnerEventApi => ({
            id: uuidv5(
              ho.housing_id + ':housing:owner-attached:' + ho.owner_id + ':' + year,
              LOVAC_NAMESPACE
            ),
            type: 'housing:owner-attached',
            nextOld: null,
            nextNew: { name: ownerName(ho.owner_id), rank: ho.rank },
            createdAt: new Date().toJSON(),
            createdBy: adminUserId,
            ownerId: ho.owner_id,
            housingGeoCode: ho.housing_geo_code,
            housingId: ho.housing_id
          })
        ),
        ...removed.map(
          (ho): HousingOwnerEventApi => ({
            id: uuidv5(
              ho.housing_id + ':housing:owner-detached:' + ho.owner_id + ':' + year,
              LOVAC_NAMESPACE
            ),
            type: 'housing:owner-detached',
            nextOld: { name: ownerName(ho.owner_id), rank: ho.rank },
            nextNew: null,
            createdAt: new Date().toJSON(),
            createdBy: adminUserId,
            ownerId: ho.owner_id,
            housingGeoCode: ho.housing_geo_code,
            housingId: ho.housing_id
          })
        ),
        ...updated.map(
          (ho): HousingOwnerEventApi => {
            const newHo = activeOwners.find(
              (a) => a.owner_id === ho.owner_id
            )!;
            return {
              id: uuidv5(
                ho.housing_id + ':housing:owner-updated:' + ho.owner_id + ':' + year,
                LOVAC_NAMESPACE
              ),
              type: 'housing:owner-updated',
              nextOld: { name: ownerName(ho.owner_id), rank: ho.rank },
              nextNew: { name: ownerName(newHo.owner_id), rank: newHo.rank },
              createdAt: new Date().toJSON(),
              createdBy: adminUserId,
              ownerId: ho.owner_id,
              housingGeoCode: ho.housing_geo_code,
              housingId: ho.housing_id
            };
          }
        )
      ];

      source.forEach((s) => reporter.passed(s));

      return [
        { type: 'housingOwners', kind: 'replace', value: allOwners },
        ...events.map(
          (event): HousingEventChange => ({
            type: 'event',
            kind: 'create',
            value: event
          })
        )
      ];
    } catch (error) {
      source.forEach((s) =>
        reporter.failed(
          s,
          new ReporterError((error as Error).message, s)
        )
      );
      if (abortEarly) throw error;
      return [];
    }
  };
}
```

- [ ] **Step 9.2: Run tests to verify they pass**

```bash
yarn nx test server -- source-housing-owner-transform
```

Expected: all tests PASS

- [ ] **Step 9.3: Delete processor and its test**

```bash
git rm server/src/scripts/import-lovac/source-housing-owners/source-housing-owner-processor.ts \
       server/src/scripts/import-lovac/source-housing-owners/test/source-housing-owner-processor.test.ts
```

- [ ] **Step 9.4: Commit**

```bash
git add server/src/scripts/import-lovac/source-housing-owners/source-housing-owner-transform.ts \
        server/src/scripts/import-lovac/source-housing-owners/test/source-housing-owner-transform.test.ts
git commit -m "feat(server): add source-housing-owner transform, delete processor"
```

---

## Task 10: Wire source housing-owner command + fix test

**Files:**
- Modify: `server/src/scripts/import-lovac/source-housing-owners/source-housing-owner-command.ts`
- Modify: `server/src/scripts/import-lovac/source-housing-owners/test/source-housing-owner-command.test.ts`

- [ ] **Step 10.1: Rewrite the command**

Replace the full content of `source-housing-owner-command.ts`:

```typescript
// server/src/scripts/import-lovac/source-housing-owners/source-housing-owner-command.ts
import {
  chunkify,
  count,
  createS3,
  filter,
  flatten,
  groupBy,
  map
} from '@zerologementvacant/utils/node';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { match } from 'ts-pattern';
import { WritableStream } from 'node:stream/web';
import { writeFileSync } from 'node:fs';
import db from '~/infra/database';
import config from '~/infra/config';
import { createLogger } from '~/infra/logger';
import { HousingOwners } from '~/repositories/housingOwnerRepository';
import eventRepository from '~/repositories/eventRepository';
import userRepository from '~/repositories/userRepository';
import UserMissingError from '~/errors/userMissingError';
import { createLoggerReporter } from '~/scripts/import-lovac/infra';
import { Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';
import { FromOptionValue } from '~/scripts/import-lovac/infra/options/from';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import validator from '~/scripts/import-lovac/infra/validator';
import {
  SourceHousingOwner,
  sourceHousingOwnerSchema
} from './source-housing-owner';
import { createSourceHousingOwnerEnricher } from './source-housing-owner-enricher';
import {
  createHousingOwnerTransform,
  HousingEventChange,
  HousingOwnersChange
} from './source-housing-owner-transform';
import { createSourceHousingOwnerRepository } from './source-housing-owner-repository';

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
      logger.debug('Starting source housing owner command...', { file, options });

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
        }).stream({ departments: options.departments })
      );

      logger.info('Starting import...', { file });
      const [housingOwnerStream, eventStream] =
        createSourceHousingOwnerRepository({
          ...config.s3,
          file,
          from: options.from
        })
          .stream({ departments: options.departments })
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
                year: options.year,
                reporter
              })
            )
          )
          .pipeThrough(flatten())
          .tee();

      await Promise.all([
        // Update housing owners
        housingOwnerStream
          .pipeThrough(
            filter(
              (change): change is HousingOwnersChange =>
                change.type === 'housingOwners' && change.kind === 'replace'
            )
          )
          .pipeThrough(map((change) => change.value))
          .pipeTo(
            new WritableStream({
              async write(housingOwners) {
                if (!options.dryRun && housingOwners.length > 0) {
                  const { housing_id, housing_geo_code } = housingOwners[0];
                  await db.transaction(async (trx) => {
                    await HousingOwners(trx)
                      .where({ housing_geo_code, housing_id })
                      .delete();
                    await HousingOwners(trx).insert(housingOwners);
                  });
                }
              }
            })
          ),

        // Save events
        eventStream
          .pipeThrough(
            filter(
              (change): change is HousingEventChange =>
                change.type === 'event' && change.kind === 'create'
            )
          )
          .pipeThrough(map((change) => change.value))
          .pipeThrough(chunkify({ size: 1_000 }))
          .pipeTo(
            new WritableStream({
              async write(events) {
                if (!options.dryRun) {
                  await eventRepository.insertManyHousingEvents(events);
                }
              }
            })
          )
      ]);

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

- [ ] **Step 10.2: Fix the housing-owner command test**

In `test/source-housing-owner-command.test.ts`:

1. Add the missing import at the top:
```typescript
import { rm } from 'node:fs/promises';
```

2. Extract the inline write into a `write()` helper at the bottom of the file (after the describe block):
```typescript
async function write(
  file: string,
  sourceHousingOwners: ReadonlyArray<SourceHousingOwner>
): Promise<void> {
  await new ReadableStream<SourceHousingOwner>({
    start(controller) {
      sourceHousingOwners.forEach((s) => controller.enqueue(s));
      controller.close();
    }
  })
    .pipeThrough(Transform.toWeb(writeJSONL()))
    .pipeTo(Writable.toWeb(fs.createWriteStream(file)));
}
```

3. Replace the inline write in `beforeAll` with the helper call:
```typescript
  // Write the file and run
  beforeAll(async () => {
    await write(file, sourceHousingOwners);
    await command(file, {
      abortEarly: false,
      dryRun: false,
      from: 'file',
      year: 'lovac-2025'
    });
  });
```

4. Add `afterAll` cleanup:
```typescript
  afterAll(async () => {
    await rm(file);
  });
```

- [ ] **Step 10.3: Run all housing-owner tests**

```bash
yarn nx test server -- source-housing-owner
```

Expected: all tests PASS (including the existing command integration test)

- [ ] **Step 10.4: Commit**

```bash
git add server/src/scripts/import-lovac/source-housing-owners/source-housing-owner-command.ts \
        server/src/scripts/import-lovac/source-housing-owners/test/source-housing-owner-command.test.ts
git commit -m "feat(server): wire EETL pipeline and writeReport in source-housing-owner command"
```

---

## Task 11: Final verification

- [ ] **Step 11.1: Run the full server test suite**

```bash
yarn nx test server
```

Expected: all tests PASS, no regressions

- [ ] **Step 11.2: Verify no HousingApi imports remain in the modified pipelines**

```bash
grep -r "HousingApi" \
  server/src/scripts/import-lovac/source-housings/ \
  server/src/scripts/import-lovac/source-housing-owners/
```

Expected: no output (zero matches)

- [ ] **Step 11.3: Commit verification**

If any failing test or HousingApi reference is found, fix it before committing.

```bash
git add -p
git commit -m "chore(server): final cleanup after EETL refactor"
```
