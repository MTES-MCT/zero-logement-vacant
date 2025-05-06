import { faker } from '@faker-js/faker/locale/fr';
import {
  ACTIVE_OWNER_RANKS,
  ActiveOwnerRank,
  isActiveOwnerRank,
  isPreviousOwnerRank,
  OwnerRank
} from '@zerologementvacant/models';
import { stringify as writeJSONL } from 'jsonlines';
import fs from 'node:fs';
import path from 'node:path';
import { Transform, Writable } from 'node:stream';
import { ReadableStream } from 'node:stream/web';

import config from '~/infra/config';
import { HousingApi } from '~/models/HousingApi';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { OwnerApi } from '~/models/OwnerApi';
import { UserApi } from '~/models/UserApi';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  EventDBO,
  eventsTable,
  HousingEventDBO,
  HousingEvents,
  housingEventsTable
} from '~/repositories/eventRepository';
import {
  formatHousingOwnerApi,
  HousingOwnerDBO,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import {
  formatHousingRecordApi,
  Housing,
  HousingRecordDBO
} from '~/repositories/housingRepository';
import {
  formatOwnerApi,
  OwnerRecordDBO,
  Owners
} from '~/repositories/ownerRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import { SourceHousingOwner } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner';
import { createSourceHousingOwnerCommand } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-command';
import {
  genEstablishmentApi,
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi,
  genUserApi
} from '~/test/testFixtures';

describe('Source housing owner command', () => {
  const command = createSourceHousingOwnerCommand();
  const file = path.join(__dirname, 'housing-owners.jsonl');

  const missingOwnersHousing = genHousingApi();
  const missingOwnersHousingOwners: ReadonlyArray<HousingOwnerApi> =
    ACTIVE_OWNER_RANKS.slice(
      0,
      faker.number.int({ min: 0, max: ACTIVE_OWNER_RANKS.length - 1 })
    ).map((rank) => ({
      ...genHousingOwnerApi(missingOwnersHousing, genOwnerApi()),
      rank
    }));

  const missingHousing = genHousingApi();
  const missingHousingOwners: ReadonlyArray<OwnerApi> = faker.helpers.multiple(
    () => genOwnerApi(),
    {
      count: { min: 1, max: 6 }
    }
  );
  const missingHousingHousingOwners: ReadonlyArray<HousingOwnerApi> =
    missingHousingOwners.map((owner, i) => ({
      ...genHousingOwnerApi(missingHousing, owner),
      rank: (i + 1) as ActiveOwnerRank
    }));

  const newHousing = genHousingApi();
  const newOwner = genOwnerApi();
  const newHousingOwners: ReadonlyArray<HousingOwnerApi> = [
    { ...genHousingOwnerApi(newHousing, newOwner), rank: 1 }
  ];

  const existingHousing = genHousingApi();
  const existingOwners = faker.helpers.multiple(genOwnerApi, {
    count: { min: 1, max: 6 }
  });
  const existingHousingOwners = existingOwners.map((owner, i) => ({
    ...genHousingOwnerApi(existingHousing, owner),
    rank: (i + 1) as ActiveOwnerRank
  }));
  const replacingOwners = faker.helpers.multiple(genOwnerApi, {
    count: { min: 1, max: 6 }
  });
  const replacingHousingOwners = replacingOwners.map((owner, i) => ({
    ...genHousingOwnerApi(existingHousing, owner),
    rank: (i + 1) as ActiveOwnerRank
  }));

  const sourceHousingOwners: ReadonlyArray<SourceHousingOwner> = [
    ...missingOwnersHousingOwners.map((housingOwner) =>
      toSourceHousingOwner(housingOwner, missingOwnersHousing)
    ),
    ...missingHousingHousingOwners.map((housingOwner) =>
      toSourceHousingOwner(housingOwner, missingHousing)
    ),
    ...newHousingOwners.map((housingOwner) =>
      toSourceHousingOwner(housingOwner, newHousing)
    ),
    ...replacingHousingOwners.map((housingOwner) =>
      toSourceHousingOwner(housingOwner, existingHousing)
    )
  ];

  // Seed the database
  beforeAll(async () => {
    const owners: ReadonlyArray<OwnerRecordDBO> = [
      ...missingHousingOwners,
      newOwner,
      ...existingOwners,
      ...replacingOwners
    ].map(formatOwnerApi);
    await Owners().insert(owners);

    const housings: ReadonlyArray<HousingRecordDBO> = [
      missingOwnersHousing,
      newHousing,
      existingHousing
    ].map(formatHousingRecordApi);
    await Housing().insert(housings);

    const housingOwners: ReadonlyArray<HousingOwnerDBO> = [
      ...existingHousingOwners
    ].map(formatHousingOwnerApi);
    await HousingOwners().insert(housingOwners);

    const establishment = genEstablishmentApi();
    await Establishments().insert(formatEstablishmentApi(establishment));

    const auth: UserApi = {
      ...genUserApi(establishment.id),
      email: config.app.system
    };
    await Users().insert([auth].map(formatUserApi));
  });

  // Write the file and run
  beforeAll(async () => {
    await new ReadableStream<SourceHousingOwner>({
      start(controller) {
        sourceHousingOwners.forEach((sourceHousingOwner) => {
          controller.enqueue(sourceHousingOwner);
        });
        controller.close();
      }
    })
      .pipeThrough(Transform.toWeb(writeJSONL()))
      .pipeTo(Writable.toWeb(fs.createWriteStream(file)));
    await command(file, {
      abortEarly: false,
      dryRun: false,
      from: 'file'
    });
  });

  describe('Present in LOVAC 2025, missing owners', () => {
    it('should fail to add housing owners', async () => {
      const actual = await HousingOwners().where({
        housing_geo_code: missingOwnersHousing.geoCode,
        housing_id: missingOwnersHousing.id
      });
      expect(actual).toStrictEqual([]);
    });
  });

  describe('Present in LOVAC 2025, missing housing', () => {
    it('should fail to add housing owners', async () => {
      const actual = await HousingOwners().where({
        housing_geo_code: missingHousing.geoCode,
        housing_id: missingHousing.id
      });
      expect(actual).toStrictEqual([]);
    });
  });

  describe('Present in LOVAC 2025, new housing owners', () => {
    it('should create housing owners', async () => {
      const actual = await HousingOwners().where({
        housing_geo_code: newHousing.geoCode,
        housing_id: newHousing.id
      });
      expect(actual).toHaveLength(newHousingOwners.length);
      actual.forEach((actualHousingOwner) => {
        const housingOwnerBefore = newHousingOwners.find(
          (housingOwner) => housingOwner.ownerId === actualHousingOwner.owner_id
        );
        expect(actualHousingOwner).toMatchObject<Partial<HousingOwnerDBO>>({
          housing_geo_code: newHousing.geoCode,
          housing_id: newHousing.id,
          owner_id: housingOwnerBefore?.ownerId,
          rank: housingOwnerBefore?.rank,
          idprocpte: housingOwnerBefore?.idprocpte,
          idprodroit: housingOwnerBefore?.idprodroit,
          locprop_source: String(housingOwnerBefore?.locprop),
          start_date: expect.any(Date),
          end_date: null
        });
      });
    });
  });

  describe('Present in LOVAC 2025, replace existing housing owners', () => {
    it('should replace the active housing owners', async () => {
      const actual = await HousingOwners()
        .where({
          housing_geo_code: existingHousing.geoCode,
          housing_id: existingHousing.id
        })
        .whereIn('rank', ACTIVE_OWNER_RANKS);
      expect(actual).toHaveLength(replacingHousingOwners.length);
      actual.forEach((actualHousingOwner) => {
        const replacingHousingOwner = replacingHousingOwners.find(
          (housingOwner) => housingOwner.ownerId === actualHousingOwner.owner_id
        );
        expect(actualHousingOwner).toMatchObject<Partial<HousingOwnerDBO>>({
          housing_geo_code: existingHousing.geoCode,
          housing_id: existingHousing.id,
          owner_id: replacingHousingOwner?.ownerId,
          rank: replacingHousingOwner?.rank,
          idprocpte: replacingHousingOwner?.idprocpte,
          idprodroit: replacingHousingOwner?.idprodroit,
          locprop_source: String(replacingHousingOwner?.locprop),
          start_date: expect.any(Date),
          end_date: null
        });
      });
    });

    it('should archive the active housing owners', async () => {
      const actual = await HousingOwners()
        .where({
          housing_geo_code: existingHousing.geoCode,
          housing_id: existingHousing.id
        })
        .whereIn(
          'owner_id',
          existingHousingOwners.map((housingOwner) => housingOwner.ownerId)
        );
      expect(actual).toHaveLength(existingHousingOwners.length);
      expect(actual).toSatisfyAll<HousingOwnerDBO>((housingOwner) => {
        return isPreviousOwnerRank(housingOwner.rank as OwnerRank);
      });
    });

    it('should create an event "Changement de propriétaires"', async () => {
      const actual = await HousingEvents()
        .where({
          housing_geo_code: existingHousing.geoCode,
          housing_id: existingHousing.id
        })
        .join(
          eventsTable,
          `${eventsTable}.id`,
          `${housingEventsTable}.event_id`
        );
      expect(actual).toPartiallyContain<
        Partial<EventDBO<any> & HousingEventDBO>
      >({
        housing_geo_code: existingHousing.geoCode,
        housing_id: existingHousing.id,
        name: 'Changement de propriétaires'
      });
    });
  });

  function toSourceHousingOwner(
    housingOwner: HousingOwnerApi,
    housing: HousingApi
  ): SourceHousingOwner {
    if (!isActiveOwnerRank(housingOwner.rank)) {
      throw new Error(
        'The owner must be active i.e. the rank must be in [1, 6]'
      );
    }

    return {
      idpersonne: housingOwner.idpersonne as string,
      idprocpte: housingOwner.idprocpte as string,
      idprodroit: housingOwner.idprodroit as string,
      rank: housingOwner.rank,
      geo_code: housing.geoCode,
      local_id: housing.localId,
      locprop_source: housingOwner.locprop as number
    };
  }
});
