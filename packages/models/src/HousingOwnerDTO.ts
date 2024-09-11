import { OwnerDTO } from './OwnerDTO';
import { HousingDTO } from './HousingDTO';

interface HousingOwner {
  rank: number;
  idprocpte: string | null;
  idprodroit: string | null;
  locprop: number | null;
}

export type HousingOwnerDTO = HousingOwner & OwnerDTO;
export type OwnerHousingDTO = HousingOwner & HousingDTO;

export type HousingOwnerPayloadDTO = HousingOwner & Pick<OwnerDTO, 'id'>;
