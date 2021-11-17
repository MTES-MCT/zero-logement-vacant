export interface CampaignApi {
    id: string;
    campaignNumber: number;
    startMonth: string;
    kind: string;
    filters: string[];
    createdAt?: Date;
    validatedAt?: Date;
    exportedAt?: Date;
    sentAt?: Date;
    housingCount?: number;
}

export enum CampaignSteps {
    OwnersValidation, Export, Sending, InProgess
}
