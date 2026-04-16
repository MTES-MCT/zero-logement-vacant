import { ActiveOwnerRank } from '@zerologementvacant/models';
import { ReadableStream } from 'node:stream/web';

import {
  Events
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
      ...genEventApi({ type: 'housing:owner-attached', creator: user, nextOld: null, nextNew: { name: owner.fullName, rank: 1 } }),
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
