import { NoteDTO } from '@zerologementvacant/models';
import { Housing } from './Housing';
import { Owner } from './Owner';
import { fromUserDTO, User } from './User';

export interface NoteCreation {
  content: string;
}

export interface HousingNoteCreation extends NoteCreation {
  housingList: Housing[];
}

export interface OwnerNoteCreation extends NoteCreation {
  owner: Owner;
}

export const isHousingNoteCreation = (
  noteCreation: NoteCreation
): noteCreation is HousingNoteCreation => {
  return (noteCreation as HousingNoteCreation).housingList !== undefined;
};

export const isOwnerNoteCreation = (
  noteCreation: NoteCreation
): noteCreation is OwnerNoteCreation => {
  return (noteCreation as OwnerNoteCreation).owner !== undefined;
};

export type Note = Omit<NoteDTO, 'creator'> & {
  creator: User;
};

export function fromNoteDTO(note: NoteDTO): Note {
  if (!note.creator) {
    throw new Error('Note creator is missing');
  }

  return {
    ...note,
    creator: fromUserDTO(note.creator)
  };
}
