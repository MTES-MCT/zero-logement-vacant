import { query, ValidationChain } from 'express-validator';
import {
  isArrayOf,
  isCommaDelimitedString,
  isUUID,
  split,
} from '~/utils/validators';

export interface CampaignFiltersApi {
  establishmentId: string;
  groupIds?: string[];
  /**
   * If provided, only return campaigns where ALL housings are within these geoCodes.
   * Campaigns with any housing outside these geoCodes will be excluded.
   */
  geoCodes?: string[];
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
