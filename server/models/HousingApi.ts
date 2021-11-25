import { AddressApi } from './AddressApi';
import { OwnerApi } from './OwnerApi';

export interface HousingApi {
    id: string;
    invariant: string,
    rawAddress: string[];
    address: AddressApi;
    owner: OwnerApi;
}
