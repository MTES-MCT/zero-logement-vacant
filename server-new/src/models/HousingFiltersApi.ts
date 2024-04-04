import {
  EnergyConsumptionGradesApi,
  OccupancyKindApi,
  OwnershipKindsApi,
} from './HousingApi';
import { body, ValidationChain } from 'express-validator';
import { isArrayOf, isInteger, isString, isUUID } from '~/utils/validators';

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
    .default([])
    .custom(isArrayOf(isUUID))
    .withMessage('Must be an array of UUIDs'),
  body(`${property}.ownerKinds`).default([]).custom(isArrayOf(isString)),
  body(`${property}.ownerAges`).default([]).custom(isArrayOf(isString)),
  body(`${property}.multiOwners`).default([]).custom(isArrayOf(isString)),
  body(`${property}.beneficiaryCounts`).default([]).custom(isArrayOf(isString)),
  body(`${property}.housingKinds`).default([]).custom(isArrayOf(isString)),
  body(`${property}.cadastralClassificiations`)
    .default([])
    .custom(isArrayOf(isString)),
  body(`${property}.housingAreas`).default([]).custom(isArrayOf(isString)),
  body(`${property}.roomsCounts`).default([]).custom(isArrayOf(isString)),
  body(`${property}.buildingPeriods`).default([]).custom(isArrayOf(isString)),
  body(`${property}.vacancyDurations`).default([]).custom(isArrayOf(isString)),
  body(`${property}.isTaxedValues`).default([]).custom(isArrayOf(isString)),
  body(`${property}.ownershipKinds`).default([]).custom(isArrayOf(isString)),
  body(`${property}.housingCounts`).default([]).custom(isArrayOf(isString)),
  body(`${property}.vacancyRates`).default([]).custom(isArrayOf(isString)),
  body(`${property}.campaignsCounts`).default([]).custom(isArrayOf(isString)),
  body(`${property}.campaignIds`).default([]).custom(isArrayOf(isUUID)),
  body(`${property}.ownerIds`).default([]).custom(isArrayOf(isUUID)),
  body(`${property}.localities`).default([]).custom(isArrayOf(isString)),
  body(`${property}.localityKinds`).default([]).custom(isArrayOf(isString)),
  body(`${property}.geoPerimetersIncluded`)
    .default([])
    .custom(isArrayOf(isString)),
  body(`${property}.geoPerimetersExcluded`)
    .default([])
    .custom(isArrayOf(isString)),
  body(`${property}.dataYearsIncluded`)
    .default([])
    .custom(isArrayOf(isInteger)),
  body(`${property}.dataYearsExcluded`)
    .default([])
    .custom(isArrayOf(isInteger)),
  body(`${property}.statusList`).default([]).custom(isArrayOf(isInteger)),
  body(`${property}.status`).optional().isInt(),
  body(`${property}.subStatus`).default([]).custom(isArrayOf(isString)),
  body(`${property}.query`).default('').isString(),
  body(`${property}.energyConsumption`).default([]).custom(isArrayOf(isString)),
  body(`${property}.occupancies`).default([]).custom(isArrayOf(isString)),
];

export default {
  validators,
};
