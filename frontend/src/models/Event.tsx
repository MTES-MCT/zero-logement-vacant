export interface Event {
  id: string;
  ownerId: string;
  housingId?: string;
  campaignId?: string;
  createdAt: Date;
  createdBy: string;
  title?: string;
  content?: string;
  contactKind?: string;
}
