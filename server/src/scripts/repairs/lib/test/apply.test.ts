import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { HousingStatus } from '@zerologementvacant/models';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

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
});
