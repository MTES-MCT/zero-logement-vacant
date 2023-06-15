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
export const isHousingOwner = (o: Owner | HousingOwner): o is HousingOwner => {
  return (o as HousingOwner).housingId !== undefined;
};

export const getHousingOwnerRankLabel = (rank: number) =>
  !rank
    ? 'Ancien propriétaire'
    : rank === 1
    ? 'Propriétaire principal'
    : `${rank}ème ayant droit`;
