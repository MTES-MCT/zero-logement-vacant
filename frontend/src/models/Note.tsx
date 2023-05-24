import { Housing } from './Housing';
import { Owner } from './Owner';

export interface NoteCreation {
  title: string;
  content: string;
  contactKind: string;
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

export interface Note extends Partial<NoteCreation> {
  createdBy: string;
  createdAt: Date;
}
