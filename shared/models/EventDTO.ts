export interface EventDTO {
  id: string;
  title?: string;
  content?: string;
  contactKind: string;
  ownerId?: string;
  housingId?: string;
  createdAt: Date;
  createdBy: string;
}
