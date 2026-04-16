import { faker } from '@faker-js/faker/locale/fr';
import {
  HousingStatus,
  Occupancy
} from '@zerologementvacant/models';

import { HousingApi } from '~/models/HousingApi';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  EVENTS_TABLE,
  Events,
  HOUSING_EVENTS_TABLE
} from '~/repositories/eventRepository';
import {
  formatHousingRecordApi,
  Housing,
  HousingRecordDBO
} from '~/repositories/housingRepository';
import { createExistingHousingCommand } from '~/scripts/import-lovac/housings/housing-command';
import {
  genEstablishmentApi,
  genHousingApi
} from '~/test/testFixtures';

// Use a unique department prefix to avoid processing housings from other parallel tests.
const TEST_DEPARTMENT = '01';
const testGeoCode = () =>
  TEST_DEPARTMENT + faker.string.numeric({ length: 3 });

describe('Existing housing command', () => {
  const command = createExistingHousingCommand();

  // Vacant housings missing from current LOVAC, with no supervision: should be reset
  const vacantUnsupervisedHousings: ReadonlyArray<HousingApi> =
    faker.helpers.multiple(
      () => ({
        ...genHousingApi(testGeoCode()),
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
          ...genHousingApi(testGeoCode()),
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
      ...genHousingApi(testGeoCode()),
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
      year: 'lovac-2025',
      departments: [TEST_DEPARTMENT]
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
