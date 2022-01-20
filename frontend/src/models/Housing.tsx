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
    dataYears: number[];
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
    previousStatus: CampaignHousingStatus,
    status: CampaignHousingStatus,
    step?: string,
    precision?: string,
    contactKind?: string,
    comment?: string
}

export const selectedHousingCount = (selectedHousing: SelectedHousing, totalCount: number) => {
    return selectedHousing.all ? totalCount - selectedHousing.ids.length : selectedHousing.ids.length
}

export const HousingSort = (h1: Housing, h2: Housing) =>
    Math.max(...h1.dataYears) === Math.max(...h2.dataYears) ?
        h1.invariant.localeCompare(h2.invariant) :
        Math.max(...h1.dataYears) - Math.max(...h2.dataYears);
