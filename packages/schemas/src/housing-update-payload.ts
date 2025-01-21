import { array, number, object, ObjectSchema, string } from 'yup';

import {
  HOUSING_STATUS_VALUES,
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
      .required('Veuillez renseigner l’occupation actuelle')
      .oneOf(OCCUPANCY_VALUES),
    // Optional, nullable keys
    subStatus: string().trim().nullable().optional().default(null),
    precisions: array()
      .of(string().trim().required())
      .nullable()
      .optional()
      .default(null),
    vacancyReasons: array()
      .of(string().trim().required())
      .nullable()
      .optional()
      .default(null),
    occupancyIntended: string()
      .oneOf(OCCUPANCY_VALUES)
      .nullable()
      .optional()
      .default(null)
  });
