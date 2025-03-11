import {
  HousingFiltersDTO,
  Occupancy,
  OwnershipKind
} from '@zerologementvacant/models';
import { body, ValidationChain } from 'express-validator';
import {
  isArrayOf,
  isBoolean,
  isInteger,
  isString,
  isUUID
} from '~/utils/validators';

export interface HousingFiltersApi
  extends Pick<
    HousingFiltersDTO,
    | 'all'
    | 'intercommunalities'
    | 'precisions'
    | 'dataFileYearsIncluded'
    | 'dataFileYearsExcluded'
    | 'energyConsumption'
    | 'ownerKinds'
    | 'localityKinds'
    | 'cadastralClassifications'
  > {
  housingIds?: string[];
  establishmentIds?: string[];
  groupIds?: string[];
  ownerAges?: string[];
  multiOwners?: boolean[];
  /**
   * The secondary owners
   * @todo Rename this to secondaryOwners
   */
  beneficiaryCounts?: string[];
  housingKinds?: string[];
  housingAreas?: string[];
  roomsCounts?: string[];
  buildingPeriods?: string[];
  vacancyYears?: string[];
  isTaxedValues?: boolean[];
  ownershipKinds?: OwnershipKind[];
  housingCounts?: string[];
  // TODO: type there based on housing repository values
  vacancyRates?: string[];
  campaignsCounts?: string[];
  campaignIds?: Array<string | null>;
  ownerIds?: string[];
  localities?: string[];
  geoPerimetersIncluded?: string[];
  geoPerimetersExcluded?: string[];
  status?: number;
  statusList?: number[];
  subStatus?: string[];
  query?: string;
  occupancies?: Occupancy[];
}

const validators = (property = 'filters'): ValidationChain[] => [
  body(property).isObject({ strict: true }).optional(),
  body(`${property}.establishmentIds`)
    .custom(isArrayOf(isUUID))
    .withMessage('Must be an array of UUIDs')
    .optional(),
  body(`${property}.ownerKinds`).custom(isArrayOf(isString)).optional(),
  body(`${property}.ownerAges`).custom(isArrayOf(isString)).optional(),
  body(`${property}.multiOwners`).custom(isArrayOf(isBoolean)).optional(),
  body(`${property}.beneficiaryCounts`).custom(isArrayOf(isString)).optional(),
  body(`${property}.housingKinds`).custom(isArrayOf(isString)).optional(),
  body(`${property}.cadastralClassificiations`)
    .custom(isArrayOf(isString))
    .optional(),
  body(`${property}.housingAreas`).custom(isArrayOf(isString)).optional(),
  body(`${property}.roomsCounts`).custom(isArrayOf(isString)).optional(),
  body(`${property}.buildingPeriods`).custom(isArrayOf(isString)).optional(),
  body(`${property}.vacancyYears`).custom(isArrayOf(isString)).optional(),
  body(`${property}.isTaxedValues`).custom(isArrayOf(isString)).optional(),
  body(`${property}.ownershipKinds`).custom(isArrayOf(isString)).optional(),
  body(`${property}.housingCounts`).custom(isArrayOf(isString)).optional(),
  body(`${property}.vacancyRates`).custom(isArrayOf(isString)).optional(),
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
  body(`${property}.dataFileYearsIncluded`)
    .custom(isArrayOf(isString))
    .optional(),
  body(`${property}.dataFileYearsExcluded`)
    .custom(isArrayOf(isString))
    .optional(),
  body(`${property}.statusList`).custom(isArrayOf(isInteger)).optional(),
  body(`${property}.status`).optional().isInt().optional(),
  body(`${property}.subStatus`).custom(isArrayOf(isString)).optional(),
  body(`${property}.query`).default('').isString().optional(),
  body(`${property}.energyConsumption`).custom(isArrayOf(isString)).optional(),
  body(`${property}.occupancies`).custom(isArrayOf(isString)).optional()
];

export default {
  validators
};
