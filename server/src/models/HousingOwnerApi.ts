import {
  HousingOwnerDTO,
  OwnerRank,
  PropertyRight,
  type BaseHousingOwnerDTO
} from '@zerologementvacant/models';
import { Equivalence } from 'effect';

import { HousingRecordApi } from './HousingApi';
import { OwnerApi, toOwnerDTO } from './OwnerApi';

export const MAX_OWNERS = 6;

export interface HousingOwnerApi extends OwnerApi {
  ownerId: string;
  housingId: string;
  housingGeoCode: string;
  /**
   * Should be come `rank: Rank`
   */
  rank: OwnerRank;
  startDate?: Date | null;
  endDate?: Date | null;
  origin?: string | null;
  /**
   * @deprecated Hard to maintain because it is computed from the housings
   */
  housingCount?: number;
  // New properties
  idprocpte?: string | null;
  idprodroit?: string | null;
  locprop?: number | null;
  propertyRight: PropertyRight | null;
}

export type OwnerHousingApi = BaseHousingOwnerDTO & {
  housing: HousingRecordApi;
};

/**
 * Consider two housing owners equivalent
 * if they refer to the same housing and owner.
 */
export const HOUSING_OWNER_EQUIVALENCE: Equivalence.Equivalence<HousingOwnerApi> =
  Equivalence.struct({
    housingGeoCode: Equivalence.string,
    housingId: Equivalence.string,
    ownerId: Equivalence.string
  });

/**
 * Consider two housing owners equivalent
 * if they refer to the same housing, owner and rank.
 */
export const HOUSING_OWNER_RANK_EQUIVALENCE: Equivalence.Equivalence<HousingOwnerApi> =
  Equivalence.struct({
    housingGeoCode: Equivalence.string,
    housingId: Equivalence.string,
    ownerId: Equivalence.string,
    rank: Equivalence.number
  });

/**
 * @deprecated
 * @param housing
 * @param owners
 */
export function toHousingOwnersApi(
  housing: HousingRecordApi,
  owners: OwnerApi[]
): HousingOwnerApi[] {
  return owners.map((owner, i) => ({
    ...owner,
    ownerId: owner.id,
    housingId: housing.id,
    housingGeoCode: housing.geoCode,
    rank: (i + 1) as OwnerRank,
    startDate: new Date(),
    propertyRight: null
  }));
}

export function toHousingOwnerDTO(
  housingOwner: HousingOwnerApi
): HousingOwnerDTO {
  return {
    ...toOwnerDTO(housingOwner),
    id: housingOwner.ownerId,
    rank: housingOwner.rank,
    idprocpte: housingOwner.idprocpte ?? null,
    idprodroit: housingOwner.idprodroit ?? null,
    locprop: housingOwner.locprop ?? null,
    propertyRight: housingOwner.propertyRight
  };
}

