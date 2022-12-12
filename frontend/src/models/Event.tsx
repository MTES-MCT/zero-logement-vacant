export interface Event {
  id: string;
  ownerId: string;
  housingId?: string;
  campaignId?: string;
  kind: EventKinds;
  createdAt: Date;
  title?: string;
  content?: string;
  contactKind?: string;
}

export enum EventKinds {
  OwnerUpdate,
  CampaignSend,
  StatusChange,
}
