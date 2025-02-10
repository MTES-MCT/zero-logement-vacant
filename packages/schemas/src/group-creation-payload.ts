import { array, boolean, object, ObjectSchema, string } from 'yup';

import { GroupPayloadDTO } from '@zerologementvacant/models';
import { housingFilters } from './housing-filters';

export const groupCreationPayload: ObjectSchema<GroupPayloadDTO> = object({
  title: string().trim().required('Veuillez renseigner un titre'),
  description: string().trim().required('Veuillez renseigner une description'),
  housing: object({
    all: boolean().required(),
    ids: array().of(string().uuid().required()).default([]),
    filters: housingFilters
  })
});
