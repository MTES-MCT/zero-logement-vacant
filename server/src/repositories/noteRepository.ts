import db from '~/infra/database';
import { HousingNoteApi, NoteApi, OwnerNoteApi } from '~/models/NoteApi';
import { logger } from '~/infra/logger';

export const notesTable = 'notes';
export const ownerNotesTable = 'owner_notes';
export const housingNotesTable = 'housing_notes';

export const Notes = () => db<NoteDBO>(notesTable);
export const OwnerNotes = () =>
  db<{ note_id: string; owner_id: string }>(ownerNotesTable);
export const HousingNotes = (transaction = db) =>
  transaction<HousingNoteDBO>(housingNotesTable);

async function insertOwnerNote(ownerNoteApi: OwnerNoteApi): Promise<void> {
  logger.info('Insert OwnerNoteApi');
  await Notes().insert(formatNoteApi(ownerNoteApi));
  await OwnerNotes().insert({
    note_id: ownerNoteApi.id,
    owner_id: ownerNoteApi.ownerId,
  });
}

async function insertHousingNote(housingNote: HousingNoteApi): Promise<void> {
  await insertManyHousingNotes([housingNote]);
}

async function insertManyHousingNotes(
  housingNotes: HousingNoteApi[]
): Promise<void> {
  logger.info('Insert %d HousingNoteApi', housingNotes.length);
  if (housingNotes.length) {
    await Notes().insert(
      housingNotes.map((housingNote) => formatNoteApi(housingNote))
    );
    await HousingNotes().insert(
      housingNotes.map<HousingNoteDBO>((housingNote) => ({
        note_id: housingNote.id,
        housing_id: housingNote.housingId,
        housing_geo_code: housingNote.housingGeoCode,
      }))
    );
  }
}

async function findNotes(
  tableName: string,
  columnName: string,
  value: string
): Promise<NoteApi[]> {
  const notes = await Notes()
    .select(`${notesTable}.*`)
    .join(tableName, `${tableName}.note_id`, `${notesTable}.id`)
    .where(`${tableName}.${columnName}`, value)
    .orderBy(`${notesTable}.created_at`, 'desc');
  return notes.map(parseNoteApi);
}

async function findOwnerNotes(ownerId: string): Promise<NoteApi[]> {
  logger.info('List noteApi for owner with id', ownerId);
  return findNotes(ownerNotesTable, 'owner_id', ownerId);
}

async function findHousingNotes(housingId: string): Promise<NoteApi[]> {
  logger.info('List noteApi for housing with id', housingId);
  return findNotes(housingNotesTable, 'housing_id', housingId);
}

interface NoteDBO {
  id: string;
  content: string;
  note_kind: string;
  created_by: string;
  created_at: Date;
}

interface HousingNoteDBO {
  note_id: string;
  housing_id: string;
  housing_geo_code: string;
}

export const formatNoteApi = (noteApi: NoteApi): NoteDBO => ({
  id: noteApi.id,
  created_by: noteApi.createdBy,
  created_at: noteApi.createdAt,
  note_kind: noteApi.noteKind,
  content: noteApi.content,
});

export const formatHousingNoteApi = (note: HousingNoteApi): HousingNoteDBO => ({
  note_id: note.id,
  housing_id: note.housingId,
  housing_geo_code: note.housingGeoCode,
});

export const parseNoteApi = (noteDbo: NoteDBO): NoteApi => ({
  id: noteDbo.id,
  createdBy: noteDbo.created_by,
  createdAt: noteDbo.created_at,
  content: noteDbo.content,
  noteKind: noteDbo.note_kind,
});

export default {
  insertOwnerNote,
  insertHousingNote,
  insertManyHousingNotes,
  findHousingNotes,
  findOwnerNotes,
  formatNoteApi,
};
