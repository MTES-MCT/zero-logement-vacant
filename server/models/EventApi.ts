export interface EventApi {
  id?: string;
  ownerId?: string;
  housingId?: string;
  campaignId?: string;
  kind: EventKinds;
  createdBy?: string;
  createdAt?: Date;
  title?: string;
  content?: string;
  contactKind?: string;
}

export enum EventKinds {
  OwnerUpdate,
  CampaignSend,
  StatusChange,
  Contact,
  OwnerCreation,
  HousingOwnersUpdate,
  NoteCreation,
}
