import { number, object, ObjectSchema, string } from 'yup';

import { POSITIVE_RANKS, PositiveRank } from '~/models/HousingOwnerApi';

export interface SourceHousingOwner {
  geo_code: string;
  local_id: string;
  idpersonne: string;
  idprocpte: string;
  idprodroit: string;
  locprop: number;
  rank: PositiveRank;
}

export const sourceHousingOwnerSchema: ObjectSchema<SourceHousingOwner> =
  object({
    geo_code: string().required('geo_code is required').length(5),
    local_id: string().required('local_id is required').length(12),
    idpersonne: string().required('idpersonne is required').length(8),
    idprocpte: string().required('idprocpte is required').length(11),
    idprodroit: string().required('idprodroit is required').length(13),
    locprop: number().required('locprop is required').truncate(),
    rank: number<PositiveRank>()
      .required('rank is required')
      .oneOf(POSITIVE_RANKS)
  });
