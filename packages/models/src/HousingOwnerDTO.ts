import { OwnerDTO } from './OwnerDTO';
import { HousingDTO } from './HousingDTO';

export interface BaseHousingOwnerDTO {
  rank: number;
  idprocpte: string | null;
  idprodroit: string | null;
  locprop: number | null;
}

export type HousingOwnerDTO = BaseHousingOwnerDTO & OwnerDTO;
export type OwnerHousingDTO = BaseHousingOwnerDTO & HousingDTO;

export type HousingOwnerPayloadDTO = BaseHousingOwnerDTO & Pick<OwnerDTO, 'id'>;
