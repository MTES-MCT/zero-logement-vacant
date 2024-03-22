import {
  EnergyConsumptionGradesApi,
  OccupancyKindApi,
  OwnershipKindsApi,
} from './HousingApi';
import { body, ValidationChain } from 'express-validator';
import { isArrayOf, isInteger, isString, isUUID } from '../utils/validators';

export interface HousingFiltersApi {
  housingIds?: string[];
  establishmentIds?: string[];
  groupIds?: string[];
  ownerKinds?: string[];
  ownerAges?: string[];
  multiOwners?: string[];
  beneficiaryCounts?: string[];
  housingKinds?: string[];
  cadastralClassifications?: string[];
  housingAreas?: string[];
  roomsCounts?: string[];
  buildingPeriods?: string[];
  vacancyDurations?: string[];
  isTaxedValues?: string[];
  ownershipKinds?: OwnershipKindsApi[];
  housingCounts?: string[];
  // TODO: type there based on housing repository values
  vacancyRates?: string[];
  campaignsCounts?: string[];
  campaignIds?: string[];
  ownerIds?: string[];
  localities?: string[];
  localityKinds?: string[];
  geoPerimetersIncluded?: string[];
  geoPerimetersExcluded?: string[];
  dataYearsIncluded?: number[];
  dataYearsExcluded?: number[];
  status?: number;
  statusList?: number[];
  subStatus?: string[];
  query?: string;
  energyConsumption?: EnergyConsumptionGradesApi[];
  occupancies?: OccupancyKindApi[];
}

const validators = (property = 'filters'): ValidationChain[] => [
  body(property).isObject({ strict: true }).optional(),
  body(`${property}.establishmentIds`)
    .custom(isArrayOf(isUUID))
    .withMessage('Must be an array of UUIDs')
    .optional(),
  body(`${property}.ownerKinds`).custom(isArrayOf(isString)).optional(),
  body(`${property}.ownerAges`).custom(isArrayOf(isString)).optional(),
  body(`${property}.multiOwners`).custom(isArrayOf(isString)).optional(),
  body(`${property}.beneficiaryCounts`).custom(isArrayOf(isString)).optional(),
  body(`${property}.housingKinds`).custom(isArrayOf(isString)).optional(),
  body(`${property}.cadastralClassificiations`)
    .custom(isArrayOf(isString))
    .optional(),
  body(`${property}.housingAreas`).custom(isArrayOf(isString)).optional(),
  body(`${property}.roomsCounts`).custom(isArrayOf(isString)).optional(),
  body(`${property}.buildingPeriods`).custom(isArrayOf(isString)).optional(),
  body(`${property}.vacancyDurations`).custom(isArrayOf(isString)).optional(),
  body(`${property}.isTaxedValues`).custom(isArrayOf(isString)).optional(),
  body(`${property}.ownershipKinds`).custom(isArrayOf(isString)).optional(),
  body(`${property}.housingCounts`).custom(isArrayOf(isString)).optional(),
  body(`${property}.vacancyRates`).custom(isArrayOf(isString)).optional(),
  body(`${property}.campaignsCounts`).custom(isArrayOf(isString)).optional(),
  body(`${property}.campaignIds`).custom(isArrayOf(isUUID)).optional(),
  body(`${property}.ownerIds`).custom(isArrayOf(isUUID)).optional(),
  body(`${property}.localities`).custom(isArrayOf(isString)).optional(),
  body(`${property}.localityKinds`).custom(isArrayOf(isString)).optional(),
  body(`${property}.geoPerimetersIncluded`)
    .custom(isArrayOf(isString))
    .optional(),
  body(`${property}.geoPerimetersExcluded`)
    .custom(isArrayOf(isString))
    .optional(),
  body(`${property}.dataYearsIncluded`).custom(isArrayOf(isInteger)).optional(),
  body(`${property}.dataYearsExcluded`).custom(isArrayOf(isInteger)).optional(),
  body(`${property}.statusList`).custom(isArrayOf(isInteger)).optional(),
  body(`${property}.status`).optional().isInt().optional(),
  body(`${property}.subStatus`).custom(isArrayOf(isString)).optional(),
  body(`${property}.query`).default('').isString().optional(),
  body(`${property}.energyConsumption`).custom(isArrayOf(isString)).optional(),
  body(`${property}.occupancies`).custom(isArrayOf(isString)).optional(),
];

export default {
  validators,
};
