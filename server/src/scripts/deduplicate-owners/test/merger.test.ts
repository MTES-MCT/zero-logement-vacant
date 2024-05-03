import { merge } from '../merger';
import { Comparison } from '../../shared';
import {
  genEstablishmentApi,
  genHousingApi,
  genOwnerApi,
  genOwnerEventApi,
  genUserApi,
} from '~/test/testFixtures';
import db from '~/infra/database/';
import { formatOwnerApi, ownerTable } from '~/repositories/ownerRepository';
import {
  eventsTable,
  formatEventApi,
  ownerEventsTable,
} from '~/repositories/eventRepository';
import {
  formatHousingRecordApi,
  housingTable,
} from '~/repositories/housingRepository';
import {
  HousingOwnerDBO,
  housingOwnersTable,
} from '~/repositories/housingOwnerRepository';
import {
  Establishments,
  formatEstablishmentApi,
} from '~/repositories/establishmentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';

describe('Merger', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('merge', () => {
    const source = genOwnerApi();
    const duplicates = Array.from({ length: 2 }, () => genOwnerApi()).map(
      (owner) => ({ ...owner, birthDate: undefined }),
    );
    const suggestion = source;
    const events = duplicates.map((owner) =>
      genOwnerEventApi(owner.id, user.id),
    );
    const housingList = duplicates.map(() => genHousingApi());

    beforeAll(async () => {
      const owners = [source, ...duplicates].map(formatOwnerApi);
      await db(ownerTable).insert(owners);

      // Attach events to the duplicates
      await db(eventsTable).insert(events.map(formatEventApi));
      await db(ownerEventsTable).insert(
        events.map((event) => ({
          owner_id: event.old?.id,
          event_id: event.id,
        })),
      );

      // Attach housing to the duplicates
      await db(housingTable).insert(housingList.map(formatHousingRecordApi));
      await db(housingOwnersTable).insert(
        housingList.map<HousingOwnerDBO>((housing, i) => {
          return {
            housing_id: housing.id,
            housing_geo_code: housing.geoCode,
            owner_id: duplicates[i].id,
            rank: i + 1,
          };
        }),
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

      await merge(comparison);

      const ownerEvents = await db(ownerEventsTable).whereIn(
        'event_id',
        events.map((event) => event.id),
      );
      expect(ownerEvents).toSatisfyAll(
        (event) => event.owner_id !== suggestion.id,
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

      await merge(comparison);

      const ownerHousing = await db(housingOwnersTable).whereIn(
        'housing_id',
        housingList.map((housing) => housing.id),
      );
      expect(ownerHousing).toSatisfyAll((oh) => oh.owner_id === suggestion.id);

      const ownerEvents = await db(ownerEventsTable).whereIn(
        'event_id',
        events.map((event) => event.id),
      );
      expect(ownerEvents).toSatisfyAll(
        (event) => event.owner_id === suggestion.id,
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

      await merge(comparison);

      const dups = await db(ownerTable).whereIn(
        'id',
        duplicates.map((duplicate) => duplicate.id),
      );
      expect(dups).toBeArrayOfSize(0);
    });
  });
});
