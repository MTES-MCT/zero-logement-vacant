import type { UserFilters } from '@zerologementvacant/models';
import { array, object, string, type ObjectSchema } from 'yup';
import { commaSeparatedString } from './transforms';

export const userFilters: ObjectSchema<UserFilters> = object({
  establishments: array()
    .transform(commaSeparatedString)
    .of(string().uuid().required())
});
