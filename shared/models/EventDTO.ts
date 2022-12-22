export interface EventDTO {
  id: string;
  title?: string;
  content?: string;
  contactKind: string;
  ownerId?: string;
  housingId?: string;
}

export interface EventCreationDTO {
  title?: string;
  content?: string;
  contactKind: string;
  ownerId?: string;
  housingId?: string[];
}
