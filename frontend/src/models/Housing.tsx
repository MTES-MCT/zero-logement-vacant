import { Owner } from './Owner';
import { Address } from './Address';

export interface Housing {
    id: string;
    invariant: string;
    rawAddress: string[];
    address: Address;
    latitude?: number;
    longitude?: number;
    owner: Owner;
    livingArea: number;
    housingKind: string;
    roomsCount: number;
    buildingYear?: number;
    vacancyStartYear: number;
    campaignIds: string[];
}

export interface SelectedHousing {
    all: boolean;
    ids: string[];
}
