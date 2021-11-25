import { Address } from 'cluster';
import { Owner } from './Owner';

export interface Housing {
    id: string;
    rawAddress: string[];
    address: Address;
    owner: Owner;
}

export interface HousingDetails {
    id: string;
    address: string;
    municipality: string;
    surface?: number;
    kind?: string;
    rooms?: number;
    buildingYear: number;
    vacancyStart: number;
}


export interface SelectedHousing {
    all: boolean;
    ids: string[];
}
