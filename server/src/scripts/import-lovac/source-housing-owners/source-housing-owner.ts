import {
  ACTIVE_OWNER_RANKS,
  ActiveOwnerRank,
  PROPERTY_RIGHT_VALUES,
  PropertyRight
} from '@zerologementvacant/models';
import { number, object, ObjectSchema, string } from 'yup';

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

export const sourceHousingOwnerSchema: ObjectSchema<SourceHousingOwner> =
  object({
    geo_code: string().required('geo_code is required').length(5),
    local_id: string().required('local_id is required').length(12),
    idpersonne: string().required('idpersonne is required').length(8),
    idprocpte: string().required('idprocpte is required').length(11),
    idprodroit: string().required('idprodroit is required').length(13),
    locprop_source: number().required('locprop_source is required').truncate(),
    property_right: string()
      .required('property_right is required')
      .oneOf(PROPERTY_RIGHT_VALUES),
    rank: number<ActiveOwnerRank>()
      .required('rank is required')
      .oneOf(ACTIVE_OWNER_RANKS)
  });
