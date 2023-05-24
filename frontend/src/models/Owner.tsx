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
}

export interface HousingOwner extends Owner {
  housingId: string;
  rank: number;
  startDate?: Date;
  endDate?: Date;
  origin?: string;
  housingCount?: number;
}

export const getHousingOwnerRankLabel = (housingOwner: HousingOwner) =>
  !housingOwner.rank
    ? 'Ancien propriétaire'
    : housingOwner.rank === 1
    ? 'Propriétaire principal'
    : `${housingOwner.rank}ème ayant droit`;
