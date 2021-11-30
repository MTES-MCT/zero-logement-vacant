export interface EventApi {
    id?: string;
    ownerId?: string;
    housingId?: string;
    kind: EventKinds;
    createdAt?: Date;
    content?: string;
}

export enum EventKinds {
    OwnerUpdate,
    CampaignSend
}
