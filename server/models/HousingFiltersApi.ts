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

const validators: ValidationChain[] = [
  body('filters').isObject({ strict: true }),
  body('filters.establishmentIds')
    .default([])
    .custom(isArrayOf(isUUID))
    .withMessage('Must be an array of UUIDs'),
  body('filters.ownerKinds').default([]).custom(isArrayOf(isString)),
  body('filters.ownerAges').default([]).custom(isArrayOf(isString)),
  body('filters.multiOwners').default([]).custom(isArrayOf(isString)),
  body('filters.beneficiaryCounts').default([]).custom(isArrayOf(isString)),
  body('filters.housingKinds').default([]).custom(isArrayOf(isString)),
  body('filters.cadastralClassificiations')
    .default([])
    .custom(isArrayOf(isString)),
  body('filters.housingAreas').default([]).custom(isArrayOf(isString)),
  body('filters.roomsCounts').default([]).custom(isArrayOf(isString)),
  body('filters.buildingPeriods').default([]).custom(isArrayOf(isString)),
  body('filters.vacancyDurations').default([]).custom(isArrayOf(isString)),
  body('filters.isTaxedValues').default([]).custom(isArrayOf(isString)),
  body('filters.ownershipKinds').default([]).custom(isArrayOf(isString)),
  body('filters.housingCounts').default([]).custom(isArrayOf(isString)),
  body('filters.vacancyRates').default([]).custom(isArrayOf(isString)),
  body('filters.campaignsCounts').default([]).custom(isArrayOf(isString)),
  body('filters.campaignIds').default([]).custom(isArrayOf(isUUID)),
  body('filters.ownerIds').default([]).custom(isArrayOf(isUUID)),
  body('filters.localities').default([]).custom(isArrayOf(isString)),
  body('filters.localityKinds').default([]).custom(isArrayOf(isString)),
  body('filters.geoPerimetersIncluded').default([]).custom(isArrayOf(isString)),
  body('filters.geoPerimetersExcluded').default([]).custom(isArrayOf(isString)),
  body('filters.dataYearsIncluded').default([]).custom(isArrayOf(isInteger)),
  body('filters.dataYearsExcluded').default([]).custom(isArrayOf(isInteger)),
  body('filters.statusList').default([]).custom(isArrayOf(isInteger)),
  body('filters.status').optional().isInt(),
  body('filters.subStatus').default([]).custom(isArrayOf(isString)),
  body('filters.query').default('').isString(),
  body('filters.energyConsumption').default([]).custom(isArrayOf(isString)),
  body('filters.occupancies').default([]).custom(isArrayOf(isString)),
];

export default {
  validators,
};
