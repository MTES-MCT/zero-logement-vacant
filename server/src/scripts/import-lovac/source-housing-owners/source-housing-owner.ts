import { number, object, ObjectSchema, string } from 'yup';

import { ACTIVE_OWNER_RANKS, ActiveOwnerRank } from '~/models/HousingOwnerApi';

export interface SourceHousingOwner {
  geo_code: string;
  local_id: string;
  idpersonne: string;
  idprocpte: string;
  idprodroit: string;
  locprop_source: number;
  rank: ActiveOwnerRank;
}

export const sourceHousingOwnerSchema: ObjectSchema<SourceHousingOwner> =
  object({
    geo_code: string().required('geo_code is required').length(5),
    local_id: string().required('local_id is required').length(12),
    idpersonne: string().required('idpersonne is required').length(8),
    idprocpte: string().required('idprocpte is required').length(11),
    idprodroit: string().required('idprodroit is required').length(13),
    locprop_source: number().required('locprop_source is required').truncate(),
    rank: number<ActiveOwnerRank>()
      .required('rank is required')
      .oneOf(ACTIVE_OWNER_RANKS)
  });
