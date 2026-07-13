import type { Insertable, Selectable } from 'kysely';
import { sql } from 'kysely';

import db from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import { createLogger } from '~/infra/logger';
import { HousingId } from '~/models/HousingApi';
import { HousingNoteApi, NoteApi } from '~/models/NoteApi';
import { fromUserDBO, UserDBO } from '~/repositories/userRepository';

const logger = createLogger('noteRepository');

export const NOTES_TABLE = 'notes';
export const OWNER_NOTES_TABLE = 'owner_notes';
export const HOUSING_NOTES_TABLE = 'housing_notes';

// Knex accessors — re-exported for backward compatibility with seeds and tests.
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
  housingNotes: ReadonlyArray<HousingNoteApi>
): Promise<void> {
  if (!housingNotes.length) {
    return;
  }

  logger.debug('Inserting housing notes...', { notes: housingNotes.length });
  await withinKyselyTransaction(async (trx) => {
    await trx
      .insertInto('notes')
      .values(housingNotes.map(toNoteInsert))
      .execute();
    await trx
      .insertInto('housingNotes')
      .values(housingNotes.map(toHousingNoteInsert))
      .execute();
  });
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
  const rows = await noteListQuery()
    .innerJoin('housingNotes', 'housingNotes.noteId', 'notes.id')
    .where('housingNotes.housingGeoCode', '=', housing.geoCode)
    .where('housingNotes.housingId', '=', housing.id)
    .$if(options?.filters?.deleted === true, (query) =>
      query.where('notes.deletedAt', 'is not', null)
    )
    .$if(options?.filters?.deleted === false, (query) =>
      query.where('notes.deletedAt', 'is', null)
    )
    .execute();
  return rows.map(parseNoteRow);
}

async function get(id: string): Promise<NoteApi | null> {
  logger.debug('Getting a note by id...', { id });
  const row = await noteListQuery()
    .where('notes.id', '=', id)
    .executeTakeFirst();
  return row ? parseNoteRow(row) : null;
}

async function update(
  note: Pick<NoteApi, 'id' | 'content' | 'updatedAt'>
): Promise<void> {
  logger.debug('Updating note...', note);
  await kysely
    .updateTable('notes')
    .set({
      content: note.content,
      updatedAt: note.updatedAt ? new Date(note.updatedAt) : null
    })
    .where('id', '=', note.id)
    .execute();
}

async function remove(id: string): Promise<void> {
  logger.debug('Removing note...', { id });
  await withinKyselyTransaction(async (trx) => {
    await trx
      .updateTable('notes')
      .set({ deletedAt: new Date() })
      .where('id', '=', id)
      .execute();
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

function toNoteInsert(note: NoteApi): Insertable<DB['notes']> {
  return {
    id: note.id,
    createdBy: note.createdBy,
    noteKind: note.noteKind,
    content: note.content,
    contactKindDeprecated: null,
    titleDeprecated: null,
    createdAt: new Date(note.createdAt),
    updatedAt: note.updatedAt ? new Date(note.updatedAt) : null,
    deletedAt: note.deletedAt ? new Date(note.deletedAt) : null
  };
}

function toHousingNoteInsert(
  note: HousingNoteApi
): Insertable<DB['housingNotes']> {
  return {
    noteId: note.id,
    housingId: note.housingId,
    housingGeoCode: note.housingGeoCode
  };
}

type NoteRow = Selectable<DB['notes']> & { creator: UserDBO | null };

function parseNoteRow(row: NoteRow): NoteApi {
  if (!row.creator) {
    throw new Error('Note creator should be fetched together with the note');
  }

  return {
    id: row.id,
    createdBy: row.createdBy as string,
    content: row.content,
    noteKind: row.noteKind,
    createdAt: (row.createdAt as Date).toJSON(),
    updatedAt: row.updatedAt ? row.updatedAt.toJSON() : null,
    deletedAt: row.deletedAt ? row.deletedAt.toJSON() : null,
    creator: fromUserDBO(row.creator)
  };
}

const noteListQuery = () =>
  kysely
    .selectFrom('notes')
    .innerJoin('users', 'users.id', 'notes.createdBy')
    .selectAll('notes')
    .select(sql<UserDBO>`to_json(users.*)`.as('creator'))
    .orderBy('notes.createdAt', 'desc');

export default {
  createByHousing,
  createManyByHousing,
  findByHousing,
  get,
  update,
  remove
};
