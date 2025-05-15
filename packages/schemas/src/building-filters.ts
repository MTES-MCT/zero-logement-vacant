import { BuildingFiltersDTO } from '@zerologementvacant/models';
import { array, object, ObjectSchema, string } from 'yup';

import { commaSeparatedString } from './transforms';

export const buildingFilters: ObjectSchema<BuildingFiltersDTO> = object({
  id: array().transform(commaSeparatedString).of(string().required()).optional()
});
