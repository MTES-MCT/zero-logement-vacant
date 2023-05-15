export interface NoteCreationDTO {
  title?: string;
  content?: string;
  contactKind: string;
  ownerId?: string;
  housingIds?: string[];
}

export interface NoteDTO {
  title: string;
  content: string;
  contactKind: string;
  createdBy: string;
  createdAt: string;
}
