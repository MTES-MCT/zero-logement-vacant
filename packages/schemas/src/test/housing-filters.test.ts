import { fc, test } from '@fast-check/jest';

import {
  BENEFIARY_COUNT_VALUES,
  BUILDING_PERIOD_VALUES,
  ENERGY_CONSUMPTION_VALUES,
  HOUSING_BY_BUILDING_VALUES,
  HOUSING_KIND_VALUES,
  HOUSING_STATUS_VALUES,
  HousingFiltersDTO,
  LIVING_AREA_VALUES,
  OCCUPANCY_VALUES,
  OWNER_AGE_VALUES,
  OWNERSHIP_KIND_VALUES,
  VACANCY_RATE_VALUES
} from '@zerologementvacant/models';
import { housingFilters } from '../housing-filters';

describe('Housing filters', () => {
  test.prop<HousingFiltersDTO>({
    housingIds: fc.array(fc.uuid()),
    occupancies: fc.array(fc.constantFrom(...OCCUPANCY_VALUES)),
    energyConsumption: fc.array(fc.constantFrom(...ENERGY_CONSUMPTION_VALUES)),
    establishmentIds: fc.array(fc.uuid()),
    groupIds: fc.array(fc.uuid()),
    campaignsCounts: fc.array(fc.string({ minLength: 1 })),
    campaignIds: fc.array(fc.uuid()),
    ownerIds: fc.array(fc.uuid()),
    ownerKinds: fc.array(fc.string({ minLength: 1 })),
    ownerAges: fc.array(fc.constantFrom(...OWNER_AGE_VALUES)),
    multiOwners: fc.array(fc.boolean()),
    beneficiaryCounts: fc.array(fc.constantFrom(...BENEFIARY_COUNT_VALUES)),
    housingKinds: fc.array(fc.constantFrom(...HOUSING_KIND_VALUES)),
    housingAreas: fc.array(fc.constantFrom(...LIVING_AREA_VALUES)),
    roomsCounts: fc.array(fc.integer({ min: 0 })),
    cadastralClassifications: fc.array(fc.string({ minLength: 1 })),
    buildingPeriods: fc.array(fc.constantFrom(...BUILDING_PERIOD_VALUES)),
    vacancyDurations: fc.array(fc.string({ minLength: 1 })),
    isTaxedValues: fc.array(fc.boolean()),
    ownershipKinds: fc.array(fc.constantFrom(...OWNERSHIP_KIND_VALUES)),
    housingCounts: fc.array(fc.constantFrom(...HOUSING_BY_BUILDING_VALUES)),
    vacancyRates: fc.array(fc.constantFrom(...VACANCY_RATE_VALUES)),
    localities: fc.array(fc.string({ minLength: 5, maxLength: 5 })),
    localityKinds: fc.array(fc.string({ minLength: 1 })),
    geoPerimetersIncluded: fc.array(fc.string({ minLength: 1 })),
    geoPerimetersExcluded: fc.array(fc.string({ minLength: 1 })),
    dataFileYearsIncluded: fc.array(fc.string({ minLength: 1 })),
    dataFileYearsExcluded: fc.array(fc.string({ minLength: 1 })),
    status: fc.constantFrom(...HOUSING_STATUS_VALUES),
    statusList: fc.array(fc.constantFrom(...HOUSING_STATUS_VALUES)),
    subStatus: fc.array(fc.string({ minLength: 1 })),
    query: fc.string()
  })('should validate inputs', (filters) => {
    const actual = housingFilters.validateSync(filters);

    expect(actual).toStrictEqual(filters);
  });

  it('should validate empty inputs', () => {
    const actual = housingFilters.validateSync({});

    expect(actual).toStrictEqual({});
  });
});