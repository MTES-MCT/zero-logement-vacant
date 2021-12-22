import { Owner } from './Owner';
import { Address } from './Address';
import { CampaignHousingStatus } from './CampaignHousingState';

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

export interface CampaignHousing extends Housing {
    campaignId: string;
    status: CampaignHousingStatus;
    step?: string;
    precision?: string;
}

export interface CampaignHousingUpdate {
    prevStatus: CampaignHousingStatus,
    status: CampaignHousingStatus,
    step?: string,
    precision?: string
}
