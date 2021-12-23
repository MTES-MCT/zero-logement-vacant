export interface OwnerEvent {
    id: string;
    ownerId: string;
    kind: EventKinds;
    createdAt: Date;
    content?: string;
    details?: string;
}

export enum EventKinds {
    OwnerUpdate,
    CampaignSend,
    StatusChange
}
