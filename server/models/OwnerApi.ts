import { AddressApi } from './AddressApi';

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
