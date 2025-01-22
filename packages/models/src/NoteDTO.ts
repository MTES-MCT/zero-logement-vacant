export interface NoteDTO {
  id: string;
  content: string;
  noteKind: string;
  createdBy: string;
  createdAt: string;
}

export type NotePayloadDTO = Pick<NoteDTO, 'content'>;
