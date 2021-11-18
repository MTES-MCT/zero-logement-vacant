import { AddressApi } from './AddressApi';

export interface HousingApi {
    id: string;
    rawAddress: string;
    address: AddressApi
}
