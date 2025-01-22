import { assert } from 'ts-essentials';

import { NoteDTO } from '@zerologementvacant/models';
import { toUserDTO, UserApi } from '~/models/UserApi';

export interface NoteApi extends Omit<NoteDTO, 'creator' | 'createdAt'> {
  createdAt: Date;
  creator?: UserApi;
}

export function toNoteDTO(note: NoteApi): NoteDTO {
  return {
    id: note.id,
    content: note.content,
    noteKind: note.noteKind,
    createdBy: note.createdBy,
    createdAt: note.createdAt.toJSON(),
    creator: note.creator ? toUserDTO(note.creator) : undefined
  };
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
