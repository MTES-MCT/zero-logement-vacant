import { faker } from '@faker-js/faker/locale/fr';

import { SourceHousing } from '~/scripts/import-lovac/source-housings/source-housing';
import {
  HOUSING_KIND_VALUES,
  OCCUPANCY_VALUES,
  OWNERSHIP_KINDS
} from '@zerologementvacant/models';

export function genSourceHousing(): SourceHousing {
  const geoCode = faker.location.zipCode();

  return {
    local_id: geoCode + faker.string.numeric(7),
    geo_code: geoCode,
    building_id: geoCode + faker.string.alphanumeric(10),
    plot_id: geoCode + faker.string.alphanumeric(9),
    dgfip_address: faker.location.streetAddress(),
    dgfip_latitude: faker.location.latitude(),
    dgfip_longitude: faker.location.longitude(),
    location_detail: faker.location.ordinalDirection(),
    ban_address: faker.location.streetAddress(),
    ban_score: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
    ban_latitude: faker.location.latitude(),
    ban_longitude: faker.location.longitude(),
    housing_kind: faker.helpers.arrayElement(HOUSING_KIND_VALUES),
    condominium: faker.helpers.arrayElement(OWNERSHIP_KINDS),
    rooms_count: faker.number.int({ min: 1, max: 10 }),
    building_year: faker.date.past().getFullYear(),
    uncomfortable: faker.datatype.boolean(),
    cadastral_classification: faker.number.int(10),
    beneficiary_count: faker.number.int(6),
    rental_value: faker.number.float({
      min: 100,
      max: 1000,
      fractionDigits: 2
    }),
    living_area: faker.number.float({ min: 10, max: 100, fractionDigits: 2 }),
    taxed: faker.datatype.boolean(),
    vacancy_start_year: faker.date.past().getFullYear(),
    mutation_date: faker.date.past().toJSON(),
    occupancy_source: faker.helpers.arrayElement(OCCUPANCY_VALUES)
  };
}