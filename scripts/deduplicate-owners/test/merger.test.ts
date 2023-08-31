import merger from '../merger';
import { Comparison } from '../comparison';
import {
  genHousingApi,
  genOwnerApi,
  genOwnerEventApi,
} from '../../../server/test/testFixtures';
import db from '../../../server/repositories/db';
import {
  formatOwnerApi,
  ownerTable,
} from '../../../server/repositories/ownerRepository';
import { User1 } from '../../../database/seeds/test/003-users';
import {
  eventsTable,
  formatEventApi,
  ownerEventsTable,
} from '../../../server/repositories/eventRepository';
import {
  formatHousingRecordApi,
  housingTable,
  ownersHousingTable,
} from '../../../server/repositories/housingRepository';

describe('Merger', () => {
  describe('merge', () => {
    const source = genOwnerApi();
    const duplicates = [genOwnerApi(), genOwnerApi()];
    const suggestion = source;
    const events = duplicates.map((owner) =>
      genOwnerEventApi(owner.id, User1.id)
    );
    const housingList = duplicates.map(() => genHousingApi());

    beforeEach(async () => {
      const owners = [source, ...duplicates].map(formatOwnerApi);
      await db(ownerTable).insert(owners);

      // Attach events to the duplicates
      await db(eventsTable).insert(events.map(formatEventApi));
      await db(ownerEventsTable).insert(
        events.map((event) => ({
          owner_id: event.old?.id,
          event_id: event.id,
        }))
      );

      // Attach housing to the duplicates
      await db(housingTable).insert(housingList.map(formatHousingRecordApi));
      await db(ownersHousingTable).insert(
        housingList.map((housing, i) => {
          return {
            housing_id: housing.id,
            owner_id: duplicates[i].id,
          };
        })
      );
    });

    it('should abort if the comparison needs human review', async () => {
      const comparison: Comparison = {
        score: 0.8,
        source,
        duplicates: [
          {
            score: 0.8,
            value: duplicates[0],
          },
        ],
        needsReview: true,
      };

      await merger.merge(comparison);

      const ownerEvents = await db(ownerEventsTable).whereIn(
        'event_id',
        events.map((event) => event.id)
      );
      expect(ownerEvents).toSatisfyAll(
        (event) => event.owner_id !== suggestion.id
      );
    });

    it('should transfer housing, events and notes to the owner we keep', async () => {
      const comparison: Comparison = {
        score: 1,
        source,
        duplicates: duplicates.map((duplicate) => ({
          score: 1,
          value: duplicate,
        })),
        needsReview: false,
      };

      await merger.merge(comparison);

      const ownerHousing = await db(ownersHousingTable).whereIn(
        'housing_id',
        housingList.map((housing) => housing.id)
      );
      expect(ownerHousing).toSatisfyAll((oh) => oh.owner_id === suggestion.id);

      const ownerEvents = await db(ownerEventsTable).whereIn(
        'event_id',
        events.map((event) => event.id)
      );
      expect(ownerEvents).toSatisfyAll(
        (event) => event.owner_id === suggestion.id
      );
    });

    it('should remove duplicates afterwards', async () => {
      const comparison: Comparison = {
        score: 1,
        source,
        duplicates: duplicates.map((duplicate) => ({
          score: 1,
          value: duplicate,
        })),
        needsReview: false,
      };

      await merger.merge(comparison);

      const dups = await db(ownerTable).whereIn(
        'id',
        duplicates.map((duplicate) => duplicate.id)
      );
      expect(dups).toBeArrayOfSize(0);
    });
  });
});
