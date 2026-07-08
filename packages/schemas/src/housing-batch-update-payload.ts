import {
  getSubStatuses,
  HOUSING_STATUS_VALUES,
  isHousingStatus,
  OCCUPANCY_VALUES,
  type HousingBatchUpdatePayload
} from '@zerologementvacant/models';
import { array, number, object, ObjectSchema, string } from 'yup';

import { housingFilters } from './housing-filters';

export const housingBatchUpdatePayload: ObjectSchema<HousingBatchUpdatePayload> =
  object({
    filters: housingFilters.required(),
    status: number().oneOf(HOUSING_STATUS_VALUES).optional(),
    subStatus: string()
      .trim()
      .min(1)
      .nullable()
      .optional()
      .when('status', {
        is: (status: number | undefined) =>
          status !== undefined &&
          isHousingStatus(status) &&
          getSubStatuses(status).size === 0,
        then: (schema) => schema.transform(() => null).default(null),
        otherwise: (schema) =>
          schema.test({
            name: 'sub-status-coherence',
            test(value) {
              const { status } = this.parent as { status?: number };
              // No status set in this payload: leave the sub-status untouched.
              if (status === undefined || !isHousingStatus(status)) return true;
              // A valid status reaching the `otherwise` branch necessarily has
              // sub-statuses (statuses without any go through `then`), so a
              // sub-status is required here.
              const validSubStatuses = getSubStatuses(status);
              if (value === null || value === undefined) {
                return this.createError({
                  message: `Le statut de suivi sélectionné requiert un sous-statut. Sous-statuts possibles : ${[...validSubStatuses].join(', ')}`
                });
              }
              if (validSubStatuses.has(value)) return true;
              return this.createError({
                message: `Le sous-statut "${value}" n\u2019est pas coh\u00e9rent avec le statut de suivi. Sous-statuts possibles\u00a0: ${[...validSubStatuses].join(', ')}`
              });
            }
          })
      }),
    occupancy: string().oneOf(OCCUPANCY_VALUES).optional(),
    occupancyIntended: string().oneOf(OCCUPANCY_VALUES).optional(),
    note: string().trim().min(1).optional(),
    precisions: array().of(string().uuid().required()).optional(),
    documents: array().of(string().uuid().required()).optional()
  });
