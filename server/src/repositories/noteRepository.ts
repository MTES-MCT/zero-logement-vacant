import db from '~/infra/database';
import { logger } from '~/infra/logger';
import { HousingNoteApi, NoteApi, OwnerNoteApi } from '~/models/NoteApi';
import {
  parseUserApi,
  UserDBO,
  usersTable
} from '~/repositories/userRepository';

export const notesTable = 'notes';
export const ownerNotesTable = 'owner_notes';
export const housingNotesTable = 'housing_notes';

export const Notes = () => db<NoteRecordDBO>(notesTable);
export const OwnerNotes = () =>
  db<{ note_id: string; owner_id: string }>(ownerNotesTable);
export const HousingNotes = (transaction = db) =>
  transaction<HousingNoteDBO>(housingNotesTable);

async function insertOwnerNote(ownerNoteApi: OwnerNoteApi): Promise<void> {
  logger.debug('Inserting owner note...', ownerNoteApi);
  await Notes().insert(formatNoteApi(ownerNoteApi));
  await OwnerNotes().insert({
    note_id: ownerNoteApi.id,
    owner_id: ownerNoteApi.ownerId
  });
}

async function createByHousing(housingNote: HousingNoteApi): Promise<void> {
  await createManyByHousing([housingNote]);
}

async function createManyByHousing(
  housingNotes: HousingNoteApi[]
): Promise<void> {
  logger.debug('Inserting housing notes...', {
    notes: housingNotes
  });
  if (housingNotes.length) {
    await Notes().insert(
      housingNotes.map((housingNote) => formatNoteApi(housingNote))
    );
    await HousingNotes().insert(
      housingNotes.map<HousingNoteDBO>((housingNote) => ({
        note_id: housingNote.id,
        housing_id: housingNote.housingId,
        housing_geo_code: housingNote.housingGeoCode
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
    .join(usersTable, `${usersTable}.id`, `${notesTable}.created_by`)
    .select(db.raw(`to_json(${usersTable}.*) AS creator`))
    .where(`${tableName}.${columnName}`, value)
    .orderBy(`${notesTable}.created_at`, 'desc');
  return notes.map(parseNoteApi);
}

async function findOwnerNotes(ownerId: string): Promise<NoteApi[]> {
  logger.debug('Find owner notes...', {
    owner: ownerId
  });
  return findNotes(ownerNotesTable, 'owner_id', ownerId);
}

async function findHousingNotes(housingId: string): Promise<NoteApi[]> {
  logger.debug('Finding housing notes...', {
    housing: housingId
  });
  return findNotes(housingNotesTable, 'housing_id', housingId);
}

export interface NoteRecordDBO {
  id: string;
  content: string;
  note_kind: string;
  created_by: string;
  created_at: Date;
  /**
   * @deprecated
   */
  contact_kind_deprecated: string | null;
  /**
   * @deprecated
   */
  title_deprecated: string | null;
}

export interface NoteDBO extends NoteRecordDBO {
  creator?: UserDBO;
}

export interface HousingNoteDBO {
  note_id: string;
  housing_id: string;
  housing_geo_code: string;
}

export const formatNoteApi = (noteApi: NoteApi): NoteRecordDBO => ({
  id: noteApi.id,
  created_by: noteApi.createdBy,
  created_at: noteApi.createdAt,
  note_kind: noteApi.noteKind,
  content: noteApi.content,
  contact_kind_deprecated: null,
  title_deprecated: null
});

export const formatHousingNoteApi = (note: HousingNoteApi): HousingNoteDBO => ({
  note_id: note.id,
  housing_id: note.housingId,
  housing_geo_code: note.housingGeoCode
});

export const parseNoteApi = (noteDbo: NoteDBO): NoteApi => ({
  id: noteDbo.id,
  createdBy: noteDbo.created_by,
  createdAt: noteDbo.created_at,
  content: noteDbo.content,
  noteKind: noteDbo.note_kind,
  creator: noteDbo.creator ? parseUserApi(noteDbo.creator) : undefined
});

export default {
  insertOwnerNote,
  createByHousing,
  createManyByHousing,
  findHousingNotes,
  findOwnerNotes
};
