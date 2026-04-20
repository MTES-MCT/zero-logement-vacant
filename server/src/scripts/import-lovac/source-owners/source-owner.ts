import { OWNER_ENTITY_VALUES, OwnerEntity } from '@zerologementvacant/models';
import { match } from 'ts-pattern';
import z from 'zod';

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

export const sourceOwnerSchema = z.object({
  idpersonne: z.string().trim().min(1, 'idpersonne is required'),
  full_name: z.string().trim().min(1, 'full_name is required'),
  dgfip_address: z.string().trim().nullable(),
  ownership_type: z.string().trim().min(1, 'ownership_type is required'),
  birth_date: z.preprocess(
    (v) => {
      if (typeof v === 'number') return new Date(v * 1000);
      if (typeof v === 'string') return new Date(v);
      return v;
    },
    z.date().nullable()
  ),
  siren: z.string().trim().nullable(),
  entity: z.preprocess((v) => {
    if (v === null) return null;
    if (typeof v === 'string' && v.length >= 1) return mapEntity(v[0]);
    return v;
  }, z.enum(OWNER_ENTITY_VALUES).nullable())
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
