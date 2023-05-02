export interface Event {
  id: string;
  ownerId: string;
  housingId?: string;
  campaignId?: string;
  createdAt: Date;
  title?: string;
  content?: string;
  contactKind?: string;
}
