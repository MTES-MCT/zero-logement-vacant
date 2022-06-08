import { AddressApi } from './AddressApi';

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
    address: AddressApi;
    fullName: string;
    administrator?: string;
    birthDate?: string;
    email?: string;
    phone?: string;
}

export interface HousingOwnerApi extends OwnerApi {
    housingId: string;
    rank: number;
    startDate?: Date;
    endDate?: Date;
}
