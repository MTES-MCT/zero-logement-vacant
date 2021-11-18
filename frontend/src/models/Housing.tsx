import { Address } from 'cluster';

export interface Housing {
    id: string;
    rawAddress: string;
    address: Address;
    ownerFullName: string;
    ownerAddress: string;
    ownerId: string;
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
