import { faker } from '@faker-js/faker/locale/fr';
import fp from 'lodash/fp';

import createMigrator from './migrator';
import db from '~/infra/database/';

describe('20240715150036-housings-update-structure-lovac-2024 ', () => {
  const rollbackAll = true;
  const migrator = createMigrator(db);

  beforeEach(async () => {
    await migrator.migrateUntil(
      '20240715150036-housings-update-structure-lovac-2024.ts'
    );
  });

  afterEach(async () => {
    const migrator = createMigrator(db);
    await migrator.rollback(undefined, rollbackAll);
  });

  describe('up', () => {
    it('should copy the coordinates', async () => {
      const housings = faker.helpers.multiple(createHousing, { count: 10 });
      await db('fast_housing').insert(housings);

      await migrator.up();

      const actual = await db('fast_housing').select([
        'latitude',
        'longitude',
        'latitude_dgfip',
        'longitude_dgfip'
      ]);
      expect(actual).toSatisfyAll(
        (housing) => housing.latitude === housing.latitude_dgfip
      );
      expect(actual).toSatisfyAll(
        (housing) => housing.longitude === housing.longitude_dgfip
      );
    });
  });
});

function createHousing() {
  return {
    id: faker.string.uuid(),
    invariant: faker.string.alphanumeric(),
    local_id: faker.string.alphanumeric(),
    building_id: faker.string.alphanumeric(),
    raw_address: ['123 rue Bidon', '75101 Paris'],
    // faker.location.zipCode() sometimes returns the department "20"
    geo_code: fp.padCharsStart(
      '0',
      5,
      faker.number.int({ min: 1, max: 19 }).toString() + faker.string.numeric(3)
    ),
    longitude: faker.location.longitude(),
    latitude: faker.location.latitude(),
    cadastral_classification: faker.number.int(10),
    uncomfortable: faker.datatype.boolean(),
    vacancy_start_year: faker.date.past().getFullYear(),
    housing_kind: 'MAISON',
    rooms_count: 2,
    living_area: 40,
    cadastral_reference: 'cadref',
    building_year: 2000,
    mutation_date: new Date(),
    taxed: true,
    vacancy_reasons: [],
    data_years: faker.helpers.multiple(() => faker.date.past().getFullYear(), {
      count: {
        min: 1,
        max: 3
      }
    }),
    beneficiary_count: faker.number.int(6),
    building_location: 'building_location',
    rental_value: 1000,
    ownership_kind: 'single',
    status: faker.number.int(6),
    sub_status: 'sub_status',
    precisions: [],
    energy_consumption: 'F',
    occupancy: faker.helpers.arrayElement(['V', 'L', 'RS']),
    occupancy_registered: faker.helpers.arrayElement(['V', 'L', 'RS']),
    occupancy_intended: 'L',
    plot_id: 'plot_id',
    energy_consumption_at: new Date(),
    building_group_id: 'building_group_id',
    source: faker.helpers.arrayElement([
      'datafoncier-import',
      'datafoncier-manual',
      'lovac',
      null
    ])
  };
}
