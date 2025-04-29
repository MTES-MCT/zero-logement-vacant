import { faker } from '@faker-js/faker/locale/fr';
import {
  ActiveOwnerRank,
  HOUSING_KIND_VALUES,
  Occupancy,
  OWNERSHIP_KIND_INTERNAL_VALUES
} from '@zerologementvacant/models';

import { genGeoCode } from '@zerologementvacant/models/fixtures';
import { SourceBuilding } from '~/scripts/import-lovac/source-buildings/source-building';
import { SourceHousingOwner } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner';
import { SourceHousing } from '~/scripts/import-lovac/source-housings/source-housing';
import { SourceOwner } from '~/scripts/import-lovac/source-owners/source-owner';

export function genSourceHousing(): SourceHousing {
  const geoCode = genGeoCode();

  return {
    data_file_year: 'lovac-2025',
    invariant: faker.string.numeric(10),
    local_id: geoCode + faker.string.numeric(7),
    geo_code: geoCode,
    building_id: geoCode + faker.string.alphanumeric(10),
    building_location: faker.location.ordinalDirection(),
    building_year: faker.date.past().getFullYear(),
    plot_id: geoCode + faker.string.alphanumeric(9),
    dgfip_address: faker.location.streetAddress(),
    dgfip_latitude: faker.location.latitude(),
    dgfip_longitude: faker.location.longitude(),
    ban_id: faker.string.uuid(),
    ban_label: faker.location.streetAddress(),
    ban_score: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
    ban_latitude: faker.location.latitude(),
    ban_longitude: faker.location.longitude(),
    housing_kind: faker.helpers.arrayElement(HOUSING_KIND_VALUES),
    condominium: faker.helpers.arrayElement(OWNERSHIP_KIND_INTERNAL_VALUES),
    rooms_count: faker.number.int({ min: 1, max: 10 }),
    uncomfortable: faker.datatype.boolean(),
    cadastral_classification: faker.number.int(10),
    living_area: faker.number.float({ min: 10, max: 100, fractionDigits: 2 }),
    taxed: faker.datatype.boolean(),
    vacancy_start_year: faker.date.past().getFullYear(),
    last_mutation_date: faker.date.past(),
    occupancy_source: Occupancy.VACANT,
    rental_value: faker.number.int({ min: 500, max: 10000 })
  };
}

export function genSourceOwner(): SourceOwner {
  return {
    idpersonne: faker.string.alphanumeric(11),
    full_name: faker.person.fullName(),
    dgfip_address: faker.location.streetAddress(),
    birth_date: faker.date.past(),
    siren: null,
    ownership_type: 'Particulier',
    entity:
      faker.helpers.maybe(() => faker.number.int({ min: 0, max: 9 })) ?? null
  };
}

export function genSourceHousingOwner(
  sourceHousing: SourceHousing,
  sourceOwner: SourceOwner
): SourceHousingOwner {
  return {
    geo_code: sourceHousing.geo_code,
    local_id: sourceHousing.local_id,
    idpersonne: sourceOwner.idpersonne,
    idprocpte: faker.string.alphanumeric(11),
    idprodroit: faker.string.alphanumeric(13),
    locprop_source: faker.helpers.arrayElement([1, 2, 3, 4, 5, 6, 9]),
    rank: faker.number.int({ min: 1, max: 6 }) as ActiveOwnerRank
  };
}

export function genSourceBuilding(): SourceBuilding {
  return {
    building_id: faker.string.alphanumeric(15),
    housing_vacant_count: faker.number.int({ min: 0, max: 10 }),
    housing_rent_count: faker.number.int({ min: 0, max: 10 })
  };
}
