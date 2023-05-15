export interface DraftOwnerApi {
  rawAddress: string[];
  fullName: string;
  birthDate?: string;
  email?: string;
  phone?: string;
}

export interface OwnerApi {
  id: string;
  rawAddress: string[];
  fullName: string;
  administrator?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
  kind?: string;
  kindDetail?: string;
}

export interface HousingOwnerApi extends OwnerApi {
  housingId: string;
  rank: number;
  startDate?: Date;
  endDate?: Date;
  origin?: string;
  housingCount?: number;
}
