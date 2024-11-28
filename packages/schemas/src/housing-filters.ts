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
import { commaSeparatedString, parseNull } from './transforms';

export const housingFilters: ObjectSchema<HousingFiltersDTO> = object({
  housingIds: array()
    .transform(commaSeparatedString)
    .of(string().uuid().required()),
  occupancies: array()
    .transform(commaSeparatedString)
    .of(string().oneOf(OCCUPANCY_VALUES).required()),
  energyConsumption: array()
    .transform(commaSeparatedString)
    .of(string().oneOf(ENERGY_CONSUMPTION_VALUES).required()),
  establishmentIds: array()
    .transform(commaSeparatedString)
    .of(string().uuid().required()),
  groupIds: array()
    .transform(commaSeparatedString)
    .of(string().uuid().required()),
  campaignsCounts: array()
    .transform(commaSeparatedString)
    .of(string().oneOf(CAMPAIGN_COUNT_VALUES).required()),
  campaignIds: array()
    .transform(commaSeparatedString)
    .transform(parseNull)
    .of(string().defined().nullable().uuid()),
  ownerIds: array()
    .transform(commaSeparatedString)
    .of(string().uuid().required()),
  ownerKinds: array().transform(commaSeparatedString).of(string().required()),
  ownerAges: array()
    .transform(commaSeparatedString)
    .of(string().oneOf(OWNER_AGE_VALUES).required()),
  multiOwners: array().transform(commaSeparatedString).of(boolean().required()),
  beneficiaryCounts: array()
    .transform(commaSeparatedString)
    .of(string().oneOf(BENEFIARY_COUNT_VALUES).required()),
  housingKinds: array()
    .transform(commaSeparatedString)
    .of(string().oneOf(HOUSING_KIND_VALUES).required()),
  housingAreas: array()
    .transform(commaSeparatedString)
    .of(string().oneOf(LIVING_AREA_VALUES).required()),
  roomsCounts: array()
    .transform(commaSeparatedString)
    .of(string().oneOf(ROOM_COUNT_VALUES).required()),
  cadastralClassifications: array()
    .transform(commaSeparatedString)
    .of(string().required()),
  buildingPeriods: array()
    .transform(commaSeparatedString)
    .of(string().oneOf(BUILDING_PERIOD_VALUES).required()),
  vacancyYears: array().transform(commaSeparatedString).of(string().required()),
  isTaxedValues: array()
    .transform(commaSeparatedString)
    .of(boolean().required()),
  ownershipKinds: array()
    .transform(commaSeparatedString)
    .of(string().oneOf(OWNERSHIP_KIND_VALUES).required()),
  housingCounts: array()
    .transform(commaSeparatedString)
    .of(string().oneOf(HOUSING_BY_BUILDING_VALUES).required()),
  vacancyRates: array()
    .transform(commaSeparatedString)
    .of(string().oneOf(VACANCY_RATE_VALUES).required()),
  localities: array()
    .transform(commaSeparatedString)
    .of(string().length(5).required()),
  localityKinds: array()
    .transform(commaSeparatedString)
    .of(string().required()),
  geoPerimetersIncluded: array()
    .transform(commaSeparatedString)
    .of(string().required()),
  geoPerimetersExcluded: array()
    .transform(commaSeparatedString)
    .of(string().required()),
  dataFileYearsIncluded: array()
    .transform(commaSeparatedString)
    .of(string().required()),
  dataFileYearsExcluded: array()
    .transform(commaSeparatedString)
    .of(string().required()),
  status: number().oneOf(HOUSING_STATUS_VALUES),
  statusList: array()
    .transform(commaSeparatedString)
    .of(number().oneOf(HOUSING_STATUS_VALUES).required()),
  subStatus: array().transform(commaSeparatedString).of(string().required()),
  query: string().optional()
});
