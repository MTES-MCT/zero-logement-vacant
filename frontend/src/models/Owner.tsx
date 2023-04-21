import { OwnerDTO } from '../../../shared/models/OwnerDTO';

export interface DraftOwner {
  rawAddress: string[];
  fullName: string;
  birthDate?: Date;
  email?: string;
  phone?: string;
}

export interface Owner extends Omit<OwnerDTO, 'birthDate'> {
  birthDate?: Date;
}

export interface HousingOwner extends Owner {
  housingId: string;
  rank: number;
  startDate?: Date;
  endDate?: Date;
  origin?: string;
  housingCount?: number;
}
