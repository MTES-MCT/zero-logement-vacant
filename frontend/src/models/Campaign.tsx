export interface Campaign {
    id: string;
    name: string;
    validatedAt?: Date;
    sentAt?: Date;
}

export enum CampaignSteps {
    OwnersValidation, SendingConfirmation
}
