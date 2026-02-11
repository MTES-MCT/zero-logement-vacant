import {
  BENEFIARY_COUNT_VALUES,
  BUILDING_PERIOD_VALUES,
  CADASTRAL_CLASSIFICATION_VALUES,
  CadastralClassification,
  CAMPAIGN_COUNT_VALUES,
  DATA_FILE_YEAR_VALUES,
  ENERGY_CONSUMPTION_VALUES,
  HOUSING_BY_BUILDING_VALUES,
  HOUSING_KIND_VALUES,
  HOUSING_STATUS_VALUES,
  HousingFiltersDTO,
  LAST_MUTATION_TYPE_FILTER_VALUES,
  LAST_MUTATION_YEAR_FILTER_VALUES,
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
import { array, boolean, number, object, ObjectSchema, string } from 'yup';
import { commaSeparatedString, parseNull } from './transforms';

export const housingFilters: ObjectSchema<HousingFiltersDTO> = object({
  all: boolean(),
  housingIds: array()
    .transform(commaSeparatedString)
    .of(string().uuid().required()),
  occupancies: array()
    .transform(commaSeparatedString)
    .of(string().oneOf(OCCUPANCY_VALUES).required()),
  energyConsumption: array()
    .transform(commaSeparatedString)
    .transform(parseNull)
    .of(string().oneOf(ENERGY_CONSUMPTION_VALUES).defined().nullable()),
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
  ownerKinds: array()
    .transform(commaSeparatedString)
    .transform(parseNull)
    .of(string().oneOf(OWNER_KIND_VALUES).defined().nullable()),
  ownerAges: array()
    .transform(commaSeparatedString)
    .transform(parseNull)
    .of(string().oneOf(OWNER_AGE_VALUES).defined().nullable()),
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
    .transform(parseNull)
    .of(
      number<CadastralClassification>()
        .oneOf(CADASTRAL_CLASSIFICATION_VALUES)
        .defined()
        .nullable()
    ),
  buildingPeriods: array()
    .transform(commaSeparatedString)
    .of(string().oneOf(BUILDING_PERIOD_VALUES).required()),
  vacancyYears: array()
    .transform(commaSeparatedString)
    .of(string().oneOf(VACANCY_YEAR_VALUES).required()),
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
  intercommunalities: array()
    .transform(commaSeparatedString)
    .of(string().uuid().required()),
  localities: array()
    .transform(commaSeparatedString)
    .of(string().length(5).required()),
  localityKinds: array()
    .transform(commaSeparatedString)
    .transform(parseNull)
    .of(string().oneOf(LOCALITY_KIND_VALUES).defined().nullable()),
  geoPerimetersIncluded: array()
    .transform(commaSeparatedString)
    .of(string().required()),
  geoPerimetersExcluded: array()
    .transform(commaSeparatedString)
    .of(string().required()),
  dataFileYearsIncluded: array()
    .transform(commaSeparatedString)
    .transform(parseNull)
    .of(string().oneOf([...DATA_FILE_YEAR_VALUES, 'datafoncier-manual']).defined().nullable()),
  dataFileYearsExcluded: array()
    .transform(commaSeparatedString)
    .transform(parseNull)
    .of(string().oneOf([...DATA_FILE_YEAR_VALUES, 'datafoncier-manual']).defined().nullable()),
  status: number().oneOf(HOUSING_STATUS_VALUES),
  statusList: array()
    .transform(commaSeparatedString)
    .of(number().oneOf(HOUSING_STATUS_VALUES).required()),
  subStatus: array().transform(commaSeparatedString).of(string().required()),
  query: string().optional(),
  precisions: array().transform(commaSeparatedString).of(string().required()),
  lastMutationYears: array()
    .transform(commaSeparatedString)
    .transform(parseNull)
    .of(string().oneOf(LAST_MUTATION_YEAR_FILTER_VALUES).defined().nullable()),
  lastMutationTypes: array()
    .transform(commaSeparatedString)
    .transform(parseNull)
    .of(string().oneOf(LAST_MUTATION_TYPE_FILTER_VALUES).defined().nullable())
});
