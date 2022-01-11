export interface OwnerEvent {
    id: string;
    ownerId: string;
    housingId?: string;
    campaignId?: string;
    kind: EventKinds;
    createdAt: Date;
    content?: string;
}

export enum EventKinds {
    OwnerUpdate,
    CampaignSend,
    StatusChange
}
