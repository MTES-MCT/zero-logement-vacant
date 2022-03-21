import { HousingFiltersApi } from './HousingFiltersApi';

export interface CampaignApi {
    id: string;
    establishmentId: string;
    campaignNumber: number;
    startMonth: string;
    kind: CampaignKinds;
    reminderNumber: number;
    filters: HousingFiltersApi;
    createdBy?: string,
    createdAt?: Date;
    validatedAt?: Date;
    exportedAt?: Date;
    sentAt?: Date;
    sendingDate?: string;
}

export interface CampaignBundleApi {
    campaignIds: string[];
    campaignNumber: number;
    reminderNumber: number;
    kind: CampaignKinds;
    filters: HousingFiltersApi;
    housingCount: number;
    waitingCount: number;
    inProgressCount: number;
    notVacantCount: number;
    noActionCount: number;
    exitCount: number;
    npaiCount: number;
    ownerCount: number;
}

export enum CampaignSteps {
    OwnersValidation, Export, Sending, InProgess
}

export enum CampaignKinds {
    Initial, Remind, Surveying, DoorToDoor, BeforeZlv
}
