import { toArray } from '@zerologementvacant/utils/node';
import { ReadableStream } from 'node:stream/web';
import {
  Events,
  formatEventApi,
  formatHousingEventApi,
  HousingEvents
} from '~/repositories/eventRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import {
  formatHousingNoteApi,
  formatNoteApi,
  HousingNotes,
  Notes
} from '~/repositories/noteRepository';
import { genSourceHousing } from '~/scripts/import-lovac/infra/fixtures';
import {
  createSourceHousingEnricher,
  EnrichedSourceHousing
} from '../source-housing-enricher';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { Users, toUserDBO } from '~/repositories/userRepository';
import {
  genEstablishmentApi,
  genEventApi,
  genHousingApi,
  genNoteApi,
  genUserApi
} from '~/test/testFixtures';

describe('createSourceHousingEnricher', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);
  const housing = genHousingApi();

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert([toUserDBO(user)]);
    await Housing().insert(formatHousingRecordApi(housing));
  });

  it('should set existing.housing to null when housing is not found', async () => {
    const source = genSourceHousing(); // random geo_code/local_id — not in DB
    const [result] = await toArray(
      ReadableStream.from([source]).pipeThrough(createSourceHousingEnricher())
    ) as EnrichedSourceHousing[];
    expect(result.existing.housing).toBeNull();
    expect(result.existing.events).toStrictEqual([]);
    expect(result.existing.notes).toStrictEqual([]);
  });

  it('should populate existing.housing when found, with empty events and notes', async () => {
    const source = {
      ...genSourceHousing(),
      geo_code: housing.geoCode,
      local_id: housing.localId
    };
    const [result] = await toArray(
      ReadableStream.from([source]).pipeThrough(createSourceHousingEnricher())
    ) as EnrichedSourceHousing[];
    expect(result.existing.housing).toMatchObject({
      id: housing.id,
      geo_code: housing.geoCode,
      local_id: housing.localId
    });
    expect(result.existing.events).toStrictEqual([]);
    expect(result.existing.notes).toStrictEqual([]);
  });

  describe('with events', () => {
    const housingWithEvents = genHousingApi();
    const occupancyEvent = {
      ...genEventApi({
        type: 'housing:occupancy-updated',
        creator: user,
        nextOld: { occupancy: 'V' as any },
        nextNew: { occupancy: 'L' as any }
      }),
      housingGeoCode: housingWithEvents.geoCode,
      housingId: housingWithEvents.id
    };
    const otherEvent = {
      ...genEventApi({
        type: 'housing:created',
        creator: user,
        nextOld: null,
        nextNew: { source: 'datafoncier-manual' as any, occupancy: '' as any }
      }),
      housingGeoCode: housingWithEvents.geoCode,
      housingId: housingWithEvents.id
    };

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housingWithEvents));
      await Events().insert([occupancyEvent, otherEvent].map(formatEventApi));
      await HousingEvents().insert(
        [occupancyEvent, otherEvent].map(formatHousingEventApi)
      );
    });

    it('should include occupancy-updated and status-updated events', async () => {
      const source = {
        ...genSourceHousing(),
        geo_code: housingWithEvents.geoCode,
        local_id: housingWithEvents.localId
      };
      const [result] = await toArray(
        ReadableStream.from([source]).pipeThrough(createSourceHousingEnricher())
      ) as EnrichedSourceHousing[];
      expect(result.existing.events).toHaveLength(1);
      expect(result.existing.events[0]).toMatchObject({ id: occupancyEvent.id });
    });

    it('should exclude events of other types', async () => {
      const source = {
        ...genSourceHousing(),
        geo_code: housingWithEvents.geoCode,
        local_id: housingWithEvents.localId
      };
      const [result] = await toArray(
        ReadableStream.from([source]).pipeThrough(createSourceHousingEnricher())
      ) as EnrichedSourceHousing[];
      const hasOtherEvent = result.existing.events.some(
        (e) => e.id === otherEvent.id
      );
      expect(hasOtherEvent).toBe(false);
    });
  });

  describe('with notes', () => {
    const housingWithNotes = genHousingApi();
    const note = genNoteApi(user);
    const housingNote = {
      ...note,
      housingId: housingWithNotes.id,
      housingGeoCode: housingWithNotes.geoCode
    };

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housingWithNotes));
      await Notes().insert(formatNoteApi(note));
      await HousingNotes().insert(formatHousingNoteApi(housingNote));
    });

    it('should populate notes when found', async () => {
      const source = {
        ...genSourceHousing(),
        geo_code: housingWithNotes.geoCode,
        local_id: housingWithNotes.localId
      };
      const [result] = await toArray(
        ReadableStream.from([source]).pipeThrough(createSourceHousingEnricher())
      ) as EnrichedSourceHousing[];
      expect(result.existing.notes).toHaveLength(1);
      expect(result.existing.notes[0]).toMatchObject({ id: note.id });
    });
  });

  it('should process a batch of N sources in a single db.raw call', async () => {
    const sources = [housing, genHousingApi()].map((h) => ({
      ...genSourceHousing(),
      geo_code: h.geoCode,
      local_id: h.localId
    }));
    const results = await toArray(
      ReadableStream.from(sources).pipeThrough(createSourceHousingEnricher())
    ) as EnrichedSourceHousing[];
    expect(results).toHaveLength(2);
  });
});
