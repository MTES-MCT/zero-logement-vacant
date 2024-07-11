import { date, object, ObjectSchema, string } from 'yup';

// Cannot extend from OwnerRecordDBO, forced to write this by hand
// because ts-json-schema-generator does not support union types yet
// See https://github.com/vega/ts-json-schema-generator/issues/1946
export interface SourceOwner {
  idpersonne: string;
  full_name: string;
  dgfip_address: string;
  data_source: string;
  kind_class: string;
  birth_date: Date | null;
  administrator: string | null;
  siren: string | null;
  ban_address: string | null;
}

export const sourceOwnerSchema: ObjectSchema<SourceOwner> = object({
  idpersonne: string().required('idpersonne is required'),
  full_name: string().required('full_name is required'),
  dgfip_address: string().required('dgfip_address is required'),
  data_source: string().required('data_source is required'),
  kind_class: string().required('kind_class is required'),
  birth_date: date().defined('birth_date must be defined').nullable(),
  administrator: string().defined('administrator must be defined').nullable(),
  siren: string().defined('siren must be defined').nullable(),
  ban_address: string().defined('ban_address must be defined').nullable()
});
