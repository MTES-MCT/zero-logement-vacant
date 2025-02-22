import { faker } from '@faker-js/faker/locale/fr';

import { genGeoCode } from '@zerologementvacant/models/fixtures';
import {
  HOUSING_KIND_VALUES,
  OWNERSHIP_KIND_VALUES
} from '@zerologementvacant/models';
import { SourceHousing } from '~/scripts/import-lovac/source-housings/source-housing';
import { SourceOwner } from '~/scripts/import-lovac/source-owners/source-owner';
import { SourceHousingOwner } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner';
import { PositiveRank } from '~/models/HousingOwnerApi';
import { SourceBuilding } from '~/scripts/import-lovac/source-buildings/source-building';

export function genSourceHousing(): SourceHousing {
  const geoCode = genGeoCode();

  return {
    data_file_years: 'lovac-2024',
    data_source: 'lovac',
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
    geolocalisation:
      faker.location.latitude() + ',' + faker.location.longitude(),
    housing_kind: faker.helpers.arrayElement(HOUSING_KIND_VALUES),
    condominium: faker.helpers.arrayElement(OWNERSHIP_KIND_VALUES),
    rooms_count: faker.number.int({ min: 1, max: 10 }),
    building_year: faker.date.past().getFullYear(),
    uncomfortable: faker.datatype.boolean(),
    cadastral_classification: faker.number.int(10),
    beneficiary_count: faker.number.int({ min: 1, max: 6 }),
    living_area: faker.number.float({ min: 10, max: 100, fractionDigits: 2 }),
    taxed: faker.datatype.boolean(),
    vacancy_start_year: faker.date.past().getFullYear(),
    mutation_date: faker.date.past()
  };
}

export function genSourceOwner(): SourceOwner {
  return {
    idpersonne: faker.string.alphanumeric(11),
    full_name: faker.person.fullName(),
    dgfip_address: faker.location.streetAddress(),
    birth_date: faker.date.past(),
    siren: null,
    ownership_type: 'Particulier'
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
    locprop: faker.helpers.arrayElement([1, 2, 3, 4, 5, 6, 9]),
    rank: faker.number.int({ min: 1, max: 6 }) as PositiveRank
  };
}

export function genSourceBuilding(): SourceBuilding {
  return {
    building_id: faker.string.alphanumeric(15),
    housing_vacant_count: faker.number.int({ min: 0, max: 10 }),
    housing_rent_count: faker.number.int({ min: 0, max: 10 })
  };
}
