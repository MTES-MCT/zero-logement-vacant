import { OwnerDTO } from '@zerologementvacant/models';
import { Address } from './Address';

export interface DraftOwner {
  rawAddress: string[];
  fullName: string;
  birthDate?: Date;
  email?: string;
  phone?: string;
}

export interface Owner {
  id: string;
  rawAddress: string[];
  fullName: string;
  administrator?: string;
  birthDate?: Date;
  email?: string;
  phone?: string;
  kind?: string;
  banAddress?: Address;
  additionalAddress?: string;
}

export function toOwnerDTO(owner: Owner): OwnerDTO {
  return {
    id: owner.id,
    rawAddress: owner.rawAddress,
    fullName: owner.fullName,
    administrator: owner.administrator,
    birthDate: owner.birthDate,
    email: owner.email,
    phone: owner.phone,
    kind: owner.kind,
    banAddress: owner.banAddress,
    additionalAddress: owner.additionalAddress,
  };
}

export interface HousingOwner extends Owner {
  housingId: string;
  rank: number;
  startDate?: Date;
  endDate?: Date;
  origin?: string;
  housingCount?: number;
}
export const isHousingOwner = (o: Owner | HousingOwner): o is HousingOwner => {
  return (o as HousingOwner).housingId !== undefined;
};

export const getHousingOwnerRankLabel = (rank: number) =>
  !rank
    ? 'Ancien propriétaire'
    : rank === 1
      ? 'Propriétaire principal'
      : `${rank}ème ayant droit`;
