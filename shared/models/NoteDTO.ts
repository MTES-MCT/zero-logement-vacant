export interface NoteCreationDTO {
  title?: string;
  content?: string;
  contactKind: string;
  ownerId?: string;
  housingIds?: string[];
}
