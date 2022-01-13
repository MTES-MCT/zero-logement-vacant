export interface EventApi {
    id?: string;
    ownerId?: string;
    housingId?: string;
    campaignId?: string;
    kind: EventKinds;
    createdBy?: string,
    createdAt?: Date;
    content?: string;
    contactKind?: string;
}

export enum EventKinds {
    OwnerUpdate,
    CampaignSend,
    StatusChange,
    Contact
}
