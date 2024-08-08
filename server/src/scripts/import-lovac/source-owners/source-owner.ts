import { date, object, ObjectSchema, string } from 'yup';

import { toDate } from '~/scripts/import-lovac/infra/validator';

// Cannot extend from OwnerRecordDBO, forced to write this by hand
// because ts-json-schema-generator does not support union types yet
// See https://github.com/vega/ts-json-schema-generator/issues/1946
export interface SourceOwner {
  idpersonne: string;
  full_name: string;
  dgfip_address: string;
  ownership_type: string;
  birth_date: Date | null;
  siren: string | null;
}

export const sourceOwnerSchema: ObjectSchema<SourceOwner> = object({
  idpersonne: string().required('idpersonne is required'),
  full_name: string().required('full_name is required'),
  dgfip_address: string().required('dgfip_address is required'),
  ownership_type: string().required('kind_class is required'),
  birth_date: date()
    .defined('birth_date must be defined')
    .transform(toDate)
    .nullable(),
  siren: string().defined('siren must be defined').nullable()
});
