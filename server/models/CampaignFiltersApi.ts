import { query, ValidationChain } from 'express-validator';
import {
  isArrayOf,
  isCommaDelimitedString,
  isUUID,
  split,
} from '../utils/validators';

export interface CampaignFiltersApi {
  establishmentId: string;
  groupIds?: string[];
}

export interface CampaignQuery {
  groups?: string;
}

export const campaignFiltersValidators: ValidationChain[] = [
  query('groups')
    .isString()
    .trim()
    .custom(isCommaDelimitedString)
    .withMessage('Must be a comma delimited string')
    .customSanitizer(split(','))
    .custom(isArrayOf(isUUID))
    .withMessage('Must be an array of UUIDs')
    .optional(),
];
