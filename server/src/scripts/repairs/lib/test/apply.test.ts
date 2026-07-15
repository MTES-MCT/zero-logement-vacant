import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { HousingStatus } from '@zerologementvacant/models';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import db from '~/infra/database';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
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
import { toUserDBO, Users } from '~/repositories/userRepository';
import {
  genEstablishmentApi,
  genEventApi,
  genHousingApi,
  genUserApi
} from '~/test/testFixtures';

import { apply } from '../apply';
import type { PlanRow } from '../types';

let outDir: string;

const establishment = genEstablishmentApi();
const creator = genUserApi(establishment.id);

beforeAll(async () => {
  await Establishments().insert(formatEstablishmentApi(establishment));
  await Users().insert(toUserDBO(creator));
});

beforeEach(() => {
  outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zlv-apply-'));
});

function writePlan(rows: PlanRow[]): string {
  const planFile = path.join(outDir, 'plan.jsonl');
  fs.writeFileSync(
    planFile,
    rows.map((r) => JSON.stringify(r)).join('\n') +
      (rows.length > 0 ? '\n' : '')
  );
  return planFile;
}

describe('apply()', () => {
  it('updates housing fields from plan rows', async () => {
    const housing = genHousingApi();
    await Housing().insert(
      formatHousingRecordApi({
        ...housing,
        status: HousingStatus.WAITING,
        subStatus: 'En attente de réponse'
      })
    );

    const planFile = writePlan([
      {
        housingId: housing.id,
        housingGeoCode: housing.geoCode,
        update: { status: HousingStatus.NEVER_CONTACTED, subStatus: null }
      }
    ]);

    const summary = await apply(planFile);

    expect(summary.updated).toBe(1);
    const [row] = await Housing().where({ id: housing.id });
    expect(row.status).toBe(HousingStatus.NEVER_CONTACTED);
    expect(row.sub_status).toBeNull();
  });

  it('hard-deletes event ids listed in plan rows', async () => {
    const housing = genHousingApi();
    await Housing().insert(formatHousingRecordApi(housing));

    const event = genEventApi({
      creator,
      type: 'housing:status-updated',
      nextOld: { status: 'never-contacted' },
      nextNew: { status: 'blocked' }
    });
    const eventId = event.id;
    await Events().insert(formatEventApi(event));
    await HousingEvents().insert(
      formatHousingEventApi({
        ...event,
        housingGeoCode: housing.geoCode,
        housingId: housing.id
      })
    );

    const planFile = writePlan([
      {
        housingId: housing.id,
        housingGeoCode: housing.geoCode,
        deleteEventIds: [eventId]
      }
    ]);

    const summary = await apply(planFile);

    expect(summary.eventsDeleted).toBe(1);
    expect(await Events().where('id', eventId)).toHaveLength(0);
    expect(await HousingEvents().where('event_id', eventId)).toHaveLength(0);
  });

  it('returns correct summary', async () => {
    const h1 = genHousingApi();
    const h2 = genHousingApi();
    await Housing().insert([
      formatHousingRecordApi(h1),
      formatHousingRecordApi(h2)
    ]);

    const planFile = writePlan([
      {
        housingId: h1.id,
        housingGeoCode: h1.geoCode,
        update: { status: HousingStatus.NEVER_CONTACTED }
      },
      {
        housingId: h2.id,
        housingGeoCode: h2.geoCode,
        update: { status: HousingStatus.NEVER_CONTACTED }
      }
    ]);

    const summary = await apply(planFile);

    expect(summary).toEqual({ updated: 2, eventsDeleted: 0, eventsCreated: 0 });
  });

  it('does nothing for an empty plan file', async () => {
    const planFile = writePlan([]);
    const summary = await apply(planFile);
    expect(summary).toEqual({ updated: 0, eventsDeleted: 0, eventsCreated: 0 });
  });

  it('inserts createEvents into events and housing_events tables', async () => {
    const housing = genHousingApi();
    await Housing().insert(formatHousingRecordApi(housing));

    const event = genEventApi({
      creator,
      type: 'housing:status-updated',
      nextOld: { status: 'never-contacted' },
      nextNew: { status: 'waiting' }
    });
    const housingEvent = {
      ...event,
      housingGeoCode: housing.geoCode,
      housingId: housing.id
    };

    const planFile = writePlan([
      {
        housingId: housing.id,
        housingGeoCode: housing.geoCode,
        createEvents: [housingEvent]
      }
    ]);

    const summary = await apply(planFile);

    expect(summary.eventsCreated).toBe(1);
    expect(await Events().where('id', event.id)).toHaveLength(1);
    expect(await HousingEvents().where('event_id', event.id)).toHaveLength(1);
  });

  it('applies with bypassTriggers and re-enables triggers afterwards', async () => {
    const housing = genHousingApi();
    await Housing().insert(
      formatHousingRecordApi({ ...housing, status: HousingStatus.WAITING })
    );

    const planFile = writePlan([
      {
        housingId: housing.id,
        housingGeoCode: housing.geoCode,
        update: { status: HousingStatus.NEVER_CONTACTED }
      }
    ]);

    const summary = await apply(planFile, { bypassTriggers: true });

    expect(summary.updated).toBe(1);
    const [row] = await Housing().where({ id: housing.id });
    expect(row.status).toBe(HousingStatus.NEVER_CONTACTED);

    // The commit must leave the triggers enabled (tgenabled 'O' = enabled).
    const { rows } = await db.raw(
      `SELECT tgenabled FROM pg_trigger
       WHERE tgrelid = 'fast_housing'::regclass
         AND tgname = 'trg_recompute_return_count_on_housing_status_change'`
    );
    expect(rows[0].tgenabled).toBe('O');
  });

  it('rolls back and re-enables triggers when the bypass transaction fails', async () => {
    const housing = genHousingApi();
    await Housing().insert(
      formatHousingRecordApi({ ...housing, status: HousingStatus.WAITING })
    );

    // A housing event pointing at a housing that does not exist violates the
    // housing_events -> fast_housing FK, so the transaction aborts *after* the
    // triggers were disabled inside it.
    const ghost = genHousingApi();
    const event = genEventApi({
      creator,
      type: 'housing:status-updated',
      nextOld: { status: 'waiting' },
      nextNew: { status: 'never-contacted' }
    });

    const planFile = writePlan([
      {
        housingId: housing.id,
        housingGeoCode: housing.geoCode,
        update: { status: HousingStatus.NEVER_CONTACTED },
        createEvents: [
          { ...event, housingGeoCode: ghost.geoCode, housingId: ghost.id }
        ]
      }
    ]);

    await expect(apply(planFile, { bypassTriggers: true })).rejects.toThrow();

    // Rollback must have restored the triggers...
    const { rows } = await db.raw(
      `SELECT tgenabled FROM pg_trigger
       WHERE tgrelid = 'fast_housing'::regclass
         AND tgname = 'trg_recompute_return_count_on_housing_status_change'`
    );
    expect(rows[0].tgenabled).toBe('O');

    // ...and reverted the status update.
    const [row] = await Housing().where({ id: housing.id });
    expect(row.status).toBe(HousingStatus.WAITING);
  });

  it('counts only rows the update actually matched', async () => {
    const existing = genHousingApi();
    await Housing().insert(
      formatHousingRecordApi({ ...existing, status: HousingStatus.WAITING })
    );
    const missing = genHousingApi(); // never inserted

    const planFile = writePlan([
      {
        housingId: existing.id,
        housingGeoCode: existing.geoCode,
        update: { status: HousingStatus.NEVER_CONTACTED }
      },
      {
        housingId: missing.id,
        housingGeoCode: missing.geoCode,
        update: { status: HousingStatus.NEVER_CONTACTED }
      }
    ]);

    const summary = await apply(planFile);

    // Only the row that exists was matched, not both planned rows.
    expect(summary.updated).toBe(1);
  });

  it('counts only events actually deleted', async () => {
    const housing = genHousingApi();
    await Housing().insert(formatHousingRecordApi(housing));

    const planFile = writePlan([
      {
        housingId: housing.id,
        housingGeoCode: housing.geoCode,
        deleteEventIds: ['00000000-0000-0000-0000-000000000000']
      }
    ]);

    const summary = await apply(planFile);

    expect(summary.eventsDeleted).toBe(0);
  });

  it('counts only events actually inserted (re-apply is a no-op)', async () => {
    const housing = genHousingApi();
    await Housing().insert(formatHousingRecordApi(housing));
    const event = genEventApi({
      creator,
      type: 'housing:status-updated',
      nextOld: { status: 'never-contacted' },
      nextNew: { status: 'waiting' }
    });
    const housingEvent = {
      ...event,
      housingGeoCode: housing.geoCode,
      housingId: housing.id
    };
    const planFile = writePlan([
      {
        housingId: housing.id,
        housingGeoCode: housing.geoCode,
        createEvents: [housingEvent]
      }
    ]);

    const first = await apply(planFile);
    expect(first.eventsCreated).toBe(1);

    // Re-applying the same plan inserts nothing (onConflict ignore).
    const second = await apply(planFile);
    expect(second.eventsCreated).toBe(0);
  });
});
