import db from './db';
import { HousingNoteApi, NoteApi, OwnerNoteApi } from '../models/NoteApi';

export const notesTable = 'notes';
export const ownerNotesTable = 'owner_notes';
export const housingNotesTable = 'housing_notes';

const Notes = () => db<NoteDBO>(notesTable);
const OwnerNotes = () =>
  db<{ note_id: string; owner_id: string }>(ownerNotesTable);
const HousingNotes = () =>
  db<{ note_id: string; housing_id: string }>(housingNotesTable);

const insertOwnerNote = async (ownerNoteApi: OwnerNoteApi): Promise<void> => {
  console.log('Insert OwnerNoteApi');
  await Notes().insert(formatNoteApi(ownerNoteApi));
  await OwnerNotes().insert({
    note_id: ownerNoteApi.id,
    owner_id: ownerNoteApi.ownerId,
  });
};
const insertManyHousingNotes = async (
  housingNotes: HousingNoteApi[]
): Promise<void> => {
  console.log('Insert %d HousingNoteApi', housingNotes.length);
  if (housingNotes.length) {
    await Notes().insert(
      housingNotes.map((housingNote) => formatNoteApi(housingNote))
    );
    await HousingNotes().insert(
      housingNotes.map((housingNote) => ({
        note_id: housingNote.id,
        housing_id: housingNote.housingId,
      }))
    );
  }
};

const findNotes = async (
  tableName: string,
  columnName: string,
  value: string
): Promise<NoteApi[]> => {
  const notes = await Notes()
    .select(`${notesTable}.*`)
    .join(tableName, `${tableName}.note_id`, `${notesTable}.id`)
    .where(`${tableName}.${columnName}`, value)
    .orderBy(`${notesTable}.created_at`, 'desc');
  return notes.map(parseNoteApi);
};

const findOwnerNotes = async (ownerId: string): Promise<NoteApi[]> => {
  console.log('List noteApi for owner with id', ownerId);
  return findNotes(ownerNotesTable, 'owner_id', ownerId);
};

const findHousingNotes = async (housingId: string): Promise<NoteApi[]> => {
  console.log('List noteApi for housing with id', housingId);
  return findNotes(housingNotesTable, 'housing_id', housingId);
};

interface NoteDBO {
  id: string;
  title?: string;
  content?: string;
  contact_kind: string;
  created_by: string;
  created_at: Date;
}

const formatNoteApi = (noteApi: NoteApi): NoteDBO => ({
  id: noteApi.id,
  created_by: noteApi.createdBy,
  created_at: noteApi.createdAt,
  title: noteApi.title,
  content: noteApi.content,
  contact_kind: noteApi.contactKind,
});

const parseNoteApi = (noteDbo: NoteDBO): NoteApi => ({
  id: noteDbo.id,
  createdBy: noteDbo.created_by,
  createdAt: noteDbo.created_at,
  title: noteDbo.title,
  content: noteDbo.content,
  contactKind: noteDbo.contact_kind,
});

export default {
  insertOwnerNote,
  insertManyHousingNotes,
  findHousingNotes,
  findOwnerNotes,
  formatNoteApi,
};
