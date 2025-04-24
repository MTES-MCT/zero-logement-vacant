import { HousingDTO } from './HousingDTO';
import { OwnerDTO } from './OwnerDTO';

export interface BaseHousingOwnerDTO {
  // TODO: move OwnerRank from server/ to models/ and use it here
  rank: -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6;
  idprocpte: string | null;
  idprodroit: string | null;
  locprop: number | null;
}

export type HousingOwnerDTO = BaseHousingOwnerDTO & OwnerDTO;
export type OwnerHousingDTO = BaseHousingOwnerDTO & HousingDTO;

export type HousingOwnerPayloadDTO = BaseHousingOwnerDTO & Pick<OwnerDTO, 'id'>;

export function isSecondaryOwner(
  housingOwner: Pick<HousingOwnerDTO, 'rank'>
): boolean {
  return housingOwner.rank >= 2;
}
