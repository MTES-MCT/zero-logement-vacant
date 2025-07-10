import { match } from 'ts-pattern';
import db from '~/infra/database';
import { withinTransaction } from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import { HousingId } from '~/models/HousingApi';
import { HousingNoteApi, NoteApi } from '~/models/NoteApi';
import {
  parseUserApi,
  UserDBO,
  usersTable
} from '~/repositories/userRepository';

const logger = createLogger('noteRepository');

export const NOTES_TABLE = 'notes';
export const OWNER_NOTES_TABLE = 'owner_notes';
export const HOUSING_NOTES_TABLE = 'housing_notes';

export const Notes = (transaction = db) =>
  transaction<NoteRecordDBO>(NOTES_TABLE);
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

interface FindByHousingOptions {
  filters?: {
    deleted?: boolean;
  };
}

async function findByHousing(
  housing: HousingId,
  options?: FindByHousingOptions
): Promise<NoteApi[]> {
  logger.debug('Finding housing notes...', housing);
  const notes = await listQuery()
    .join(
      HOUSING_NOTES_TABLE,
      `${HOUSING_NOTES_TABLE}.note_id`,
      `${NOTES_TABLE}.id`
    )
    .where({
      [`${HOUSING_NOTES_TABLE}.housing_geo_code`]: housing.geoCode,
      [`${HOUSING_NOTES_TABLE}.housing_id`]: housing.id
    })
    .modify((query) => {
      match(options?.filters?.deleted)
        .with(true, () => {
          query.whereNotNull(`${NOTES_TABLE}.deleted_at`);
        })
        .with(false, () => {
          query.whereNull(`${NOTES_TABLE}.deleted_at`);
        })
        .otherwise(() => {
          // No filter applied, return all notes
        });
    });
  return notes.map(parseNoteApi);
}

async function get(id: string): Promise<NoteApi | null> {
  logger.debug('Getting a note by id...', { id });
  const note = await listQuery().where(`${NOTES_TABLE}.id`, id).first();
  return note ? parseNoteApi(note) : null;
}

async function update(
  note: Pick<NoteApi, 'id' | 'content' | 'updatedAt'>
): Promise<void> {
  logger.debug('Updating note...', note);
  await Notes()
    .where({ id: note.id })
    .update({
      content: note.content,
      updated_at: note.updatedAt ? new Date(note.updatedAt) : null
    });
}

async function remove(id: string): Promise<void> {
  logger.debug('Removing note...', { id });
  await withinTransaction(async (transaction) => {
    await Notes(transaction).where({ id }).update({
      deleted_at: new Date()
    });
    await HousingNotes(transaction).where({ note_id: id }).delete();
  });

  logger.debug('Note removed', { id });
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
  deleted_at: Date | null;
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
  updated_at: note.updatedAt ? new Date(note.updatedAt) : null,
  deleted_at: note.deletedAt ? new Date(note.deletedAt) : null
});

export function formatHousingNoteApi(note: HousingNoteApi): HousingNoteDBO {
  return {
    note_id: note.id,
    housing_id: note.housingId,
    housing_geo_code: note.housingGeoCode
  };
}

export function parseNoteApi(note: NoteDBO): NoteApi {
  if (!note.creator) {
    throw new Error('Note creator should be fetched together with the note');
  }

  return {
    id: note.id,
    createdBy: note.created_by,
    content: note.content,
    noteKind: note.note_kind,
    createdAt: note.created_at.toJSON(),
    updatedAt: note.updated_at ? note.updated_at.toJSON() : null,
    deletedAt: note.deleted_at ? note.deleted_at.toJSON() : null,
    creator: parseUserApi(note.creator)
  };
}

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
  update,
  remove
};
