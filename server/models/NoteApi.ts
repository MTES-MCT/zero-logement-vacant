export interface NoteApi {
  id: string;
  title?: string;
  content?: string;
  contactKind: string;
  createdBy: string;
  createdAt: Date;
}

export interface OwnerNoteApi extends NoteApi {
  ownerId: string;
}

export interface HousingNoteApi extends NoteApi {
  housingId: string;
}

export const toEventDTO = (noteApi: NoteApi) => ({
  id: noteApi.id,
  title: noteApi.title,
  content: noteApi.content,
  contactKind: noteApi.contactKind ?? '',
  createdAt: noteApi.createdAt,
  createdBy: noteApi.createdBy,
});
