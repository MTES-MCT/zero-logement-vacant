import { AddressApi } from './AddressApi';
import { OwnerApi } from './OwnerApi';

export interface HousingApi {
    id: string;
    invariant: string,
    rawAddress: string[];
    address: AddressApi;
    latitude?: number;
    longitude?: number;
    owner: OwnerApi;
    livingArea: number;
    housingKind: string;
    roomsCount: number;
    buildingYear?: number;
    vacancyStartYear: number;
    campaignIds: string[];
}
