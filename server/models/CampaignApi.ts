export interface CampaignApi {
    id: string;
    establishmentId: number;
    campaignNumber: number;
    startMonth: string;
    kind: string;
    filters: string[];
    createdBy?: string,
    createdAt?: Date;
    validatedAt?: Date;
    exportedAt?: Date;
    sentAt?: Date;
    sendingDate?: string;
    housingCount?: number;
    ownerCount?: number;
}

export enum CampaignSteps {
    OwnersValidation, Export, Sending, InProgess
}
