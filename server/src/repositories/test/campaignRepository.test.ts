import { faker } from '@faker-js/faker/locale/fr';
import { CampaignDTO, HousingStatus } from '@zerologementvacant/models';
import type { Selectable } from 'kysely';

import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import {
  CampaignEventApi,
  CampaignHousingEventApi,
  HousingEventApi
} from '~/models/EventApi';
import { UserApi } from '~/models/UserApi';
import campaignRepository from '~/repositories/campaignRepository';
import { toEventInsert } from '~/repositories/eventRepository';
import { factories } from '~/test/factories';
import { genEventApi } from '~/test/testFixtures';

describe('Campaign repository', () => {
  let establishment: EstablishmentApi;
  let user: UserApi;

  beforeAll(async () => {
    establishment = await factories.establishment.create();
    user = await factories.user.create({ establishmentId: establishment.id });
  });

  describe('find', () => {
    let establishment2: EstablishmentApi;

    beforeAll(async () => {
      establishment2 = await factories.establishment.create();
    });

    describe('geoCodes filter', () => {
      it('should return all campaigns when geoCodes is undefined', async () => {
        const campaign = await factories
          .campaign(establishment)
          .create({}, { associations: { createdBy: user } });
        const housing = await factories.housing.create({
          geoCode: establishment.geoCodes[0]
        });
        await kysely
          .insertInto('campaignsHousing')
          .values({
            campaignId: campaign.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
          .execute();

        const result = await campaignRepository.find({
          filters: { establishmentId: establishment.id }
        });

        expect(result.map((campaign) => campaign.id)).toContain(campaign.id);
      });

      it('should return no campaigns when geoCodes is empty', async () => {
        const campaign = await factories
          .campaign(establishment)
          .create({}, { associations: { createdBy: user } });
        const housing = await factories.housing.create({
          geoCode: establishment.geoCodes[0]
        });
        await kysely
          .insertInto('campaignsHousing')
          .values({
            campaignId: campaign.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
          .execute();

        const result = await campaignRepository.find({
          filters: { establishmentId: establishment.id, geoCodes: [] }
        });

        expect(result).toBeArrayOfSize(0);
      });

      it('should return only campaigns whose housings are all within geoCodes', async () => {
        const inGeoCode = establishment.geoCodes[0];
        const outGeoCode = establishment2.geoCodes[0];

        const campaignIn = await factories
          .campaign(establishment)
          .create({}, { associations: { createdBy: user } });
        const campaignOut = await factories
          .campaign(establishment)
          .create({}, { associations: { createdBy: user } });
        const housingIn = await factories.housing.create({
          geoCode: inGeoCode
        });
        const housingOut = await factories.housing.create({
          geoCode: outGeoCode
        });

        await kysely
          .insertInto('campaignsHousing')
          .values([
            {
              campaignId: campaignIn.id,
              housingId: housingIn.id,
              housingGeoCode: housingIn.geoCode
            },
            {
              campaignId: campaignOut.id,
              housingId: housingOut.id,
              housingGeoCode: housingOut.geoCode
            }
          ])
          .execute();

        const result = await campaignRepository.find({
          filters: { establishmentId: establishment.id, geoCodes: [inGeoCode] }
        });

        const ids = result.map((campaign) => campaign.id);
        expect(ids).toContain(campaignIn.id);
        expect(ids).not.toContain(campaignOut.id);
      });

      it('should exclude campaigns that have any housing outside geoCodes', async () => {
        const inGeoCode = establishment.geoCodes[0];
        const outGeoCode = establishment2.geoCodes[0];

        const campaign = await factories
          .campaign(establishment)
          .create({}, { associations: { createdBy: user } });
        const housingIn = await factories.housing.create({
          geoCode: inGeoCode
        });
        const housingOut = await factories.housing.create({
          geoCode: outGeoCode
        });

        await kysely
          .insertInto('campaignsHousing')
          .values([
            {
              campaignId: campaign.id,
              housingId: housingIn.id,
              housingGeoCode: housingIn.geoCode
            },
            {
              campaignId: campaign.id,
              housingId: housingOut.id,
              housingGeoCode: housingOut.geoCode
            }
          ])
          .execute();

        const result = await campaignRepository.find({
          filters: { establishmentId: establishment.id, geoCodes: [inGeoCode] }
        });

        expect(result.map((campaign) => campaign.id)).not.toContain(
          campaign.id
        );
      });
    });
  });

  describe('findOne', () => {
    it('should include the campaign creator', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });

      const actual = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: establishment.id
      });

      expect(actual?.createdBy).toMatchObject({
        id: user.id,
        email: user.email
      });
    });

    it('should expose returnCount from the database', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      // The sent_at update must happen first: an UPDATE-trigger
      // (trg_recompute_return_count_on_sent_at_change) recomputes return_count
      // whenever sent_at changes, so updating both in one statement would
      // overwrite the seeded return_count.
      await kysely
        .updateTable('campaigns')
        .set({ sentAt: new Date() })
        .where('id', '=', campaign.id)
        .execute();
      await kysely
        .updateTable('campaigns')
        .set({ returnCount: 5 })
        .where('id', '=', campaign.id)
        .execute();

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: establishment.id
      });

      expect(result?.returnCount).toBe(5);
    });

    it('should expose returnCount as null when sentAt is null', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      await kysely
        .updateTable('campaigns')
        .set({ returnCount: 0 })
        .where('id', '=', campaign.id)
        .execute();

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: establishment.id
      });

      expect(result?.returnCount).toBeNull();
    });

    it('should expose housingCount from the database', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      await kysely
        .updateTable('campaigns')
        .set({ housingCount: 3 })
        .where('id', '=', campaign.id)
        .execute();

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: establishment.id
      });

      expect(result?.housingCount).toBe(3);
    });

    it('should expose ownerCount from the database', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      await kysely
        .updateTable('campaigns')
        .set({ ownerCount: 2 })
        .where('id', '=', campaign.id)
        .execute();

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: establishment.id
      });

      expect(result?.ownerCount).toBe(2);
    });

    it('should expose returnRate from the database when sentAt is set', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      // The sent_at update must happen first: an UPDATE-trigger
      // (trg_recompute_return_count_on_sent_at_change) recomputes return_count
      // whenever sent_at changes, so updating both in one statement would
      // overwrite the seeded return_count.
      await kysely
        .updateTable('campaigns')
        .set({ sentAt: new Date() })
        .where('id', '=', campaign.id)
        .execute();
      await kysely
        .updateTable('campaigns')
        .set({ housingCount: 10, returnCount: 4 })
        .where('id', '=', campaign.id)
        .execute();

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: establishment.id
      });

      expect(result?.returnRate).toBeCloseTo(0.4);
    });

    it('should expose returnRate as null when sentAt is null', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      await kysely
        .updateTable('campaigns')
        .set({ housingCount: 10, returnCount: 0 })
        .where('id', '=', campaign.id)
        .execute();

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: establishment.id
      });

      expect(result?.returnRate).toBeNull();
    });

    describe('geoCodes filter', () => {
      it('should return null when geoCodes is empty', async () => {
        const campaign = await factories
          .campaign(establishment)
          .create({}, { associations: { createdBy: user } });
        const housing = await factories.housing.create({
          geoCode: establishment.geoCodes[0]
        });
        await kysely
          .insertInto('campaignsHousing')
          .values({
            campaignId: campaign.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
          .execute();

        const result = await campaignRepository.findOne({
          id: campaign.id,
          establishmentId: establishment.id,
          geoCodes: []
        });

        expect(result).toBeNull();
      });

      it('should return null when campaign has housing outside geoCodes', async () => {
        const establishment2 = await factories.establishment.create();
        const campaign = await factories
          .campaign(establishment)
          .create({}, { associations: { createdBy: user } });
        const outsideHousing = await factories.housing.create({
          geoCode: establishment2.geoCodes[0]
        });
        await kysely
          .insertInto('campaignsHousing')
          .values({
            campaignId: campaign.id,
            housingId: outsideHousing.id,
            housingGeoCode: outsideHousing.geoCode
          })
          .execute();

        const result = await campaignRepository.findOne({
          id: campaign.id,
          establishmentId: establishment.id,
          geoCodes: [establishment.geoCodes[0]]
        });

        expect(result).toBeNull();
      });

      it('should return campaign when all housing is within geoCodes', async () => {
        const inGeoCode = establishment.geoCodes[0];
        const campaign = await factories
          .campaign(establishment)
          .create({}, { associations: { createdBy: user } });
        const housing = await factories.housing.create({
          geoCode: inGeoCode
        });
        await kysely
          .insertInto('campaignsHousing')
          .values({
            campaignId: campaign.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
          .execute();

        const result = await campaignRepository.findOne({
          id: campaign.id,
          establishmentId: establishment.id,
          geoCodes: [inGeoCode]
        });

        expect(result).not.toBeNull();
        expect(result?.id).toBe(campaign.id);
      });
    });
  });

  describe('remove', () => {
    let housings: Awaited<ReturnType<typeof factories.housing.createList>>;
    let campaign: CampaignDTO;
    let campaignEvents: ReadonlyArray<CampaignEventApi>;
    let campaignHousingEvents: ReadonlyArray<CampaignHousingEventApi>;

    beforeAll(async () => {
      housings = await factories.housing.createList(3);
      campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      campaignEvents = [
        {
          ...genEventApi({
            creator: user,
            type: 'campaign:updated',
            nextOld: { title: 'Before' },
            nextNew: { title: 'After' }
          }),
          campaignId: campaign.id
        }
      ];
      campaignHousingEvents = housings.map((housing) => ({
        ...genEventApi({
          creator: user,
          type: 'housing:campaign-detached',
          nextOld: { name: 'Before' },
          nextNew: null
        }),
        campaignId: campaign.id,
        housingGeoCode: housing.geoCode,
        housingId: housing.id
      }));

      await kysely
        .insertInto('events')
        .values([
          ...campaignEvents.map(toEventInsert),
          ...campaignHousingEvents.map(toEventInsert)
        ])
        .execute();
      await kysely
        .insertInto('campaignEvents')
        .values(
          campaignEvents.map((event) => ({
            eventId: event.id,
            campaignId: event.campaignId
          }))
        )
        .execute();
      await kysely
        .insertInto('campaignHousingEvents')
        .values(
          campaignHousingEvents.map((event) => ({
            eventId: event.id,
            campaignId: event.campaignId,
            housingGeoCode: event.housingGeoCode,
            housingId: event.housingId
          }))
        )
        .execute();

      await campaignRepository.remove(campaign.id);
    });

    it('should remove a campaign', async () => {
      const actual = await kysely
        .selectFrom('campaigns')
        .selectAll('campaigns')
        .where('id', '=', campaign.id)
        .executeTakeFirst();
      expect(actual).toBeUndefined();
    });

    it('should unlink the associated housings', async () => {
      const actual = await kysely
        .selectFrom('campaignsHousing')
        .selectAll('campaignsHousing')
        .where('campaignId', '=', campaign.id)
        .execute();
      expect(actual).toBeArrayOfSize(0);
    });

    it('should remove the associated events', async () => {
      const actual = await kysely
        .selectFrom('events')
        .selectAll('events')
        .where(
          'id',
          'in',
          campaignEvents.map((event) => event.id)
        )
        .execute();
      expect(actual).toBeArrayOfSize(0);
    });

    it('should remove the associated campaign events', async () => {
      const actual = await kysely
        .selectFrom('campaignEvents')
        .selectAll('campaignEvents')
        .where('campaignId', '=', campaign.id)
        .execute();
      expect(actual).toBeArrayOfSize(0);
    });

    it('should unlink the associated drafts', async () => {
      const actual = await kysely
        .selectFrom('campaignsDrafts')
        .selectAll('campaignsDrafts')
        .where('campaignId', '=', campaign.id)
        .execute();
      expect(actual).toBeArrayOfSize(0);
    });

    it('should set the associated housing events foreign key to null', async () => {
      const actual = await kysely
        .selectFrom('campaignHousingEvents')
        .selectAll('campaignHousingEvents')
        .where((eb) =>
          eb(
            eb.refTuple('housingGeoCode', 'housingId'),
            'in',
            housings.map((housing) => eb.tuple(housing.geoCode, housing.id))
          )
        )
        .execute();
      expect(actual.length).toBeGreaterThan(0);
      expect(actual).toSatisfyAll<Selectable<DB['campaignHousingEvents']>>(
        (event) => event.campaignId === null
      );
    });
  });

  describe('triggers', () => {
    let establishment: EstablishmentApi;
    let user: UserApi;

    beforeAll(async () => {
      establishment = await factories.establishment.create();
      user = await factories.user.create({ establishmentId: establishment.id });
    });

    it('should increment housing_count when housing is added to campaign', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });

      const housing = await factories.housing.create();

      await kysely
        .insertInto('campaignsHousing')
        .values({
          campaignId: campaign.id,
          housingId: housing.id,
          housingGeoCode: housing.geoCode
        })
        .execute();

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: establishment.id
      });

      expect(result?.housingCount).toBe(1);
    });

    it('should decrement housing_count when housing is removed from campaign', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });

      const housing = await factories.housing.create();

      await kysely
        .insertInto('campaignsHousing')
        .values({
          campaignId: campaign.id,
          housingId: housing.id,
          housingGeoCode: housing.geoCode
        })
        .execute();

      await kysely
        .deleteFrom('campaignsHousing')
        .where('campaignId', '=', campaign.id)
        .where('housingId', '=', housing.id)
        .execute();

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: establishment.id
      });

      expect(result?.housingCount).toBe(0);
    });

    it('should increment owner_count when a primary owner is added to housing in campaign', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });

      const housing = await factories.housing.create();

      await kysely
        .insertInto('campaignsHousing')
        .values({
          campaignId: campaign.id,
          housingId: housing.id,
          housingGeoCode: housing.geoCode
        })
        .execute();

      const owner = await factories.owner.create();

      await factories.housingOwner({ housing, owner }).create({ rank: 1 });

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: establishment.id
      });

      expect(result?.ownerCount).toBe(1);
    });

    it('should decrement owner_count when a primary owner is removed from housing in campaign', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });

      const housing = await factories.housing.create();

      await kysely
        .insertInto('campaignsHousing')
        .values({
          campaignId: campaign.id,
          housingId: housing.id,
          housingGeoCode: housing.geoCode
        })
        .execute();

      const owner = await factories.owner.create();

      await factories.housingOwner({ housing, owner }).create({ rank: 1 });

      await kysely
        .deleteFrom('ownersHousing')
        .where('ownerId', '=', owner.id)
        .where('housingId', '=', housing.id)
        .execute();

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: establishment.id
      });

      expect(result?.ownerCount).toBe(0);
    });

    it('should decrement owner_count when owner rank changes from 1 to 2', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });

      const housing = await factories.housing.create();

      await kysely
        .insertInto('campaignsHousing')
        .values({
          campaignId: campaign.id,
          housingId: housing.id,
          housingGeoCode: housing.geoCode
        })
        .execute();

      const owner = await factories.owner.create();

      await factories.housingOwner({ housing, owner }).create({ rank: 1 });

      await kysely
        .updateTable('ownersHousing')
        .set({ rank: 2 })
        .where('ownerId', '=', owner.id)
        .where('housingId', '=', housing.id)
        .execute();

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: establishment.id
      });

      expect(result?.ownerCount).toBe(0);
    });

    it('should not change owner_count when rank changes between non-primary values', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });

      const housing = await factories.housing.create();

      await kysely
        .insertInto('campaignsHousing')
        .values({
          campaignId: campaign.id,
          housingId: housing.id,
          housingGeoCode: housing.geoCode
        })
        .execute();

      const primaryOwner = await factories.owner.create();
      await factories
        .housingOwner({ housing, owner: primaryOwner })
        .create({ rank: 1 });

      const secondaryOwner = await factories.owner.create();
      await factories
        .housingOwner({ housing, owner: secondaryOwner })
        .create({ rank: 2 });

      await kysely
        .updateTable('ownersHousing')
        .set({ rank: 3 })
        .where('ownerId', '=', secondaryOwner.id)
        .where('housingId', '=', housing.id)
        .execute();

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: establishment.id
      });

      expect(result?.ownerCount).toBe(1);
    });

    it('should decrement return_count when a housing with return events is detached', async () => {
      const sentAt = faker.date.past();
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      await kysely
        .updateTable('campaigns')
        .set({ sentAt })
        .where('id', '=', campaign.id)
        .execute();

      const housing = await factories.housing.create({
        status: HousingStatus.FIRST_CONTACT
      });

      await kysely
        .insertInto('campaignsHousing')
        .values({
          campaignId: campaign.id,
          housingId: housing.id,
          housingGeoCode: housing.geoCode
        })
        .execute();

      const event = genEventApi({
        creator: user,
        type: 'housing:status-updated',
        nextOld: {},
        nextNew: {}
      });
      await kysely
        .insertInto('events')
        .values({
          ...toEventInsert(event),
          createdAt: new Date(sentAt.getTime() + 1000)
        })
        .execute();
      await kysely
        .insertInto('housingEvents')
        .values({
          eventId: event.id,
          housingId: housing.id,
          housingGeoCode: housing.geoCode
        })
        .execute();

      await kysely
        .deleteFrom('campaignsHousing')
        .where('campaignId', '=', campaign.id)
        .where('housingId', '=', housing.id)
        .execute();

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: establishment.id
      });

      expect(result?.returnCount).toBe(0);
    });

    it('should compute return_rate as return_count / housing_count', async () => {
      const sentAt = faker.date.past();
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      await kysely
        .updateTable('campaigns')
        .set({ sentAt })
        .where('id', '=', campaign.id)
        .execute();
      const housings = await factories.housing.createList(10, {
        status: HousingStatus.FIRST_CONTACT
      });
      await kysely
        .insertInto('campaignsHousing')
        .values(
          housings.map((housing) => ({
            campaignId: campaign.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          }))
        )
        .execute();
      // 4 out of 10 housings get a qualifying event created after sentAt
      const housingEvents = housings
        .slice(0, 4)
        .map<HousingEventApi>((housing) => {
          const event = genEventApi({
            type: 'housing:status-updated',
            creator: user,
            nextOld: { status: 'Jamais contacté' },
            nextNew: { status: 'En attente de retour' }
          });
          return {
            ...event,
            housingGeoCode: housing.geoCode,
            housingId: housing.id
          };
        });
      const afterSentAt = new Date(sentAt.getTime() + 1000);
      await kysely
        .insertInto('events')
        .values(
          housingEvents.map((e) => ({
            ...toEventInsert(e),
            createdAt: afterSentAt
          }))
        )
        .execute();
      await kysely
        .insertInto('housingEvents')
        .values(
          housingEvents.map((e) => ({
            eventId: e.id,
            housingGeoCode: e.housingGeoCode,
            housingId: e.housingId
          }))
        )
        .execute();

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: establishment.id
      });

      expect(result?.returnRate).toBeCloseTo(0.4);
    });

    describe('return_count status filter', () => {
      async function setupCampaignWithHousing(status: HousingStatus) {
        const sentAt = faker.date.past();
        const campaign = await factories
          .campaign(establishment)
          .create({}, { associations: { createdBy: user } });
        await kysely
          .updateTable('campaigns')
          .set({ sentAt })
          .where('id', '=', campaign.id)
          .execute();

        const housing = await factories.housing.create({ status });
        await kysely
          .insertInto('campaignsHousing')
          .values({
            campaignId: campaign.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
          .execute();

        const event = genEventApi({
          creator: user,
          type: 'housing:status-updated',
          nextOld: {},
          nextNew: {}
        });
        await kysely
          .insertInto('events')
          .values({
            ...toEventInsert(event),
            createdAt: new Date(sentAt.getTime() + 1000)
          })
          .execute();
        await kysely
          .insertInto('housingEvents')
          .values({
            eventId: event.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
          .execute();

        return { campaign, housing };
      }

      it.each([
        [HousingStatus.NEVER_CONTACTED, 0],
        [HousingStatus.WAITING, 0],
        [HousingStatus.FIRST_CONTACT, 1],
        [HousingStatus.IN_PROGRESS, 1],
        [HousingStatus.COMPLETED, 1],
        [HousingStatus.BLOCKED, 1]
      ])(
        'should count %s housing as %i in return_count',
        async (status, expected) => {
          const { campaign } = await setupCampaignWithHousing(status);

          const result = await campaignRepository.findOne({
            id: campaign.id,
            establishmentId: establishment.id
          });

          expect(result?.returnCount).toBe(expected);
        }
      );
    });

    describe('return_count on housing status change', () => {
      it('should decrement return_count when housing status moves from qualifying to non-qualifying', async () => {
        const sentAt = faker.date.past();
        const campaign = await factories
          .campaign(establishment)
          .create({}, { associations: { createdBy: user } });
        await kysely
          .updateTable('campaigns')
          .set({ sentAt })
          .where('id', '=', campaign.id)
          .execute();

        const housing = await factories.housing.create({
          status: HousingStatus.FIRST_CONTACT
        });
        await kysely
          .insertInto('campaignsHousing')
          .values({
            campaignId: campaign.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
          .execute();

        const event = genEventApi({
          creator: user,
          type: 'housing:status-updated',
          nextOld: {},
          nextNew: {}
        });
        await kysely
          .insertInto('events')
          .values({
            ...toEventInsert(event),
            createdAt: new Date(sentAt.getTime() + 1000)
          })
          .execute();
        await kysely
          .insertInto('housingEvents')
          .values({
            eventId: event.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
          .execute();

        // Verify housing is counted before status change
        const before = await campaignRepository.findOne({
          id: campaign.id,
          establishmentId: establishment.id
        });
        expect(before?.returnCount).toBe(1);

        // Move status out of qualifying range
        await kysely
          .updateTable('fastHousing')
          .set({ status: HousingStatus.WAITING })
          .where('id', '=', housing.id)
          .where('geoCode', '=', housing.geoCode)
          .execute();

        const after = await campaignRepository.findOne({
          id: campaign.id,
          establishmentId: establishment.id
        });
        expect(after?.returnCount).toBe(0);
      });

      it('should increment return_count when housing status moves from non-qualifying to qualifying', async () => {
        const sentAt = faker.date.past();
        const campaign = await factories
          .campaign(establishment)
          .create({}, { associations: { createdBy: user } });
        await kysely
          .updateTable('campaigns')
          .set({ sentAt })
          .where('id', '=', campaign.id)
          .execute();

        const housing = await factories.housing.create({
          status: HousingStatus.WAITING
        });
        await kysely
          .insertInto('campaignsHousing')
          .values({
            campaignId: campaign.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
          .execute();

        const event = genEventApi({
          creator: user,
          type: 'housing:status-updated',
          nextOld: {},
          nextNew: {}
        });
        await kysely
          .insertInto('events')
          .values({
            ...toEventInsert(event),
            createdAt: new Date(sentAt.getTime() + 1000)
          })
          .execute();
        await kysely
          .insertInto('housingEvents')
          .values({
            eventId: event.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
          .execute();

        // Verify housing is not counted before status change
        const before = await campaignRepository.findOne({
          id: campaign.id,
          establishmentId: establishment.id
        });
        expect(before?.returnCount).toBe(0);

        // Move status into qualifying range
        await kysely
          .updateTable('fastHousing')
          .set({ status: HousingStatus.FIRST_CONTACT })
          .where('id', '=', housing.id)
          .where('geoCode', '=', housing.geoCode)
          .execute();

        const after = await campaignRepository.findOne({
          id: campaign.id,
          establishmentId: establishment.id
        });
        expect(after?.returnCount).toBe(1);
      });
    });
  });
});
