export interface OwnerDTO {
  id: string;
  rawAddress: string[];
  fullName: string;
  administrator?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
}

export interface HousingOwner extends OwnerDTO {
  rank: number;
  startDate?: Date;
  endDate?: Date;
  origin?: string;
  housingCount?: number;
}
