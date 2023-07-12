import async from 'async';
import randomstring from 'randomstring';
import { DeepPartial } from 'ts-essentials';
import { v4 as uuidv4 } from 'uuid';

import createMigrator from '../../utils';
import db from '../../../server/repositories/db';
import { housingTable } from '../../../server/repositories/housingRepository';
import {
  Housing,
  HousingEvent,
  HousingStatus,
} from '../073-housing-refactor-statuses';
import {
  eventsTable,
  housingEventsTable,
} from '../../../server/repositories/eventRepository';

describe('073 Housing refactor statuses', () => {
  const housingList = [
    createHousing({ status: HousingStatus.NeverContacted }),
    createHousing({ status: HousingStatus.Waiting }),
    createHousing({
      status: HousingStatus.FirstContact,
      sub_status: 'Intérêt potentiel',
      precisions: ['Informations transmises'],
    }),
    createHousing({
      status: HousingStatus.Exit,
      sub_status: 'Absent du millésime suivant',
      precisions: ['Loué'],
    }),
  ];

  beforeEach(async () => {
    const migrator = createMigrator(db);
    await migrator.migrateUntil('073-housing-refactor-statuses.ts');

    // Create some housing
    await db(housingTable).insert(housingList);

    // Migrate the actual file
    await migrator.up();
  });

  describe('up', () => {
    it('should migrate the housing data', async () => {
      const expected = [
        { status: HousingStatus.NeverContacted },
        { status: HousingStatus.Waiting },
        {
          status: HousingStatus.FirstContact,
          sub_status: 'Intérêt potentiel / En réflexion',
          precisions: [],
        },
        {
          status: HousingStatus.Exit,
          sub_status: 'Sortie de la vacance',
          precisions: ['Mode opératoire > Location/Occupation > Occupé'],
          occupancy: 'L',
        },
      ];

      const actualList = await Promise.all(
        housingList.map((housing) =>
          db(housingTable).where('id', housing.id).first()
        )
      );

      actualList.forEach((actual, i) => {
        expect(actual).toMatchObject(expected[i]);
      });
    });

    it('should create related events', async () => {
      const expected: Record<string, DeepPartial<HousingEvent>[]> = {
        [housingList[0].id]: [
          {
            name: 'Modification arborescence de suivi',
            old: expect.objectContaining({ status: 'Jamais contacté' }),
            new: expect.objectContaining({ status: 'Non suivi' }),
          },
        ],
        [housingList[1].id]: [],
        [housingList[2].id]: [
          {
            name: 'Modification arborescence de suivi',
            old: expect.objectContaining({
              status: 'Premier contact',
              sub_status: 'Intérêt potentiel',
              precisions: ['Informations transmises'],
            }),
            new: expect.objectContaining({
              status: 'Premier contact',
              sub_status: 'Intérêt potentiel / En réflexion',
              precisions: [],
            }),
          },
        ],
        [housingList[3].id]: [
          {
            name: 'Modification arborescence de suivi',
            kind: 'Update',
            category: 'Followup',
            section: 'Situation',
            old: expect.objectContaining({
              status: 'Sortie de la vacance',
              sub_status: 'Absent du millésime suivant',
              precisions: ['Loué'],
              occupancy: 'V',
            }),
            new: expect.objectContaining({
              status: 'Suivi terminé',
              sub_status: 'Sortie de la vacance',
              precisions: ['Mode opératoire > Location/Occupation > Occupé'],
              occupancy: 'L',
            }),
          },
          {
            name: 'Absent du millésime 2023',
            kind: 'Delete',
            category: 'Followup',
            section: 'Situation',
          },
        ],
      };

      await async.forEach(housingList, async (housing) => {
        const actual: HousingEvent[] = await db(eventsTable)
          .join(
            `${housingEventsTable}`,
            `${housingEventsTable}.event_id`,
            `${eventsTable}.id`
          )
          .where({ housing_id: housing.id });

        const events = expected[housing.id];
        expect(actual).toHaveLength(events.length);
        expect(actual).toIncludeAllPartialMembers(events);
      });
    });

    it('should avoid writing an event if the housing was not changed', async () => {
      const housing = housingList[1];

      const actual = await db(eventsTable)
        .join(
          `${housingEventsTable}`,
          `${housingEventsTable}.event_id`,
          `${eventsTable}.id`
        )
        .where({ housing_id: housing.id });

      expect(actual).toHaveLength(0);
    });
  });

  describe('down', () => {
    beforeEach(async () => {
      await createMigrator(db).down();
    });

    it('should rollback the old housing', async () => {
      const actualList = await Promise.all(
        housingList.map((housing) =>
          db(housingTable).where('id', housing.id).first()
        )
      );

      actualList.forEach((actual, i) => {
        expect(actual).toMatchObject(housingList[i]);
      });
    });

    it('should remove their events', async () => {
      const events = await db(eventsTable).where({
        name: 'Modification arborescence de suivi',
      });
      expect(events).toHaveLength(0);
    });
  });

  function createHousing(housing: Partial<Omit<Housing, 'id'>>) {
    return {
      id: uuidv4(),
      invariant: randomstring.generate(),
      local_id: randomstring.generate(),
      raw_address: [randomstring.generate()],
      geo_code: '12345',
      uncomfortable: false,
      housing_kind: randomstring.generate({ length: 1 }),
      rooms_count: 1,
      living_area: 42,
      occupancy: 'V',
      ...housing,
    };
  }
});
