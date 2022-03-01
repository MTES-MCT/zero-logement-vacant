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
    reminderNumber: number;
    name: string;
    filters: HousingFilters;
    createdAt: Date;
    validatedAt?: Date;
    exportedAt?: Date;
    sentAt?: Date;
    housingCount: number;
    waitingCount: number;
    inProgressCount: number;
    notVacantCount: number;
    noActionCount: number;
    exitCount: number;
    npaiCount: number;
    ownerCount: number;
}

export enum CampaignKinds {
    Initial, Remind, Surveying, DoorToDoor, BeforeZlv
}

export const getCampaignKindLabel = (kind: CampaignKinds) => {
    switch (kind) {
        case CampaignKinds.Initial:
            return 'Envoi initial';
        case CampaignKinds.Remind:
            return 'Relance';
        case CampaignKinds.Surveying:
            return 'Arpentage';
        case CampaignKinds.DoorToDoor:
            return 'Porte à porte';
        case CampaignKinds.BeforeZlv:
            return 'Dossiers gérés avant l\'outil';
    }
}

export enum CampaignSteps {
    OwnersValidation, Export, Sending, InProgess
}

export const campaignNumberSort = (c1: Campaign, c2: Campaign) => {
    return c1.campaignNumber < c2.campaignNumber ? -1 :
        c1.campaignNumber > c2.campaignNumber ? 1 : 0
}

export const campaignStep = (campaign?: Campaign) => {
    return (!campaign?.validatedAt) ? CampaignSteps.OwnersValidation :
        !campaign?.exportedAt ? CampaignSteps.Export :
            !campaign?.sentAt ? CampaignSteps.Sending :
                CampaignSteps.InProgess
}

export const returnRate = (campaign: Campaign) => campaign.housingCount === 0 ? Math.round(100 - campaign.waitingCount / (campaign.housingCount - campaign.npaiCount) * 100) : 0;
