export interface CampaignApi {
    id?: string;
    name: string;
    createdAt?: Date;
    validatedAt?: Date;
    sentAt?: Date;
}

export enum CampaignSteps {
    OwnersValidation, SendingConfirmation
}
