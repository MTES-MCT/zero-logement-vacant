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
  Housing
} from '~/repositories/housingRepository';
import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';
import { createHousingLoader } from '../source-housing-loader';
import {
  AddressChange,
  HousingChange,
  HousingEventChange,
  HousingRecordInsert,
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
    const updated: HousingRecordInsert = {
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
      ...genEventApi({
        type: 'housing:occupancy-updated',
        creator: user,
        nextOld: { occupancy: 'L' },
        nextNew: { occupancy: 'V' }
      }),
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
