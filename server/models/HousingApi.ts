import { AddressApi } from './AddressApi';
import { OwnerApi } from './OwnerApi';
import { CampaignHousingStatusApi } from './CampaignHousingStatusApi';

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
    dataYears: number[];
}

export interface CampaignHousingApi extends HousingApi {
    campaignId: string;
    status?: CampaignHousingStatusApi;
    step?: string;
    precision?: string;
}

export interface CampaignHousingUpdateApi {
    previousStatus: CampaignHousingStatusApi,
    status: CampaignHousingStatusApi,
    step?: string,
    precision?: string,
    contactKind: string,
    comment: string
}
