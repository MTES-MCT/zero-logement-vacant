import {
  HousingOwnerDTO,
  OwnerRank,
  type BaseHousingOwnerDTO
} from '@zerologementvacant/models';
import { Equivalence } from 'effect';

import { HousingRecordApi } from './HousingApi';
import { OwnerApi, toOwnerDTO } from './OwnerApi';

export const MAX_OWNERS = 6;

export type HousingOwnerNextApi = HousingOwnerDTO;

export type HousingOwnerApi = Pick<
  HousingOwnerDTO,
  | 'rank'
  | 'idprocpte'
  | 'idprodroit'
  | 'locprop'
  | 'relativeLocation'
  | 'absoluteDistance'
  | 'propertyRight'
> &
  OwnerApi & {
    ownerId: string;
    housingId: string;
    housingGeoCode: string;
    startDate: Date | null;
    endDate: Date | null;
    origin: string | null;
    /**
     * @deprecated Hard to maintain because it is computed from the housings
     */
    housingCount?: number;
  };

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
    idprocpte: null,
    idprodroit: null,
    origin: null,
    rank: (i + 1) as OwnerRank,
    startDate: new Date(),
    endDate: null,
    locprop: null,
    relativeLocation: null,
    absoluteDistance: null,
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
    relativeLocation: housingOwner.relativeLocation ?? null,
    absoluteDistance: housingOwner.absoluteDistance ?? null,
    propertyRight: housingOwner.propertyRight
  };
}

