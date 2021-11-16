import { HousingFilters } from './HousingFilters';

export interface DraftCampaign {
    startMonth: string;
    kind: CampaignKinds;
    filters: HousingFilters;
}

export interface Campaign {
    id: string;
    campaignNumber: number;
    startMonth: string;
    kind: CampaignKinds;
    name: string;
    filters: HousingFilters;
    createdAt: Date;
    validatedAt?: Date;
    sentAt?: Date;
}

export enum CampaignKinds {
    Initial
}

export enum CampaignSteps {
    OwnersValidation, SendingConfirmation
}
