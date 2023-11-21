import { query, ValidationChain } from 'express-validator';
import { isArrayOf, isUUID } from '../utils/validators';

export interface CampaignFiltersApi {
  establishmentId: string;
  groupIds?: string[];
}

export interface CampaignQuery {
  groups?: string[];
}

export const campaignFiltersValidators: ValidationChain[] = [
  query('groups')
    .custom(isUUID || isArrayOf(isUUID))
    .optional(),
];
