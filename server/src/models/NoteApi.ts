import { NoteDTO } from '@zerologementvacant/models';
import { assert } from 'ts-essentials';

import { fromUserDTO, toUserDTO, UserApi } from '~/models/UserApi';

export interface NoteApi extends Omit<NoteDTO, 'creator'> {
  creator?: UserApi;
}

export function fromNoteDTO(note: NoteDTO): NoteApi {
  return {
    id: note.id,
    content: note.content,
    noteKind: note.noteKind,
    createdBy: note.createdBy,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    creator: note.creator ? fromUserDTO(note.creator) : undefined
  };
}

export function toNoteDTO(note: NoteApi): NoteDTO {
  return {
    id: note.id,
    content: note.content,
    noteKind: note.noteKind,
    createdBy: note.createdBy,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
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
