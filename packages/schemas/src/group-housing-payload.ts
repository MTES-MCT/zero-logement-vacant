import { GroupAddHousingPayload } from '@zerologementvacant/models';
import { array, boolean, object, ObjectSchema, string } from 'yup';

import { housingFilters } from './housing-filters';

export const groupHousingPayload: ObjectSchema<GroupAddHousingPayload> = object(
  {
    all: boolean().required(),
    ids: array().of(string().uuid().required()).default([]),
    filters: housingFilters
  }
);
