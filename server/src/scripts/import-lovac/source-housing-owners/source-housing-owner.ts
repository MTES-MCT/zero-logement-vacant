import {
  ACTIVE_OWNER_RANKS,
  ActiveOwnerRank,
  PROPERTY_RIGHT_VALUES,
  PropertyRight
} from '@zerologementvacant/models';
import z from 'zod';

export interface SourceHousingOwner {
  geo_code: string;
  local_id: string;
  idpersonne: string;
  idprocpte: string;
  idprodroit: string;
  locprop_source: number;
  property_right: PropertyRight;
  rank: ActiveOwnerRank;
}

export const sourceHousingOwnerSchema = z.object({
  geo_code: z.string().length(5),
  local_id: z.string().length(12),
  idpersonne: z.string().length(8),
  idprocpte: z.string().length(11),
  idprodroit: z.string().length(13),
  locprop_source: z.number().transform(Math.trunc),
  property_right: z.literal(PROPERTY_RIGHT_VALUES),
  rank: z.literal(ACTIVE_OWNER_RANKS)
});
