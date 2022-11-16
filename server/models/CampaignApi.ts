import { HousingFiltersApi } from './HousingFiltersApi';
import { format, formatISO } from 'date-fns';

export interface CampaignApi {
    id: string;
    establishmentId: string;
    campaignNumber: number;
    startMonth: string;
    kind: CampaignKinds;
    reminderNumber: number;
    filters: HousingFiltersApi;
    title?: string;
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
    title?: string;
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
    Initial, Surveying, DoorToDoor, BeforeZlv
}

export const DefaultCampaign = {
    campaignNumber: 0,
    startMonth: format(new Date(), 'yyMM'),
    filters: {},
    createdAt: new Date(),
    validatedAt: new Date(),
    exportedAt: new Date(),
    sentAt: new Date(),
    sendingDate: formatISO(new Date())
}
