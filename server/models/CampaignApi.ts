export interface CampaignApi {
    id: string;
    campaignNumber: number;
    startMonth: string;
    kind: string;
    filters: string[];
    createdAt?: Date;
    validatedAt?: Date;
    sentAt?: Date;
}

export enum CampaignSteps {
    OwnersValidation, SendingConfirmation
}
