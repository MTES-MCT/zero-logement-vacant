import { faker } from '@faker-js/faker/locale/fr';
import {
  ACTIVE_OWNER_RANKS,
  ActiveOwnerRank,
  isActiveOwnerRank,
  isPreviousOwnerRank,
  OwnerRank,
  PREVIOUS_OWNER_RANK
} from '@zerologementvacant/models';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { HousingApi } from '~/models/HousingApi';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { OwnerApi } from '~/models/OwnerApi';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  EventDBO,
  EVENTS_TABLE,
  HOUSING_OWNER_EVENTS_TABLE,
  HousingOwnerEventDBO,
  HousingOwnerEvents
} from '~/repositories/eventRepository';
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
  OwnerRecordDBO,
  Owners
} from '~/repositories/ownerRepository';
import { SourceHousingOwner } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner';
import { createSourceHousingOwnerCommand } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-command';
import {
  genEstablishmentApi,
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi
} from '~/test/testFixtures';

describe('Source housing owner command', () => {
  function genValidOwnerApi() {
    return {
      ...genOwnerApi(),
      idpersonne:
        faker.string.numeric(2) +
        faker.string.alphanumeric({ length: 6, casing: 'upper' })
    };
  }

  const command = createSourceHousingOwnerCommand();
  const deptsDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'zlv-housing-owners-test-')
  );

  const missingOwnersHousing = genHousingApi();
  const missingOwnersHousingOwners: ReadonlyArray<HousingOwnerApi> =
    ACTIVE_OWNER_RANKS.slice(
      0,
      faker.number.int({ min: 1, max: ACTIVE_OWNER_RANKS.length - 1 })
    ).map((rank) => ({
      ...genHousingOwnerApi(missingOwnersHousing, genValidOwnerApi()),
      rank
    }));

  const missingHousing = genHousingApi();
  const missingHousingOwners: ReadonlyArray<OwnerApi> = faker.helpers.multiple(
    () => genValidOwnerApi(),
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
  const newOwner = genValidOwnerApi();
  const newHousingOwners: ReadonlyArray<HousingOwnerApi> = [
    { ...genHousingOwnerApi(newHousing, newOwner), rank: 1 }
  ];

  const existingHousing = genHousingApi();
  const existingOwners = faker.helpers.multiple(genValidOwnerApi, {
    count: { min: 1, max: 6 }
  });
  const existingHousingOwners = existingOwners.map((owner, i) => ({
    ...genHousingOwnerApi(existingHousing, owner),
    rank: (i + 1) as ActiveOwnerRank
  }));
  const replacingOwners = faker.helpers.multiple(genValidOwnerApi, {
    count: { min: 1, max: 6 }
  });
  const replacingHousingOwners = replacingOwners.map((owner, i) => ({
    ...genHousingOwnerApi(existingHousing, owner),
    rank: (i + 1) as ActiveOwnerRank
  }));

  // Rank change scenario: same owner reappears at a different rank
  const rankChangeHousing = genHousingApi();
  const rankChangedOwner = genValidOwnerApi();
  const rankChangedHousingOwner: HousingOwnerApi = {
    ...genHousingOwnerApi(rankChangeHousing, rankChangedOwner),
    rank: 1 as ActiveOwnerRank
  };

  // Inactive owner preserved scenario: inactive owner stays untouched
  const inactivePreservedHousing = genHousingApi();
  const preservedInactiveOwner = genValidOwnerApi();
  const preservedInactiveHousingOwner: HousingOwnerApi = {
    ...genHousingOwnerApi(inactivePreservedHousing, preservedInactiveOwner),
    rank: PREVIOUS_OWNER_RANK
  };
  const newOwnerForInactiveTest = genValidOwnerApi();
  const newHousingOwnerForInactiveTest: HousingOwnerApi = {
    ...genHousingOwnerApi(inactivePreservedHousing, newOwnerForInactiveTest),
    rank: 1 as ActiveOwnerRank
  };

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
    ),
    // Rank change: same owner at a new rank
    { ...toSourceHousingOwner(rankChangedHousingOwner, rankChangeHousing), rank: 2 as ActiveOwnerRank },
    // Inactive preserved: only the new active owner appears in source
    toSourceHousingOwner(newHousingOwnerForInactiveTest, inactivePreservedHousing)
  ];

  // Seed the database
  beforeAll(async () => {
    const owners: ReadonlyArray<OwnerRecordDBO> = [
      ...missingHousingOwners,
      newOwner,
      ...existingOwners,
      ...replacingOwners,
      rankChangedOwner,
      preservedInactiveOwner,
      newOwnerForInactiveTest
    ].map(formatOwnerApi);
    await Owners().insert(owners);

    const housings = [
      missingOwnersHousing,
      newHousing,
      existingHousing,
      rankChangeHousing,
      inactivePreservedHousing
    ].map(formatHousingRecordApi);
    await Housing().insert(housings);

    const housingOwners: ReadonlyArray<HousingOwnerDBO> = [
      ...existingHousingOwners,
      rankChangedHousingOwner,
      preservedInactiveHousingOwner
    ].map(formatHousingOwnerApi);
    await HousingOwners().insert(housingOwners);

    const establishment = genEstablishmentApi();
    await Establishments().insert(formatEstablishmentApi(establishment));
  });

  afterAll(async () => {
    fs.rmSync(deptsDir, { recursive: true, force: true });
  });

  // Write per-department NDJSON files and run the command against the
  // depts directory (mirrors the parallel-by-department layout produced
  // by prepare-housing-owners.sh).
  beforeAll(async () => {
    const byDept = sourceHousingOwners.reduce<
      Record<string, SourceHousingOwner[]>
    >((acc, sho) => {
      const dept = sho.local_id.substring(0, 2);
      (acc[dept] ??= []).push(sho);
      return acc;
    }, {});
    for (const [dept, rows] of Object.entries(byDept)) {
      const deptDir = path.join(deptsDir, `dept=${dept}`);
      fs.mkdirSync(deptDir, { recursive: true });
      fs.writeFileSync(
        path.join(deptDir, 'data_0.jsonl'),
        rows.map((row) => JSON.stringify(row)).join('\n') + '\n'
      );
    }
    await command(deptsDir, {
      abortEarly: false,
      dryRun: false,
      from: 'file',
      year: 'lovac-2025'
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

    it('should create owner-attached and owner-detached events', async () => {
      const actual = await HousingOwnerEvents()
        .where({
          housing_geo_code: existingHousing.geoCode,
          housing_id: existingHousing.id
        })
        .join(
          EVENTS_TABLE,
          `${EVENTS_TABLE}.id`,
          `${HOUSING_OWNER_EVENTS_TABLE}.event_id`
        );
      expect(actual).toPartiallyContain<
        Partial<EventDBO<any> & HousingOwnerEventDBO>
      >({
        housing_geo_code: existingHousing.geoCode,
        housing_id: existingHousing.id,
        type: 'housing:owner-attached'
      });
      expect(actual).toPartiallyContain<
        Partial<EventDBO<any> & HousingOwnerEventDBO>
      >({
        housing_geo_code: existingHousing.geoCode,
        housing_id: existingHousing.id,
        type: 'housing:owner-detached'
      });
    });
  });

  describe('Present in LOVAC 2025, rank change', () => {
    it('should update the owner rank', async () => {
      const actual = await HousingOwners().where({
        housing_geo_code: rankChangeHousing.geoCode,
        housing_id: rankChangeHousing.id,
        owner_id: rankChangedOwner.id
      });
      expect(actual).toHaveLength(1);
      expect(actual[0].rank).toBe(2);
    });

    it('should create an owner-updated event', async () => {
      const actual = await HousingOwnerEvents()
        .where({
          housing_geo_code: rankChangeHousing.geoCode,
          housing_id: rankChangeHousing.id
        })
        .join(
          EVENTS_TABLE,
          `${EVENTS_TABLE}.id`,
          `${HOUSING_OWNER_EVENTS_TABLE}.event_id`
        );
      expect(actual).toPartiallyContain<
        Partial<EventDBO<any> & HousingOwnerEventDBO>
      >({
        housing_geo_code: rankChangeHousing.geoCode,
        housing_id: rankChangeHousing.id,
        type: 'housing:owner-updated'
      });
    });
  });

  describe('Present in LOVAC 2025, inactive owner', () => {
    it('should preserve the inactive housing owner', async () => {
      const actual = await HousingOwners().where({
        housing_geo_code: inactivePreservedHousing.geoCode,
        housing_id: inactivePreservedHousing.id,
        owner_id: preservedInactiveOwner.id
      });
      expect(actual).toHaveLength(1);
      expect(actual[0].rank).toBe(PREVIOUS_OWNER_RANK);
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
      owner_uid: housingOwner.ownerId,
      idpersonne: housingOwner.idpersonne as string,
      idprocpte: housingOwner.idprocpte as string,
      idprodroit: housingOwner.idprodroit as string,
      rank: housingOwner.rank,
      geo_code: housing.geoCode,
      local_id: housing.localId,
      locprop_source: housingOwner.locprop as number,
      property_right: housingOwner.propertyRight ?? 'autre'
    };
  }
});
