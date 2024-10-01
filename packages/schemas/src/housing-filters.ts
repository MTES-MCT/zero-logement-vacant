import { array, boolean, number, object, ObjectSchema, string } from 'yup';

import {
  BENEFIARY_COUNT_VALUES,
  BUILDING_PERIOD_VALUES,
  CAMPAIGN_COUNT_VALUES,
  ENERGY_CONSUMPTION_VALUES,
  HOUSING_BY_BUILDING_VALUES,
  HOUSING_KIND_VALUES,
  HOUSING_STATUS_VALUES,
  HousingFiltersDTO,
  LIVING_AREA_VALUES,
  OCCUPANCY_VALUES,
  OWNER_AGE_VALUES,
  OWNERSHIP_KIND_VALUES,
  ROOM_COUNT_VALUES,
  VACANCY_RATE_VALUES
} from '@zerologementvacant/models';

export const housingFilters: ObjectSchema<HousingFiltersDTO> = object({
  housingIds: array().of(string().uuid().required()),
  occupancies: array().of(string().oneOf(OCCUPANCY_VALUES).required()),
  energyConsumption: array().of(
    string().oneOf(ENERGY_CONSUMPTION_VALUES).required()
  ),
  establishmentIds: array().of(string().uuid().required()),
  groupIds: array().of(string().uuid().required()),
  campaignsCounts: array().of(string().oneOf(CAMPAIGN_COUNT_VALUES).required()),
  campaignIds: array().of(string().uuid().required()),
  ownerIds: array().of(string().uuid().required()),
  ownerKinds: array().of(string().required()),
  ownerAges: array().of(string().oneOf(OWNER_AGE_VALUES).required()),
  multiOwners: array().of(boolean().required()),
  beneficiaryCounts: array().of(
    string().oneOf(BENEFIARY_COUNT_VALUES).required()
  ),
  housingKinds: array().of(string().oneOf(HOUSING_KIND_VALUES).required()),
  housingAreas: array().of(string().oneOf(LIVING_AREA_VALUES).required()),
  roomsCounts: array().of(string().oneOf(ROOM_COUNT_VALUES).required()),
  cadastralClassifications: array().of(string().required()),
  buildingPeriods: array().of(
    string().oneOf(BUILDING_PERIOD_VALUES).required()
  ),
  vacancyDurations: array().of(string().required()),
  isTaxedValues: array().of(boolean().required()),
  ownershipKinds: array().of(string().oneOf(OWNERSHIP_KIND_VALUES).required()),
  housingCounts: array().of(
    string().oneOf(HOUSING_BY_BUILDING_VALUES).required()
  ),
  vacancyRates: array().of(string().oneOf(VACANCY_RATE_VALUES).required()),
  localities: array().of(string().length(5).required()),
  localityKinds: array().of(string().required()),
  geoPerimetersIncluded: array().of(string().required()),
  geoPerimetersExcluded: array().of(string().required()),
  dataFileYearsIncluded: array().of(string().required()),
  dataFileYearsExcluded: array().of(string().required()),
  status: number().oneOf(HOUSING_STATUS_VALUES),
  statusList: array().of(number().oneOf(HOUSING_STATUS_VALUES).required()),
  subStatus: array().of(string().required()),
  query: string().optional()
});
