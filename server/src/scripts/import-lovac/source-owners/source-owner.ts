import { object, ObjectSchema, string } from 'yup';

export interface SourceOwner {
  idpersonne: string;
  full_name: string;
  raw_address: string;
  birth_date: string | null;
}

export const sourceOwnerSchema: ObjectSchema<SourceOwner> = object({
  idpersonne: string().required('idpersonne is required'),
  full_name: string().required('full_name is required'),
  raw_address: string().required('raw_address is required'),
  birth_date: string()
    .defined('birth_date must be defined')
    .nullable()
    .datetime('birth_date must be a valid date')
});
