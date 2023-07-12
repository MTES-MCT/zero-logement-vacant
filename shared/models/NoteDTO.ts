export interface NoteCreationDTO {
  content: string;
  noteKind: string;
  ownerId?: string;
  housingIds?: string[];
}

export interface NoteDTO {
  content: string;
  noteKind: string;
  createdBy: string;
  createdAt: string;
}
