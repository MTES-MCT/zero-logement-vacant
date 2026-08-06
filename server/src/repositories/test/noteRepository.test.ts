import { faker } from '@faker-js/faker/locale/fr';
import { NotePayloadDTO } from '@zerologementvacant/models';
import type { Selectable } from 'kysely';

import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { HousingApi } from '~/models/HousingApi';
import { HousingNoteApi, NoteApi } from '~/models/NoteApi';
import { UserApi } from '~/models/UserApi';
import { toHousingInsert } from '~/repositories/housingRepository';
import noteRepository, {
  toHousingNoteDBO,
  toNoteDBO
} from '~/repositories/noteRepository';
import { factories } from '~/test/factories';
import { genHousingApi, genHousingNoteApi } from '~/test/testFixtures';

describe('Note repository', () => {
  let establishment: EstablishmentApi;
  let user: UserApi;

  beforeAll(async () => {
    establishment = await factories.establishment.create();
    user = await factories.user.create({ establishmentId: establishment.id });
  });

  describe('createByHousing', () => {
    let establishment: EstablishmentApi;
    let creator: UserApi;
    let housing: HousingApi;
    let note: HousingNoteApi;

    beforeAll(async () => {
      establishment = await factories.establishment.create();
      creator = await factories.user.create({
        establishmentId: establishment.id
      });
      housing = await factories.housing.create();
      note = genHousingNoteApi(creator, housing);

      await noteRepository.createByHousing(note);
    });

    it('should create the note', async () => {
      const actual = await kysely
        .selectFrom('notes')
        .selectAll('notes')
        .where('id', '=', note.id)
        .executeTakeFirst();
      expect(actual).toStrictEqual<Selectable<DB['notes']>>({
        id: note.id,
        content: note.content,
        noteKind: note.noteKind,
        createdBy: note.createdBy,
        createdAt: new Date(note.createdAt),
        updatedAt: note.updatedAt ? new Date(note.updatedAt) : null,
        deletedAt: null,
        // Weird fields still present in the database
        contactKindDeprecated: null,
        titleDeprecated: null
      });
    });

    it('should link the note to its housing', async () => {
      const actual = await kysely
        .selectFrom('housingNotes')
        .selectAll('housingNotes')
        .where('noteId', '=', note.id)
        .where('housingId', '=', housing.id)
        .where('housingGeoCode', '=', housing.geoCode)
        .executeTakeFirst();
      expect(actual).toBeDefined();
    });
  });

  describe('createManyByHousing', () => {
    // Exercises the chunked insert across a batch boundary. The real-world bug
    // this guards against (a single unchunked INSERT exceeding Postgres's 65535
    // bind-parameter limit around ~7,282 notes at 9 params each) only reproduces
    // at a scale unfit for a test suite; this proves the chunking itself is
    // correct — no row dropped or duplicated at the INSERT_BATCH_SIZE seam.
    it('should insert every note when the list spans multiple batches', async () => {
      const housings = faker.helpers.multiple(() => genHousingApi(), {
        count: 1200
      });
      for (let index = 0; index < housings.length; index += 500) {
        await kysely
          .insertInto('fastHousing')
          .values(housings.slice(index, index + 500).map(toHousingInsert))
          .execute();
      }
      const notes = housings.map((housing) => genHousingNoteApi(user, housing));

      await noteRepository.createManyByHousing(notes);

      const noteIds = notes.map((note) => note.id);
      const insertedNotes = await kysely
        .selectFrom('notes')
        .selectAll('notes')
        .where('id', 'in', noteIds)
        .execute();
      expect(insertedNotes).toBeArrayOfSize(notes.length);
      const insertedHousingNotes = await kysely
        .selectFrom('housingNotes')
        .selectAll('housingNotes')
        .where('noteId', 'in', noteIds)
        .execute();
      expect(insertedHousingNotes).toBeArrayOfSize(notes.length);
    }, 30_000);
  });

  describe('findByHousing', () => {
    let housing: HousingApi;
    let notes: ReadonlyArray<HousingNoteApi>;

    beforeAll(async () => {
      housing = await factories.housing.create();
      notes = [
        {
          ...genHousingNoteApi(user, housing),
          deletedAt: null
        },
        {
          ...genHousingNoteApi(user, housing),
          deletedAt: new Date().toJSON()
        }
      ];
      await kysely.insertInto('notes').values(notes.map(toNoteDBO)).execute();
      await kysely
        .insertInto('housingNotes')
        .values(notes.map(toHousingNoteDBO))
        .execute();
    });

    it('should return non-deleted notes of a housing by default', async () => {
      const actual = await noteRepository.findByHousing(housing);

      expect(actual).toHaveLength(1);
      expect(actual[0]).toMatchObject({ id: notes[0].id });
    });

    it('should return the deleted notes of a housing', async () => {
      const actual = await noteRepository.findByHousing(housing, {
        filters: {
          deleted: true
        }
      });

      expect(actual.length).toBeGreaterThan(0);
      expect(actual).toSatisfyAll<NoteApi>((note) => {
        return note.deletedAt !== null;
      });
    });

    it('should return the non-deleted notes of a housing', async () => {
      const actual = await noteRepository.findByHousing(housing, {
        filters: {
          deleted: false
        }
      });

      expect(actual.length).toBeGreaterThan(0);
      expect(actual).toSatisfyAll<NoteApi>((note) => {
        return note.deletedAt === null;
      });
    });
  });

  describe('get', () => {
    let note: HousingNoteApi;

    beforeAll(async () => {
      const housing = genHousingApi();
      note = genHousingNoteApi(user, housing);
      await kysely.insertInto('notes').values(toNoteDBO(note)).execute();
    });

    it('should return null if the note is missing', async () => {
      const actual = await noteRepository.get(faker.string.uuid());

      expect(actual).toBeNull();
    });

    it('should return the note if it exists', async () => {
      const actual = await noteRepository.get(note.id);

      expect(actual).toBeDefined();
      expect(actual).toMatchObject<Partial<NoteApi>>({
        id: note.id,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt
      });
    });
  });

  describe('update', () => {
    let note: HousingNoteApi;

    beforeAll(async () => {
      const housing = genHousingApi();
      note = genHousingNoteApi(user, housing);
      await kysely.insertInto('notes').values(toNoteDBO(note)).execute();
    });

    it('should update the note content and updated_at field', async () => {
      const payload: NotePayloadDTO = {
        content: 'Nouveau contenu'
      };

      await noteRepository.update({
        ...payload,
        updatedAt: new Date().toJSON(),
        id: note.id
      });

      const actual = await kysely
        .selectFrom('notes')
        .selectAll('notes')
        .where('id', '=', note.id)
        .executeTakeFirst();
      expect(actual).toMatchObject<Partial<Selectable<DB['notes']>>>({
        id: note.id,
        content: payload.content,
        updatedAt: expect.any(Date)
      });
    });
  });

  describe('remove', () => {
    it('should soft-delete the note', async () => {
      const housing = await factories.housing.create();
      const note = genHousingNoteApi(user, housing);
      await Promise.all([
        kysely.insertInto('notes').values(toNoteDBO(note)).execute(),
        kysely
          .insertInto('housingNotes')
          .values(toHousingNoteDBO(note))
          .execute()
      ]);

      await noteRepository.remove(note.id);

      const actualNote = await kysely
        .selectFrom('notes')
        .selectAll('notes')
        .where('id', '=', note.id)
        .executeTakeFirst();
      expect(actualNote).toBeDefined();
      const actualHousingNote = await kysely
        .selectFrom('housingNotes')
        .selectAll('housingNotes')
        .where('noteId', '=', note.id)
        .where('housingId', '=', housing.id)
        .executeTakeFirst();
      expect(actualHousingNote).toBeDefined();
    });
  });
});
