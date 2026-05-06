import {
  OWNER_RANKS,
  PROPERTY_RIGHT_VALUES,
  PropertyRight,
  type OwnerRank
} from '@zerologementvacant/models';
import z from 'zod';

export interface SourceHousingOwner {
  owner_uid: string;
  geo_code: string;
  local_id: string;
  idpersonne: string | null;
  idprocpte: string | null;
  idprodroit: string | null;
  locprop_source: number | null;
  property_right: PropertyRight | null;
  rank: OwnerRank;
}

export const sourceHousingOwnerSchema = z.object({
  owner_uid: z.uuid('owner_uid must be a valid UUID'),
  geo_code: z.string().length(5),
  local_id: z.string().length(12),
  idpersonne: z.string().length(8).nullable(),
  idprocpte: z.string().length(11).nullable(),
  idprodroit: z.string().length(13).nullable(),
  locprop_source: z.literal([1, 2, 3, 4, 5, 6, 9]).nullable(),
  property_right: z.literal(PROPERTY_RIGHT_VALUES).nullable(),
  rank: z.literal(OWNER_RANKS)
}) satisfies z.ZodSchema<SourceHousingOwner>;
