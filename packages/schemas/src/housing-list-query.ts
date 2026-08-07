import {
  HOUSING_POINT_FIELDS,
  HousingPointField
} from '@zerologementvacant/models';
import { array, object, ObjectSchema, string } from 'yup';

import { commaSeparatedString } from './transforms';

export interface HousingListQuery {
  fields?: HousingPointField[];
}

/**
 * Extra query parameters for `GET /housing`, on top of the filters, sort and
 * pagination. `fields` requests a sparse projection (JSON:API style); only the
 * map-point fields are allowlisted for now.
 */
export const housingListQuery: ObjectSchema<HousingListQuery> = object({
  fields: array()
    .transform(commaSeparatedString)
    .of(string().oneOf(HOUSING_POINT_FIELDS).required())
    .optional()
});
