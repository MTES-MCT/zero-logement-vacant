export interface NoteApi {
  id: string;
  content: string;
  noteKind: string;
  createdBy: string;
  createdAt: Date;
}

export interface OwnerNoteApi extends NoteApi {
  ownerId: string;
}

export interface HousingNoteApi extends NoteApi {
  housingId: string;
  housingGeoCode: string;
}
