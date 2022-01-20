export interface CampaignApi {
    id: string;
    establishmentId: string;
    campaignNumber: number;
    startMonth: string;
    reminderNumber: string;
    filters: string[];
    createdBy?: string,
    createdAt?: Date;
    validatedAt?: Date;
    exportedAt?: Date;
    sentAt?: Date;
    sendingDate?: string;
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
