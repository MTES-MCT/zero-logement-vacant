import type { OwnerFiltersDTO } from '@zerologementvacant/models';
import { mixed, object, string, type ObjectSchema } from 'yup';
import { commaSeparatedString } from './transforms';

export const UNICODE_REGEXP = /(\p{L}|\p{Nd})+/u;

export const ownerFilters: ObjectSchema<OwnerFiltersDTO> = object({
  search: string().optional().trim().matches(UNICODE_REGEXP),
  idpersonne: mixed<boolean | string[]>()
    .test('is-boolean-or-array', 'Must be boolean or array', function (value) {
      if (value === undefined) return true;
      if (typeof value === 'boolean') return true;
      if (Array.isArray(value)) return true;
      if (typeof value === 'string') return true;
      return false;
    })
    .transform((value) => {
      if (typeof value === 'boolean' || value === undefined) {
        return value;
      }
      if (typeof value === 'string') {
        return commaSeparatedString(value);
      }
      return value;
    })
    .optional()
});
