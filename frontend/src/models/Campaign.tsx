import { HousingFilters } from './HousingFilters';
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import { percent } from '../utils/numberUtils';

export interface DraftCampaign {
    startMonth: string;
    kind: CampaignKinds;
    filters: HousingFilters;
    title?: string;
}

export interface Campaign {
    id: string;
    campaignNumber: number;
    reminderNumber: number;
    startMonth: string;
    kind: CampaignKinds;
    name: string;
    filters: HousingFilters;
    title?: string;
    createdAt: Date;
    validatedAt?: Date;
    exportedAt?: Date;
    sentAt?: Date;
}

export interface CampaignBundleId {
    campaignNumber?: number;
    reminderNumber?: number;
}

export interface CampaignBundle extends CampaignBundleId {
    campaignIds: string[];
    startMonth: string;
    kind: CampaignKinds;
    name: string;
    filters: HousingFilters;
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

export enum CampaignKinds {
    Initial, Surveying, DoorToDoor, BeforeZlv
}

export const getCampaignKindLabel = (kind: CampaignKinds) => {
    switch (kind) {
        case CampaignKinds.Initial:
            return 'Courrier postal';
        case CampaignKinds.Surveying:
            return 'Arpentage';
        case CampaignKinds.DoorToDoor:
            return 'Porte à porte';
        case CampaignKinds.BeforeZlv:
            return 'Dossiers gérés avant l\'outil';
    }
}

export enum CampaignSteps {
    OwnersValidation, Export, Sending, InProgress
}

export const CampaignNumberSort = (c1?: Campaign, c2?: Campaign) => {
    return (c1 && c2) ?
        c1.campaignNumber < c2.campaignNumber ? -1 :
            c1.campaignNumber > c2.campaignNumber ? 1 :
                c1.reminderNumber < c2.reminderNumber ? -1 :
                    c1.reminderNumber > c2.reminderNumber ? 1 : 0 :
        c1 ? 1 :
            c2 ? -1 :
                0
}

export const getCampaignBundleId = (campaignBundle?: CampaignBundle | Campaign) => {
    if (campaignBundle) {
        return {campaignNumber: campaignBundle.campaignNumber, reminderNumber: campaignBundle.reminderNumber}
    }
}

export const campaignReminderName = (reminderNumber?: number | string, campaignKind?: CampaignKinds) => {
    return reminderNumber !== undefined && campaignKind !== undefined ? (Number(reminderNumber) > 0 ? 'Relance n°' + reminderNumber : getCampaignKindLabel(campaignKind)) : ''
}

export const campaignPartialName = (startMonth: string, campaignNumber?: number | string, reminderNumber?: number | string, campaignKind?: CampaignKinds, campaignTitle?: string) => {
    return campaignNumber === undefined ?
        'Tous les logements suivis' :
        !campaignNumber ? 'Logements hors campagne' :
            [
                `C${Number(campaignNumber)}`,
                format(parse(startMonth, 'yyMM', new Date()), 'MMM yyyy', { locale: fr }),
                campaignTitle,
                campaignReminderName(reminderNumber, campaignKind)
            ].filter(_ => _?.length).join(' - ')
}

export const campaignFullName = (campaign: Campaign | CampaignBundle) => {
    return campaignPartialName(campaign.startMonth, campaign.campaignNumber, campaign.reminderNumber, campaign.kind, campaign.title)
}

export const campaignStep = (campaign?: Campaign) => {
    return (!campaign?.validatedAt) ? CampaignSteps.OwnersValidation :
        !campaign?.exportedAt ? CampaignSteps.Export :
            !campaign?.sentAt ? CampaignSteps.Sending :
                CampaignSteps.InProgress
}

export const returnRate = (campaignBundle: CampaignBundle) => {
    return (campaignBundle.housingCount - campaignBundle.npaiCount) !== 0 ?
        Math.round(100 - percent(campaignBundle.waitingCount, (campaignBundle.housingCount - campaignBundle.npaiCount))) :
        0;
}


export const campaignBundleIdApiFragment = (campaignBundleId: CampaignBundleId) => {
    return `number/${campaignBundleId.campaignNumber ?? ''}${(campaignBundleId.reminderNumber ?? -1) >= 0 ? `/${campaignBundleId.reminderNumber}` : ''}`
}

export const campaignBundleIdUrlFragment = (campaignBundleId?: CampaignBundleId) => {
    return campaignBundleId ? `C${campaignBundleId.campaignNumber ?? ''}${(campaignBundleId.reminderNumber ?? -1) >= 0 ? `/R${campaignBundleId.reminderNumber}` : ''}` : 'C'
}
