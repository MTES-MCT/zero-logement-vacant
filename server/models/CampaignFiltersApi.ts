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
  groups?: string[];
}

export const campaignFiltersValidators: ValidationChain[] = [
  query('groups')
    .custom(isCommaDelimitedString)
    .customSanitizer(split(','))
    .custom(isArrayOf(isUUID))
    .optional(),
];
