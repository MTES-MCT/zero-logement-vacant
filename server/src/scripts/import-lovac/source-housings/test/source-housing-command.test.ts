import { faker } from '@faker-js/faker/locale/fr';
import { beforeAll } from '@jest/globals';
import { Occupancy, OCCUPANCY_VALUES } from '@zerologementvacant/models';
import { stringify as writeJSONL } from 'jsonlines';
import fs from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { Transform, Writable } from 'node:stream';
import { ReadableStream } from 'node:stream/web';
import config from '~/infra/config';
import { BuildingApi } from '~/models/BuildingApi';
import { HousingEventApi } from '~/models/EventApi';
import { HousingApi } from '~/models/HousingApi';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import { UserApi } from '~/models/UserApi';
import {
  Buildings,
  formatBuildingApi
} from '~/repositories/buildingRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  EventRecordDBO,
  Events,
  eventsTable,
  formatEventApi,
  formatHousingEventApi,
  HousingEventDBO,
  HousingEvents,
  housingEventsTable
} from '~/repositories/eventRepository';
import {
  formatHousingRecordApi,
  Housing,
  HousingRecordDBO,
  housingTable
} from '~/repositories/housingRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import { genSourceHousing } from '~/scripts/import-lovac/infra/fixtures';
import { createUpdater } from '~/scripts/import-lovac/infra/updater';
import { SourceHousing } from '~/scripts/import-lovac/source-housings/source-housing';

import {
  createSourceHousingCommand,
  updateHousings
} from '~/scripts/import-lovac/source-housings/source-housing-command';
import {
  genBuildingApi,
  genEstablishmentApi,
  genHousingApi,
  genHousingEventApi,
  genUserApi
} from '~/test/testFixtures';

describe('Source housing command', () => {
  const command = createSourceHousingCommand();
  const file = path.join(__dirname, 'housings.jsonl');

  const building: BuildingApi = genBuildingApi();

  const missingSourceHousings: ReadonlyArray<SourceHousing> =
    faker.helpers.multiple(
      () => ({
        ...genSourceHousing(),
        building_id: building.id
      }),
      {
        count: { min: 5, max: 50 }
      }
    );

  const vacantHousings: ReadonlyArray<HousingApi> =
    faker.helpers.multiple<HousingApi>(
      () => ({
        ...genHousingApi(),
        buildingId: building.id,
        occupancy: Occupancy.VACANT,
        occupancyRegistered: Occupancy.VACANT
      }),
      { count: { min: 5, max: 50 } }
    );
  const nonVacantOccupancies = OCCUPANCY_VALUES.filter(
    (occupancy) => occupancy !== Occupancy.VACANT
  );
  const contactedStatuses = Object.values(HousingStatusApi)
    .filter((value) => typeof value === 'number')
    .filter((status) => status !== HousingStatusApi.NeverContacted);
  const nonVacantUnsupervisedHousings: ReadonlyArray<HousingApi> = faker.helpers
    .multiple(() => faker.helpers.arrayElement(nonVacantOccupancies), {
      count: { min: 5, max: 50 }
    })
    .map((occupancy) => ({
      ...genHousingApi(),
      buildingId: building.id,
      occupancy: occupancy,
      occupancyRegistered: occupancy
    }));
  const nonVacantUserModifiedHousings: ReadonlyArray<HousingApi> = faker.helpers
    .multiple(() => faker.helpers.arrayElement(nonVacantOccupancies), {
      count: { min: 5, max: 50 }
    })
    .map((occupancy) => ({
      ...genHousingApi(),
      buildingId: building.id,
      occupancy: occupancy,
      occupancyRegistered: occupancy,
      status: faker.helpers.arrayElement(contactedStatuses)
    }));
  const nonVacantNonUserModifiedHousings: ReadonlyArray<HousingApi> =
    faker.helpers
      .multiple(() => faker.helpers.arrayElement(nonVacantOccupancies), {
        count: { min: 5, max: 50 }
      })
      .map((occupancy) => ({
        ...genHousingApi(),
        buildingId: building.id,
        occupancy: occupancy,
        occupancyRegistered: occupancy,
        status: faker.helpers.arrayElement(contactedStatuses)
      }));
  const geoCodeChangedHousings: ReadonlyArray<HousingApi> =
    faker.helpers.multiple(
      () => ({ ...genHousingApi(), buildingId: building.id }),
      {
        count: { min: 5, max: 50 }
      }
    );
  // Housings to include in the fake LOVAC file
  const sourceHousings: ReadonlyArray<SourceHousing> = [
    ...missingSourceHousings,
    ...vacantHousings.map(toSourceHousing),
    ...nonVacantUnsupervisedHousings.map(toSourceHousing),
    ...nonVacantUserModifiedHousings.map(toSourceHousing),
    ...nonVacantNonUserModifiedHousings.map(toSourceHousing),
    ...geoCodeChangedHousings.map((housing) => ({
      ...toSourceHousing(housing),
      // The geo code should change in the fake LOVAC file
      geo_code: housing.geoCode.substring(0, 2) + '001'
    }))
  ];

  const vacantUnsupervisedHousings: ReadonlyArray<HousingApi> =
    faker.helpers.multiple(
      () => ({
        ...genHousingApi(),
        buildingId: building.id,
        dataFileYears: ['lovac-2024'],
        occupancy: Occupancy.VACANT,
        status: faker.helpers.arrayElement([
          HousingStatusApi.NeverContacted,
          HousingStatusApi.Waiting,
          HousingStatusApi.FirstContact,
          HousingStatusApi.Blocked
        ]),
        subStatus: null
      }),
      { count: { min: 5, max: 50 } }
    );
  const vacantSupervisedHousings: ReadonlyArray<HousingApi> =
    faker.helpers.multiple(
      () => {
        const status = faker.helpers.arrayElement([
          HousingStatusApi.Completed,
          HousingStatusApi.InProgress
        ]);
        const subStatus =
          status === HousingStatusApi.InProgress
            ? faker.helpers.arrayElement([
                'En accompagnement',
                'Intervention publique'
              ])
            : null;
        return {
          ...genHousingApi(),
          buildingId: building.id,
          dataFileYears: ['lovac-2024'],
          occupancy: Occupancy.VACANT,
          occupancyRegistered: Occupancy.VACANT,
          status,
          subStatus
        };
      },
      { count: { min: 5, max: 50 } }
    );

  // Housings to save to the database
  const housingsBefore: ReadonlyArray<HousingApi> = [
    ...vacantHousings,
    ...nonVacantUnsupervisedHousings,
    ...nonVacantUserModifiedHousings,
    ...nonVacantNonUserModifiedHousings,
    ...geoCodeChangedHousings,
    // Housings missing from the fake LOVAC file but present in our database
    ...vacantUnsupervisedHousings,
    ...vacantSupervisedHousings
  ];

  // Seed the database
  beforeAll(async () => {
    const establishment = genEstablishmentApi();
    await Establishments().insert(formatEstablishmentApi(establishment));
    const user: UserApi = {
      ...genUserApi(establishment.id),
      email: 'not@an.admin'
    };
    const admin: UserApi = {
      ...genUserApi(establishment.id),
      email: 'admin@zerologementvacant.beta.gouv.fr'
    };
    const auth: UserApi = {
      ...genUserApi(establishment.id),
      email: config.app.system
    };
    await Users().insert([user, admin, auth].map(formatUserApi));
    await Buildings().insert(formatBuildingApi(building));
    await Housing().insert(housingsBefore.map(formatHousingRecordApi));

    // Insert the related events
    const events = nonVacantUserModifiedHousings.map<HousingEventApi>(
      (housing) => {
        return {
          ...genHousingEventApi(housing, user),
          name: faker.helpers.arrayElement([
            'Changement de statut d’occupation',
            'Changement de statut de suivi'
          ])
        };
      }
    );
    await Events().insert(events.map(formatEventApi));
    await HousingEvents().insert(events.map(formatHousingEventApi));
  });

  // Write the file and run
  beforeAll(async () => {
    await write(file, sourceHousings);
    await command(file, { abortEarly: true, from: 'file' });
  });

  afterAll(async () => {
    await rm(file);
  });

  it('should add "lovac-2025" to housing updated from LOVAC', async () => {
    const actual = await refresh([
      ...vacantHousings,
      ...nonVacantUnsupervisedHousings,
      ...nonVacantUserModifiedHousings,
      ...nonVacantNonUserModifiedHousings
    ]);
    expect(actual).toSatisfyAll<HousingRecordDBO>((housing) => {
      const years = housing.data_file_years as ReadonlyArray<string>;
      return years[years.length - 1] === 'lovac-2025';
    });
  });

  it('should update specific housing keys', async () => {
    const table = faker.string.uuid();
    const housing = formatHousingRecordApi(genHousingApi());
    await Housing().insert(housing);
    const updated: HousingRecordDBO = {
      ...formatHousingRecordApi(genHousingApi()),
      id: housing.id,
      local_id: housing.local_id,
      geo_code: housing.geo_code
    };

    await ReadableStream.from([updated]).pipeTo(
      createUpdater<HousingRecordDBO>({
        destination: 'database',
        temporaryTable: table,
        likeTable: housingTable,
        async update(housings): Promise<void> {
          await updateHousings(housings, {
            temporaryTable: table
          });
        }
      })
    );

    const actual = await Housing()
      .where({ geo_code: housing.geo_code, id: housing.id })
      .first();
    expect(
      actual?.mutation_date?.toJSON().substring(0, 'yyyy-mm-dd'.length)
    ).toBe(updated.mutation_date?.toJSON().substring(0, 'yyyy-mm-dd'.length));
    expect(actual).toMatchObject<Partial<HousingRecordDBO>>({
      invariant: updated.invariant,
      building_id: updated.building_id,
      building_group_id: updated.building_group_id,
      plot_id: updated.plot_id,
      address_dgfip: updated.address_dgfip,
      longitude_dgfip: updated.longitude_dgfip,
      latitude_dgfip: updated.latitude_dgfip,
      geolocation: updated.geolocation,
      cadastral_classification: updated.cadastral_classification,
      uncomfortable: updated.uncomfortable,
      vacancy_start_year: updated.vacancy_start_year,
      housing_kind: updated.housing_kind,
      rooms_count: updated.rooms_count,
      living_area: updated.living_area,
      cadastral_reference: updated.cadastral_reference,
      building_year: updated.building_year,
      taxed: updated.taxed,
      deprecated_vacancy_reasons: updated.deprecated_vacancy_reasons,
      data_years: updated.data_years,
      data_file_years: updated.data_file_years,
      data_source: updated.data_source,
      beneficiary_count: updated.beneficiary_count,
      building_location: updated.building_location,
      rental_value: updated.rental_value,
      condominium: updated.condominium,
      status: updated.status,
      sub_status: updated.sub_status,
      deprecated_precisions: updated.deprecated_precisions,
      occupancy: updated.occupancy,
      occupancy_source: updated.occupancy_source,
      occupancy_intended: updated.occupancy_intended,
      energy_consumption_bdnb: updated.energy_consumption_bdnb,
      energy_consumption_at_bdnb: updated.energy_consumption_at_bdnb
    });
  });

  it('should update the housing geo code if it changed', async () => {
    const actual = await Housing().whereIn(
      'id',
      geoCodeChangedHousings.map((housing) => housing.id)
    );
    expect(actual).toHaveLength(geoCodeChangedHousings.length);
    actual.forEach((actualHousing) => {
      const sourceHousing = sourceHousings.find(
        (sourceHousing) => sourceHousing.local_id === actualHousing.local_id
      );
      expect(actualHousing).toMatchObject<Partial<HousingRecordDBO>>({
        local_id: sourceHousing?.local_id,
        geo_code: sourceHousing?.geo_code
      });
    });
  });

  describe('Present in LOVAC, missing from our database', () => {
    let actual: ReadonlyArray<HousingRecordDBO>;

    beforeAll(async () => {
      actual = await Housing().whereIn(
        ['geo_code', 'local_id'],
        missingSourceHousings.map((sourceHousing) => [
          sourceHousing.geo_code,
          sourceHousing.local_id
        ])
      );
    });

    it('should import new housings', () => {
      expect(actual).toHaveLength(missingSourceHousings.length);
    });

    it('should set their occupancy to "vacant"', () => {
      expect(actual).toSatisfyAll<HousingRecordDBO>((housing) => {
        return housing.occupancy === Occupancy.VACANT;
      });
    });

    it('should set their status to "never contacted"', () => {
      expect(actual).toSatisfyAll<HousingRecordDBO>((housing) => {
        return housing.status === HousingStatusApi.NeverContacted;
      });
    });
  });

  describe('Present in LOVAC, present in our database', () => {
    it('should leave vacant housings’ occupancies and statuses untouched', async () => {
      const actual = await refresh(vacantHousings);
      expect(actual).toHaveLength(vacantHousings.length);
      actual.forEach((actualHousing) => {
        const housingBefore = housingsBefore.find(
          (housing) => housing.id === actualHousing.id
        );
        expect(actualHousing).toMatchObject<Partial<HousingRecordDBO>>({
          occupancy: housingBefore?.occupancy,
          occupancy_source: housingBefore?.occupancyRegistered,
          status: housingBefore?.status,
          sub_status: housingBefore?.subStatus
        });
      });
    });

    it('should leave non-vacant, user-modified housing occupancies and statuses untouched', async () => {
      const actual = await refresh(nonVacantUserModifiedHousings);
      expect(actual).toHaveLength(nonVacantUserModifiedHousings.length);
      actual.forEach((actualHousing) => {
        const housingBefore = housingsBefore.find(
          (housing) => housing.id === actualHousing.id
        );
        expect(actualHousing).toMatchObject<Partial<HousingRecordDBO>>({
          occupancy: housingBefore?.occupancy,
          occupancy_source: housingBefore?.occupancyRegistered,
          status: housingBefore?.status,
          sub_status: housingBefore?.subStatus
        });
      });
    });

    it('should set non-vacant, non-user-modified housings as vacant and never contacted', async () => {
      const actual = await refresh(nonVacantNonUserModifiedHousings);
      expect(actual).toHaveLength(nonVacantNonUserModifiedHousings.length);
      actual.forEach((actualHousing) => {
        expect(actualHousing).toMatchObject<Partial<HousingRecordDBO>>({
          occupancy: Occupancy.VACANT,
          status: HousingStatusApi.NeverContacted,
          sub_status: null
        });
      });

      const actualEvents = await Events()
        .join(
          housingEventsTable,
          `${housingEventsTable}.event_id`,
          `${eventsTable}.id`
        )
        .whereIn(
          [
            `${housingEventsTable}.housing_geo_code`,
            `${housingEventsTable}.housing_id`
          ],
          actual.map((actualHousing) => [
            actualHousing.geo_code,
            actualHousing.id
          ])
        );
      actual.forEach((actualHousing) => {
        expect(actualEvents).toPartiallyContain<
          Partial<EventRecordDBO<any> & HousingEventDBO>
        >({
          housing_geo_code: actualHousing.geo_code,
          housing_id: actualHousing.id,
          name: 'Changement de statut d’occupation'
        });
        expect(actualEvents).toPartiallyContain<
          Partial<EventRecordDBO<any> & HousingEventDBO>
        >({
          housing_geo_code: actualHousing.geo_code,
          housing_id: actualHousing.id,
          name: 'Changement de statut de suivi'
        });
      });
    });
  });

  describe('Missing from LOVAC, present in our database', () => {
    it('should set vacant, unsupervised housings as out of vacancy', async () => {
      const actual = await refresh(vacantUnsupervisedHousings);
      expect(actual).toHaveLength(vacantUnsupervisedHousings.length);
      actual.forEach((actualHousing) => {
        expect(actualHousing).toMatchObject<Partial<HousingRecordDBO>>({
          occupancy: Occupancy.UNKNOWN,
          status: HousingStatusApi.Completed,
          sub_status: 'Sortie de la vacance'
        });
      });

      const actualEvents = await Events()
        .join(
          housingEventsTable,
          `${housingEventsTable}.event_id`,
          `${eventsTable}.id`
        )
        .whereIn(
          [
            `${housingEventsTable}.housing_geo_code`,
            `${housingEventsTable}.housing_id`
          ],
          actual.map((actualHousing) => [
            actualHousing.geo_code,
            actualHousing.id
          ])
        );
      actual.forEach((actualHousing) => {
        expect(actualEvents).toPartiallyContain<
          Partial<EventRecordDBO<any> & HousingEventDBO>
        >({
          housing_geo_code: actualHousing.geo_code,
          housing_id: actualHousing.id,
          name: 'Changement de statut d’occupation'
        });
        expect(actualEvents).toPartiallyContain<
          Partial<EventRecordDBO<any> & HousingEventDBO>
        >({
          housing_geo_code: actualHousing.geo_code,
          housing_id: actualHousing.id,
          name: 'Changement de statut de suivi'
        });
      });
    });

    it('should leave vacant, supervised housings’ occupancies and statuses untouched', async () => {
      const actual = await refresh(vacantSupervisedHousings);
      expect(actual).toHaveLength(vacantSupervisedHousings.length);
      actual.forEach((actualHousing) => {
        const housingBefore = housingsBefore.find(
          (housing) => housing.id === actualHousing.id
        );
        expect(actualHousing).toMatchObject<Partial<HousingRecordDBO>>({
          occupancy: housingBefore?.occupancy,
          occupancy_source: housingBefore?.occupancyRegistered,
          status: housingBefore?.status,
          sub_status: housingBefore?.subStatus
        });
      });
    });

    it('should not add them to "lovac-2025"', async () => {
      const actual = await refresh([
        ...vacantSupervisedHousings,
        ...vacantUnsupervisedHousings
      ]);
      expect(actual).toSatisfyAll<HousingRecordDBO>((housing) => {
        return !housing.data_file_years?.includes('lovac-2025');
      });
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

  function toSourceHousing(housing: HousingApi): SourceHousing {
    if (!housing.buildingId) {
      throw new Error('housing.buildingId must be defined');
    }
    return {
      ...genSourceHousing(),
      geo_code: housing.geoCode,
      local_id: housing.localId,
      building_id: housing.buildingId,
      occupancy_source: housing.occupancy
    };
  }
});

async function write(
  file: string,
  sourceHousings: ReadonlyArray<SourceHousing>
): Promise<void> {
  await new ReadableStream<SourceHousing>({
    start(controller) {
      sourceHousings.forEach((sourceHousing) => {
        controller.enqueue(sourceHousing);
      });
      controller.close();
    }
  })
    .pipeThrough(Transform.toWeb(writeJSONL()))
    .pipeTo(Writable.toWeb(fs.createWriteStream(file)));
}
