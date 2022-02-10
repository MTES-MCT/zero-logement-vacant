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
