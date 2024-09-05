import { assert } from 'ts-essentials';

import { UserApi } from '~/models/UserApi';

export interface NoteApi {
  id: string;
  content: string;
  noteKind: string;
  createdBy: string;
  creator?: UserApi;
  createdAt: Date;
}

export interface OwnerNoteApi extends NoteApi {
  ownerId: string;
}

export interface HousingNoteApi extends NoteApi {
  housingId: string;
  housingGeoCode: string;
}

export function isUserModified<Note extends NoteApi>(note: Note): boolean {
  assert(note.creator, 'Event creator is missing');
  const isBeta = /@(zerologementvacant\.)?beta\.gouv\.fr$/;
  return !isBeta.test(note.creator.email);
}
