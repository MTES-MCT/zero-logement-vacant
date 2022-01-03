export interface EventApi {
    id?: string;
    ownerId?: string;
    housingId?: string;
    kind: EventKinds;
    createdBy?: string,
    createdAt?: Date;
    content?: string;
}

export enum EventKinds {
    OwnerUpdate,
    CampaignSend,
    StatusChange,
    Contact
}
