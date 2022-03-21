import { AddressApi } from './AddressApi';
import { OwnerApi } from './OwnerApi';
import { HousingStatusApi } from './HousingStatusApi';

export interface HousingApi {
    id: string;
    invariant: string,
    inseeCode: string,
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
    dataYears: number[];
    status?: HousingStatusApi;
    subStatus?: string;
    precision?: string;
}

export interface HousingUpdateApi {
    status: HousingStatusApi,
    subStatus?: string,
    precision?: string,
    contactKind: string,
    comment: string
}
