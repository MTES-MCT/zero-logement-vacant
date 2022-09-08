import { AddressApi } from './AddressApi';
import { OwnerApi } from './OwnerApi';
import { HousingStatusApi } from './HousingStatusApi';

export interface HousingApi {
    id: string;
    invariant: string,
    localId?: string,
    cadastralReference: string,
    buildingLocation: string,
    inseeCode: string,
    rawAddress: string[];
    address: AddressApi;
    latitude?: number;
    longitude?: number;
    localityKind: string;
    housingScopes?: string[];
    owner: OwnerApi;
    livingArea: number;
    housingKind: string;
    roomsCount: number;
    buildingYear?: number;
    vacancyStartYear: number;
    vacancyReasons: string[];
    uncomfortable: boolean;
    cadastralClassification: number;
    taxed: boolean;
    ownershipKind: OwnershipKindsApi;
    buildingHousingCount?: number,
    buildingVacancyRate: number,
    campaignIds: string[];
    dataYears: number[];
    status?: HousingStatusApi;
    subStatus?: string;
    precisions?: string[];
    lastContact?: Date;
}

export interface HousingUpdateApi {
    status: HousingStatusApi,
    subStatus?: string,
    precisions?: string[],
    contactKind: string,
    vacancyReasons?: string[],
    comment: string
}

export enum OwnershipKindsApi {
    Single = 'single',
    CoOwnership = 'co',
    Other = 'other'
}

export const getOwnershipKindFromValue = (value?: string) => {
    return !value ? OwnershipKindsApi.Single :
        OwnershipKindValues[OwnershipKindsApi.CoOwnership].indexOf(value) !== -1 ? OwnershipKindsApi.CoOwnership :
            OwnershipKindValues[OwnershipKindsApi.Other].indexOf(value) !== -1 ? OwnershipKindsApi.Other : undefined
}

export const OwnershipKindValues = {
    [OwnershipKindsApi.CoOwnership]: ['CL'],
    [OwnershipKindsApi.Other]: ['BND', 'CLV', 'CV', 'MP', 'TF']
}
