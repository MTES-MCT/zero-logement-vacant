import db from '~/infra/database';
import { logger } from '~/infra/logger';
import { HousingNoteApi, NoteApi } from '~/models/NoteApi';
import {
  parseUserApi,
  UserDBO,
  usersTable
} from '~/repositories/userRepository';

export const NOTES_TABLE = 'notes';
export const OWNER_NOTES_TABLE = 'owner_notes';
export const HOUSING_NOTES_TABLE = 'housing_notes';

export const Notes = () => db<NoteRecordDBO>(NOTES_TABLE);
export const OwnerNotes = () =>
  db<{ note_id: string; owner_id: string }>(OWNER_NOTES_TABLE);
export const HousingNotes = (transaction = db) =>
  transaction<HousingNoteDBO>(HOUSING_NOTES_TABLE);

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

async function findByHousing(id: string): Promise<NoteApi[]> {
  logger.debug('Finding housing notes...', {
    housing: id
  });
  const notes = await listQuery()
    .join(
      HOUSING_NOTES_TABLE,
      `${HOUSING_NOTES_TABLE}.note_id`,
      `${NOTES_TABLE}.id`
    )
    .where(`${HOUSING_NOTES_TABLE}.housing_id`, id);
  return notes.map(parseNoteApi);
}

async function get(id: string): Promise<NoteApi | null> {
  logger.debug('Getting a note by id...', { id });
  const note = await listQuery().where(`${NOTES_TABLE}.id`, id).first();
  return note ? parseNoteApi(note) : null;
}

async function update(note: Pick<NoteApi, 'id' | 'content'>): Promise<void> {
  logger.debug('Updating note...', note);
  await Notes().where({ id: note.id }).update({
    content: note.content,
    updated_at: new Date()
  });
}

export interface NoteRecordDBO {
  id: string;
  content: string;
  note_kind: string;
  /**
   * @deprecated
   */
  contact_kind_deprecated: string | null;
  /**
   * @deprecated
   */
  title_deprecated: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date | null;
}

export interface NoteDBO extends NoteRecordDBO {
  creator?: UserDBO;
}

export interface HousingNoteDBO {
  note_id: string;
  housing_id: string;
  housing_geo_code: string;
}

export const formatNoteApi = (note: NoteApi): NoteRecordDBO => ({
  id: note.id,
  created_by: note.createdBy,
  note_kind: note.noteKind,
  content: note.content,
  contact_kind_deprecated: null,
  title_deprecated: null,
  created_at: new Date(note.createdAt),
  updated_at: note.updatedAt ? new Date(note.updatedAt) : null
});

export const formatHousingNoteApi = (note: HousingNoteApi): HousingNoteDBO => ({
  note_id: note.id,
  housing_id: note.housingId,
  housing_geo_code: note.housingGeoCode
});

export const parseNoteApi = (note: NoteDBO): NoteApi => ({
  id: note.id,
  createdBy: note.created_by,
  content: note.content,
  noteKind: note.note_kind,
  createdAt: note.created_at.toJSON(),
  updatedAt: note.updated_at ? note.updated_at.toJSON() : null,
  creator: note.creator ? parseUserApi(note.creator) : undefined
});

const listQuery = () =>
  Notes()
    .select(`${NOTES_TABLE}.*`)
    .join(usersTable, `${usersTable}.id`, `${NOTES_TABLE}.created_by`)
    .select(db.raw(`to_json(${usersTable}.*) AS creator`))
    .orderBy(`${NOTES_TABLE}.created_at`, 'desc');

export default {
  createByHousing,
  findByHousing,
  get,
  update
};
