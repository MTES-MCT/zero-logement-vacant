import { OWNER_ENTITY_VALUES, OwnerEntity } from '@zerologementvacant/models';
import { match } from 'ts-pattern';
import { date, object, string } from 'yup';

import { toDate } from '~/scripts/import-lovac/infra/validator';

// Cannot extend from OwnerRecordDBO, forced to write this by hand
// because ts-json-schema-generator does not support union types yet
// See https://github.com/vega/ts-json-schema-generator/issues/1946
export interface SourceOwner {
  idpersonne: string;
  full_name: string;
  dgfip_address: string | null;
  ownership_type: string;
  birth_date: Date | null;
  siren: string | null;
  entity: OwnerEntity;
}

export const sourceOwnerSchema = object({
  idpersonne: string().required('idpersonne is required'),
  full_name: string().required('full_name is required'),
  dgfip_address: string().defined('dgfip_address must be defined').nullable(),
  ownership_type: string().required('ownership_type is required'),
  birth_date: date()
    .defined('birth_date must be defined')
    .transform(toDate)
    .nullable(),
  siren: string().defined('siren must be defined').nullable(),
  entity: string()
    .transform((value) => {
      if (value === null) return null;
      if (typeof value === 'string' && value.length >= 1) {
        return mapEntity(value[0]);
      }
      return value;
    })
    .defined('entity must be defined')
    .nullable()
    .oneOf(OWNER_ENTITY_VALUES)
});

export function mapEntity(entity: string | null): OwnerEntity {
  return match(entity)
    .returnType<OwnerEntity>()
    .with('0', () => 'personnes-morales-non-remarquables')
    .with('1', () => 'etat')
    .with('2', () => 'region')
    .with('3', () => 'departement')
    .with('4', () => 'commune')
    .with('5', () => 'office-hlm')
    .with('6', () => 'personnes-morales-representant-des-societes')
    .with('7', () => 'coproprietaire')
    .with('8', () => 'associe')
    .with('9', () => 'etablissements-publics-ou-organismes-assimiles')
    .with(null, () => 'personnes-physiques')
    .otherwise((value) => {
      throw new Error(`Unexpected value ${value}`);
    });
}
