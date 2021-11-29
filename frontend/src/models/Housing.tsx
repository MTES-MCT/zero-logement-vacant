import { Address } from 'cluster';
import { Owner } from './Owner';

export interface Housing {
    id: string;
    invariant: string;
    rawAddress: string[];
    address: Address;
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
