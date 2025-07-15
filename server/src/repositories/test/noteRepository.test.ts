import { faker } from '@faker-js/faker/locale/fr';
import { NotePayloadDTO } from '@zerologementvacant/models';

import { HousingNoteApi, NoteApi } from '~/models/NoteApi';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';

import noteRepository, {
  formatHousingNoteApi,
  formatNoteApi,
  HousingNotes,
  NoteRecordDBO,
  Notes
} from '~/repositories/noteRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  genEstablishmentApi,
  genHousingApi,
  genHousingNoteApi,
  genUserApi
} from '~/test/testFixtures';

describe('Note repository', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('createByHousing', () => {
    const establishment = genEstablishmentApi();
    const creator = genUserApi(establishment.id);
    const housing = genHousingApi();
    const note: HousingNoteApi = genHousingNoteApi(creator, housing);

    beforeAll(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(formatUserApi(creator));
      await Housing().insert(formatHousingRecordApi(housing));

      await noteRepository.createByHousing(note);
    });

    it('should create the note', async () => {
      const actual = await Notes().where({ id: note.id }).first();
      expect(actual).toStrictEqual<NoteRecordDBO>({
        id: note.id,
        content: note.content,
        note_kind: note.noteKind,
        created_by: note.createdBy,
        created_at: new Date(note.createdAt),
        updated_at: note.updatedAt ? new Date(note.updatedAt) : null,
        deleted_at: null,
        // Weird fields still present in the database
        contact_kind_deprecated: null,
        title_deprecated: null
      });
    });

    it('should link the note to its housing', async () => {
      const actual = await HousingNotes()
        .where({
          note_id: note.id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        })
        .first();
      expect(actual).toBeDefined();
    });
  });

  describe('findByHousing', () => {
    const housing = genHousingApi();
    const notes: ReadonlyArray<HousingNoteApi> = [
      {
        ...genHousingNoteApi(user, housing),
        deletedAt: null
      },
      {
        ...genHousingNoteApi(user, housing),
        deletedAt: new Date().toJSON()
      }
    ];

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housing));
      await Notes().insert(notes.map(formatNoteApi));
      await HousingNotes().insert(notes.map(formatHousingNoteApi));
    });

    it('should return all the notes of a housing', async () => {
      const actual = await noteRepository.findByHousing(housing);

      expect(actual).toIncludeAllPartialMembers(
        notes.map((note) => ({ id: note.id }))
      );
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
    const housing = genHousingApi();
    const note = genHousingNoteApi(user, housing);

    beforeAll(async () => {
      await Notes().insert(formatNoteApi(note));
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
    const housing = genHousingApi();
    const note = genHousingNoteApi(user, housing);

    beforeAll(async () => {
      await Notes().insert(formatNoteApi(note));
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

      const actual = await Notes().where({ id: note.id }).first();
      expect(actual).toMatchObject<Partial<NoteRecordDBO>>({
        id: note.id,
        content: payload.content,
        updated_at: expect.any(Date)
      });
    });
  });

  describe('remove', () => {
    it('should soft-delete the note', async () => {
      const housing = genHousingApi();
      const note = genHousingNoteApi(user, housing);
      await Promise.all([
        Housing().insert(formatHousingRecordApi(housing)),
        Notes().insert(formatNoteApi(note)),
        HousingNotes().insert(formatHousingNoteApi(note))
      ]);

      await noteRepository.remove(note.id);

      const actualNote = await Notes().where({ id: note.id }).first();
      expect(actualNote).toBeDefined();
      const actualHousingNote = await HousingNotes()
        .where({ note_id: note.id, housing_id: housing.id })
        .first();
      expect(actualHousingNote).toBeDefined();
    });
  });
});
