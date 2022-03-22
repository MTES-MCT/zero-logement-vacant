import { HousingFilters } from './HousingFilters';
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface DraftCampaign {
    startMonth: string;
    kind: CampaignKinds;
    filters: HousingFilters;
}

export interface CampaignBundleId {
    campaignNumber?: number;
    reminderNumber?: number;
}

export interface Campaign {
    id: string;
    campaignNumber: number;
    reminderNumber: number;
    startMonth: string;
    kind: CampaignKinds;
    name: string;
    filters: HousingFilters;
    createdAt: Date;
    validatedAt?: Date;
    exportedAt?: Date;
    sentAt?: Date;
}

export interface CampaignBundle extends CampaignBundleId{
    campaignIds: string[];
    startMonth: string;
    kind: CampaignKinds;
    name: string;
    filters: HousingFilters;
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

export const getCampaignBundleId = (campaignBundle: CampaignBundle | Campaign) => {
    return {campaignNumber: campaignBundle.campaignNumber, reminderNumber: campaignBundle.reminderNumber}
}

export const campaignName = (kind: CampaignKinds, startMonth: string, campaignNumber?: number, reminderNumber?: number) => {
    return campaignNumber === undefined ?
        'Tous les logements suivis' :
        !campaignNumber ? 'Logements hors campagne' :
        `C${campaignNumber} - ${format(parse(startMonth, 'yyMM', new Date()), 'MMM yyyy', { locale: fr })}
        ${' - ' + getCampaignKindLabel(kind)}${(reminderNumber ?? 0) > 0 ? ' n°' + reminderNumber : ''}`
}

export const campaignStep = (campaign?: Campaign) => {
    return (!campaign?.validatedAt) ? CampaignSteps.OwnersValidation :
        !campaign?.exportedAt ? CampaignSteps.Export :
            !campaign?.sentAt ? CampaignSteps.Sending :
                CampaignSteps.InProgess
}

export const returnRate = (campaignBundle: CampaignBundle) => {
    return (campaignBundle.housingCount - campaignBundle.npaiCount) !== 0 ?
        Math.round(100 - campaignBundle.waitingCount / (campaignBundle.housingCount - campaignBundle.npaiCount) * 100) :
        0;
}


export const campaignBundleIdApiFragment = (campaignBundleId: CampaignBundleId) => {
    return `number/${campaignBundleId.campaignNumber ?? ''}${(campaignBundleId.reminderNumber ?? -1) >= 0 ? `/${campaignBundleId.reminderNumber}` : ''}`
}

export const campaignBundleIdUrlFragment = (campaignBundleId: CampaignBundleId) => {
    return `C${campaignBundleId.campaignNumber ?? ''}${(campaignBundleId.reminderNumber ?? -1) >= 0 ? `/R${campaignBundleId.reminderNumber}` : ''}`
}
