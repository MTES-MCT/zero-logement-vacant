import { number, object, ObjectSchema, string } from 'yup';

import {
  ENERGY_CONSUMPTION_VALUES,
  getSubStatuses,
  HOUSING_STATUS_VALUES,
  HousingStatus,
  HousingUpdatePayloadDTO,
  OCCUPANCY_VALUES
} from '@zerologementvacant/models';

export const housingUpdatePayload: ObjectSchema<HousingUpdatePayloadDTO> =
  object({
    // Required keys
    status: number()
      .required('Veuillez renseigner le statut de suivi')
      .oneOf(HOUSING_STATUS_VALUES),
    occupancy: string()
      .required('Veuillez renseigner l\u2019occupation actuelle')
      .oneOf(OCCUPANCY_VALUES),
    // Optional, nullable keys
    subStatus: string()
      .trim()
      .min(1)
      .nullable()
      .optional()
      .default(null)
      .when('status', {
        is: (status: HousingStatus) => getSubStatuses(status).size === 0,
        then: (schema) => schema.transform(() => null),
        otherwise: (schema) =>
          schema.test({
            name: 'sub-status-coherence',
            test(value) {
              if (value === null || value === undefined) return true;
              const validSubStatuses = getSubStatuses(
                this.parent.status as HousingStatus
              );
              if (validSubStatuses.has(value)) return true;
              return this.createError({
                message: `Le sous-statut "${value}" n\u2019est pas coh\u00e9rent avec le statut de suivi. Sous-statuts possibles\u00a0: ${[...validSubStatuses].join(', ')}`
              });
            }
          })
      }),
    occupancyIntended: string()
      .oneOf(OCCUPANCY_VALUES)
      .nullable()
      .optional()
      .default(null),
    actualEnergyConsumption: string()
      .oneOf(ENERGY_CONSUMPTION_VALUES)
      .nullable()
      .optional()
      .default(null)
  });
