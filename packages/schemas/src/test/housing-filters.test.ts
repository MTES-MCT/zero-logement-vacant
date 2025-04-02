import { fc, test } from '@fast-check/jest';

import {
  BENEFIARY_COUNT_VALUES,
  BUILDING_PERIOD_VALUES,
  CADASTRAL_CLASSIFICATION_VALUES,
  CAMPAIGN_COUNT_VALUES,
  DATA_FILE_YEAR_VALUES,
  ENERGY_CONSUMPTION_VALUES,
  HOUSING_BY_BUILDING_VALUES,
  HOUSING_KIND_VALUES,
  HOUSING_STATUS_VALUES,
  HousingFiltersDTO,
  LIVING_AREA_VALUES,
  LOCALITY_KIND_VALUES,
  OCCUPANCY_VALUES,
  OWNER_AGE_VALUES,
  OWNER_KIND_VALUES,
  OWNERSHIP_KIND_VALUES,
  ROOM_COUNT_VALUES,
  VACANCY_RATE_VALUES,
  VACANCY_YEAR_VALUES
} from '@zerologementvacant/models';
import { housingFilters } from '../housing-filters';

describe('Housing filters', () => {
  test.prop<HousingFiltersDTO>({
    all: fc.boolean(),
    housingIds: fc.array(fc.uuid()),
    occupancies: fc.array(fc.constantFrom(...OCCUPANCY_VALUES)),
    energyConsumption: fc.array(
      fc.constantFrom(null, ...ENERGY_CONSUMPTION_VALUES)
    ),
    establishmentIds: fc.array(fc.uuid()),
    groupIds: fc.array(fc.uuid()),
    campaignsCounts: fc.array(fc.constantFrom(...CAMPAIGN_COUNT_VALUES)),
    campaignIds: fc.array(fc.oneof(fc.constant(null), fc.uuid())),
    ownerIds: fc.array(fc.uuid()),
    ownerKinds: fc.array(fc.constantFrom(null, ...OWNER_KIND_VALUES)),
    ownerAges: fc.array(fc.constantFrom(null, ...OWNER_AGE_VALUES)),
    multiOwners: fc.array(fc.boolean()),
    beneficiaryCounts: fc.array(fc.constantFrom(...BENEFIARY_COUNT_VALUES)),
    housingKinds: fc.array(fc.constantFrom(...HOUSING_KIND_VALUES)),
    housingAreas: fc.array(fc.constantFrom(...LIVING_AREA_VALUES)),
    roomsCounts: fc.array(fc.constantFrom(...ROOM_COUNT_VALUES)),
    cadastralClassifications: fc.array(
      fc.constantFrom(null, ...CADASTRAL_CLASSIFICATION_VALUES)
    ),
    buildingPeriods: fc.array(fc.constantFrom(...BUILDING_PERIOD_VALUES)),
    vacancyYears: fc.array(fc.constantFrom(...VACANCY_YEAR_VALUES)),
    isTaxedValues: fc.array(fc.boolean()),
    ownershipKinds: fc.array(fc.constantFrom(...OWNERSHIP_KIND_VALUES)),
    housingCounts: fc.array(fc.constantFrom(...HOUSING_BY_BUILDING_VALUES)),
    vacancyRates: fc.array(fc.constantFrom(...VACANCY_RATE_VALUES)),
    intercommunalities: fc.array(fc.uuid({ version: 4 })),
    localities: fc.array(fc.string({ minLength: 5, maxLength: 5 })),
    localityKinds: fc.array(fc.constantFrom(null, ...LOCALITY_KIND_VALUES)),
    geoPerimetersIncluded: fc.array(fc.string({ minLength: 1 })),
    geoPerimetersExcluded: fc.array(fc.string({ minLength: 1 })),
    dataFileYearsIncluded: fc.array(
      fc.constantFrom(null, ...DATA_FILE_YEAR_VALUES)
    ),
    dataFileYearsExcluded: fc.array(
      fc.constantFrom(null, ...DATA_FILE_YEAR_VALUES)
    ),
    status: fc.constantFrom(...HOUSING_STATUS_VALUES),
    statusList: fc.array(fc.constantFrom(...HOUSING_STATUS_VALUES)),
    subStatus: fc.array(fc.string({ minLength: 1 })),
    query: fc.string(),
    precisions: fc.array(fc.string({ minLength: 1 }))
  })('should validate inputs', (filters) => {
    const validate = () => housingFilters.validateSync(filters);

    expect(validate).not.toThrow();
  });

  it('should validate empty inputs', () => {
    const actual = housingFilters.validateSync({});

    expect(actual).toStrictEqual({});
  });
});
