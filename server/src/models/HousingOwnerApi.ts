import {
  HousingOwnerDTO,
  OwnerRank,
  PropertyRight
} from '@zerologementvacant/models';
import { isDefined, isUndefined } from '@zerologementvacant/utils';
import { compare, includeSameMembers } from '~/utils/compareUtils';
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

export function compareHousingOwners(
  a: HousingOwnerApi,
  b: HousingOwnerApi
): Partial<HousingOwnerApi> {
  return compare(a, b, ['id', 'housingId', 'housingGeoCode', 'rank']);
}

export function equals(a?: HousingOwnerApi, b?: HousingOwnerApi): boolean {
  if ([a, b].every(isUndefined)) {
    return true;
  }

  return (
    isDefined(a) &&
    isDefined(b) &&
    Object.values(compareHousingOwners(a, b)).length === 0
  );
}

export const includeSameHousingOwners = includeSameMembers(equals);
