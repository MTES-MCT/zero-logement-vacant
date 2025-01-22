import noteRepository, {
  HousingNotes,
  NoteRecordDBO,
  Notes
} from '~/repositories/noteRepository';
import { HousingNoteApi } from '~/models/NoteApi';
import {
  genEstablishmentApi,
  genHousingApi,
  genHousingNoteApi,
  genUserApi
} from '~/test/testFixtures';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';

describe('Note repository', () => {
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
        created_at: note.createdAt,
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
});
