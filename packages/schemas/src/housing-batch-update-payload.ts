import { array, mixed, number, object, ObjectSchema, string } from 'yup';

import {
  HOUSING_STATUS_VALUES,
  OCCUPANCY_VALUES,
  type HousingBatchUpdatePayload
} from '@zerologementvacant/models';
import { housingFilters } from './housing-filters';

export const housingBatchUpdatePayload: ObjectSchema<HousingBatchUpdatePayload> =
  object({
    filters: housingFilters.required(),
    status: number().oneOf(HOUSING_STATUS_VALUES).optional(),
    subStatus: string().trim().min(1).optional(),
    occupancy: string().oneOf(OCCUPANCY_VALUES).optional(),
    occupancyIntended: string().oneOf(OCCUPANCY_VALUES).optional(),
    files: array().of(mixed<File>().required()).optional(),
    note: string().trim().min(1).optional(),
    precisions: array().of(string().uuid().required()).optional()
  });
