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
      createExistingHousingLoader({ dryRun: false, reporter }).stream
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
      createExistingHousingLoader({ dryRun: false, reporter }).stream
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
      createExistingHousingLoader({ dryRun: true, reporter }).stream
    );

    const actual = await Housing()
      .where({ id: housing.id, geo_code: housing.geoCode })
      .first();
    expect(actual?.occupancy).toBe(housing.occupancy); // unchanged
  });
});
