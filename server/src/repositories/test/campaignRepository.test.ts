import { faker } from '@faker-js/faker/locale/fr';

import {
  CampaignEventApi,
  CampaignHousingEventApi,
  HousingEventApi
} from '~/models/EventApi';
import { CampaignsDrafts } from '~/repositories/campaignDraftRepository';
import { CampaignsHousing } from '~/repositories/campaignHousingRepository';
import campaignRepository, {
  Campaigns,
  formatCampaignApi
} from '~/repositories/campaignRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  CampaignEvents,
  CampaignHousingEventDBO,
  CampaignHousingEvents,
  Events,
  formatCampaignEventApi,
  formatCampaignHousingEventApi,
  formatEventApi,
  formatHousingEventApi,
  HousingEvents
} from '~/repositories/eventRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import {
  formatHousingOwnerApi,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import { toUserDBO, Users } from '~/repositories/userRepository';
import {
  genCampaignApi,
  genEstablishmentApi,
  genEventApi,
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi,
  genUserApi
} from '~/test/testFixtures';
import { HousingStatus } from '@zerologementvacant/models';

describe('Campaign repository', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));
  });

  describe('find', () => {
    const establishment2 = genEstablishmentApi();

    beforeAll(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment2));
    });

    describe('geoCodes filter', () => {
      it('should return all campaigns when geoCodes is undefined', async () => {
        const campaign = genCampaignApi(establishment.id, user);
        const housing = genHousingApi(establishment.geoCodes[0]);
        await Campaigns().insert(formatCampaignApi(campaign));
        await Housing().insert(formatHousingRecordApi(housing));
        await CampaignsHousing().insert({
          campaign_id: campaign.id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        });

        const result = await campaignRepository.find({
          filters: { establishmentId: establishment.id }
        });

        expect(result.map((campaign) => campaign.id)).toContain(campaign.id);
      });

      it('should return no campaigns when geoCodes is empty', async () => {
        const campaign = genCampaignApi(establishment.id, user);
        const housing = genHousingApi(establishment.geoCodes[0]);
        await Campaigns().insert(formatCampaignApi(campaign));
        await Housing().insert(formatHousingRecordApi(housing));
        await CampaignsHousing().insert({
          campaign_id: campaign.id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        });

        const result = await campaignRepository.find({
          filters: { establishmentId: establishment.id, geoCodes: [] }
        });

        expect(result).toBeArrayOfSize(0);
      });

      it('should return only campaigns whose housings are all within geoCodes', async () => {
        const inGeoCode = establishment.geoCodes[0];
        const outGeoCode = establishment2.geoCodes[0];

        const campaignIn = genCampaignApi(establishment.id, user);
        const campaignOut = genCampaignApi(establishment.id, user);
        const housingIn = genHousingApi(inGeoCode);
        const housingOut = genHousingApi(outGeoCode);

        await Campaigns().insert([
          formatCampaignApi(campaignIn),
          formatCampaignApi(campaignOut)
        ]);
        await Housing().insert([
          formatHousingRecordApi(housingIn),
          formatHousingRecordApi(housingOut)
        ]);
        await CampaignsHousing().insert([
          { campaign_id: campaignIn.id, housing_id: housingIn.id, housing_geo_code: housingIn.geoCode },
          { campaign_id: campaignOut.id, housing_id: housingOut.id, housing_geo_code: housingOut.geoCode }
        ]);

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

        const campaign = genCampaignApi(establishment.id, user);
        const housingIn = genHousingApi(inGeoCode);
        const housingOut = genHousingApi(outGeoCode);

        await Campaigns().insert(formatCampaignApi(campaign));
        await Housing().insert([
          formatHousingRecordApi(housingIn),
          formatHousingRecordApi(housingOut)
        ]);
        await CampaignsHousing().insert([
          { campaign_id: campaign.id, housing_id: housingIn.id, housing_geo_code: housingIn.geoCode },
          { campaign_id: campaign.id, housing_id: housingOut.id, housing_geo_code: housingOut.geoCode }
        ]);

        const result = await campaignRepository.find({
          filters: { establishmentId: establishment.id, geoCodes: [inGeoCode] }
        });

        expect(result.map((campaign) => campaign.id)).not.toContain(campaign.id);
      });
    });
  });

  describe('findOne', () => {
    it('should include the campaign creator', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert(formatCampaignApi(campaign));

      const actual = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: campaign.establishmentId
      });

      expect(actual?.createdBy).toMatchObject({
        id: user.id,
        email: user.email
      });
    });

    it('should expose returnCount from the database', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert({ ...formatCampaignApi(campaign), return_count: 5, sent_at: new Date() });

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: campaign.establishmentId
      });

      expect(result?.returnCount).toBe(5);
    });

    it('should expose returnCount as null when sentAt is null', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert({ ...formatCampaignApi(campaign), return_count: 0 });

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: campaign.establishmentId
      });

      expect(result?.returnCount).toBeNull();
    });

    it('should expose housingCount from the database', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert({ ...formatCampaignApi(campaign), housing_count: 3 });

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: campaign.establishmentId
      });

      expect(result?.housingCount).toBe(3);
    });

    it('should expose ownerCount from the database', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert({ ...formatCampaignApi(campaign), owner_count: 2 });

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: campaign.establishmentId
      });

      expect(result?.ownerCount).toBe(2);
    });

    it('should expose returnRate from the database when sentAt is set', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert({
        ...formatCampaignApi(campaign),
        housing_count: 10,
        return_count: 4,
        sent_at: new Date()
      });

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: campaign.establishmentId
      });

      expect(result?.returnRate).toBeCloseTo(0.4);
    });

    it('should expose returnRate as null when sentAt is null', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert({
        ...formatCampaignApi(campaign),
        housing_count: 10,
        return_count: 0
      });

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: campaign.establishmentId
      });

      expect(result?.returnRate).toBeNull();
    });

    describe('geoCodes filter', () => {
      it('should return null when geoCodes is empty', async () => {
        const campaign = genCampaignApi(establishment.id, user);
        const housing = genHousingApi(establishment.geoCodes[0]);
        await Campaigns().insert(formatCampaignApi(campaign));
        await Housing().insert(formatHousingRecordApi(housing));
        await CampaignsHousing().insert({
          campaign_id: campaign.id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        });

        const result = await campaignRepository.findOne({
          id: campaign.id,
          establishmentId: establishment.id,
          geoCodes: []
        });

        expect(result).toBeNull();
      });

      it('should return null when campaign has housing outside geoCodes', async () => {
        const establishment2 = genEstablishmentApi();
        const campaign = genCampaignApi(establishment.id, user);
        const outsideHousing = genHousingApi(establishment2.geoCodes[0]);
        await Campaigns().insert(formatCampaignApi(campaign));
        await Housing().insert(formatHousingRecordApi(outsideHousing));
        await CampaignsHousing().insert({
          campaign_id: campaign.id,
          housing_id: outsideHousing.id,
          housing_geo_code: outsideHousing.geoCode
        });

        const result = await campaignRepository.findOne({
          id: campaign.id,
          establishmentId: establishment.id,
          geoCodes: [establishment.geoCodes[0]]
        });

        expect(result).toBeNull();
      });

      it('should return campaign when all housing is within geoCodes', async () => {
        const inGeoCode = establishment.geoCodes[0];
        const campaign = genCampaignApi(establishment.id, user);
        const housing = genHousingApi(inGeoCode);
        await Campaigns().insert(formatCampaignApi(campaign));
        await Housing().insert(formatHousingRecordApi(housing));
        await CampaignsHousing().insert({
          campaign_id: campaign.id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        });

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
    const campaign = genCampaignApi(establishment.id, user);
    const housings = faker.helpers.multiple(() => genHousingApi());
    const campaignEvents: ReadonlyArray<CampaignEventApi> = [
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
    const campaignHousingEvents: ReadonlyArray<CampaignHousingEventApi> =
      housings.map((housing) => ({
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

    beforeAll(async () => {
      await Campaigns().insert(formatCampaignApi(campaign));
      await Housing().insert(housings.map(formatHousingRecordApi));
      await Events().insert(
        [...campaignEvents, ...campaignHousingEvents].map(formatEventApi)
      );
      await CampaignEvents().insert(campaignEvents.map(formatCampaignEventApi));
      await CampaignHousingEvents().insert(
        campaignHousingEvents.map(formatCampaignHousingEventApi)
      );

      await campaignRepository.remove(campaign.id);
    });

    it('should remove a campaign', async () => {
      const actual = await Campaigns().where({ id: campaign.id }).first();
      expect(actual).toBeUndefined();
    });

    it('should unlink the associated housings', async () => {
      const actual = await CampaignsHousing().where({
        campaign_id: campaign.id
      });
      expect(actual).toBeArrayOfSize(0);
    });

    it('should remove the associated events', async () => {
      const actual = await Events().whereIn(
        'id',
        campaignEvents.map((event) => event.id)
      );
      expect(actual).toBeArrayOfSize(0);
    });

    it('should remove the associated campaign events', async () => {
      const actual = await CampaignEvents().where({ campaign_id: campaign.id });
      expect(actual).toBeArrayOfSize(0);
    });

    it('should unlink the associated drafts', async () => {
      const actual = await CampaignsDrafts().where({
        campaign_id: campaign.id
      });
      expect(actual).toBeArrayOfSize(0);
    });

    it('should set the associated housing events foreign key to null', async () => {
      const actual = await CampaignHousingEvents().whereIn(
        ['housing_geo_code', 'housing_id'],
        housings.map((housing) => [housing.geoCode, housing.id])
      );
      expect(actual.length).toBeGreaterThan(0);
      expect(actual).toSatisfyAll<CampaignHousingEventDBO>(
        (event) => event.campaign_id === null
      );
    });
  });

  describe('triggers', () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);

    beforeAll(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(toUserDBO(user));
    });

    it('should increment housing_count when housing is added to campaign', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert(formatCampaignApi(campaign));

      const housing = genHousingApi();
      await Housing().insert(formatHousingRecordApi(housing));

      await CampaignsHousing().insert({
        campaign_id: campaign.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode
      });

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: campaign.establishmentId
      });

      expect(result?.housingCount).toBe(1);
    });

    it('should decrement housing_count when housing is removed from campaign', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert(formatCampaignApi(campaign));

      const housing = genHousingApi();
      await Housing().insert(formatHousingRecordApi(housing));

      await CampaignsHousing().insert({
        campaign_id: campaign.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode
      });

      await CampaignsHousing()
        .where({ campaign_id: campaign.id, housing_id: housing.id })
        .delete();

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: campaign.establishmentId
      });

      expect(result?.housingCount).toBe(0);
    });

    it('should increment owner_count when a primary owner is added to housing in campaign', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert(formatCampaignApi(campaign));

      const housing = genHousingApi();
      await Housing().insert(formatHousingRecordApi(housing));

      await CampaignsHousing().insert({
        campaign_id: campaign.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode
      });

      const owner = genOwnerApi();
      await Owners().insert(formatOwnerApi(owner));

      const housingOwner = genHousingOwnerApi(housing, owner);
      await HousingOwners().insert(formatHousingOwnerApi({ ...housingOwner, rank: 1 }));

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: campaign.establishmentId
      });

      expect(result?.ownerCount).toBe(1);
    });

    it('should decrement owner_count when a primary owner is removed from housing in campaign', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert(formatCampaignApi(campaign));

      const housing = genHousingApi();
      await Housing().insert(formatHousingRecordApi(housing));

      await CampaignsHousing().insert({
        campaign_id: campaign.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode
      });

      const owner = genOwnerApi();
      await Owners().insert(formatOwnerApi(owner));

      const housingOwner = genHousingOwnerApi(housing, owner);
      await HousingOwners().insert(formatHousingOwnerApi({ ...housingOwner, rank: 1 }));

      await HousingOwners()
        .where({ owner_id: owner.id, housing_id: housing.id })
        .delete();

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: campaign.establishmentId
      });

      expect(result?.ownerCount).toBe(0);
    });

    it('should decrement owner_count when owner rank changes from 1 to 2', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert(formatCampaignApi(campaign));

      const housing = genHousingApi();
      await Housing().insert(formatHousingRecordApi(housing));

      await CampaignsHousing().insert({
        campaign_id: campaign.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode
      });

      const owner = genOwnerApi();
      await Owners().insert(formatOwnerApi(owner));

      const housingOwner = genHousingOwnerApi(housing, owner);
      await HousingOwners().insert(formatHousingOwnerApi({ ...housingOwner, rank: 1 }));

      await HousingOwners()
        .where({ owner_id: owner.id, housing_id: housing.id })
        .update({ rank: 2 });

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: campaign.establishmentId
      });

      expect(result?.ownerCount).toBe(0);
    });

    it('should not change owner_count when rank changes between non-primary values', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert(formatCampaignApi(campaign));

      const housing = genHousingApi();
      await Housing().insert(formatHousingRecordApi(housing));

      await CampaignsHousing().insert({
        campaign_id: campaign.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode
      });

      const primaryOwner = genOwnerApi();
      await Owners().insert(formatOwnerApi(primaryOwner));
      const primaryHousingOwner = genHousingOwnerApi(housing, primaryOwner);
      await HousingOwners().insert(
        formatHousingOwnerApi({ ...primaryHousingOwner, rank: 1 })
      );

      const secondaryOwner = genOwnerApi();
      await Owners().insert(formatOwnerApi(secondaryOwner));
      const secondaryHousingOwner = genHousingOwnerApi(housing, secondaryOwner);
      await HousingOwners().insert(
        formatHousingOwnerApi({ ...secondaryHousingOwner, rank: 2 })
      );

      await HousingOwners()
        .where({ owner_id: secondaryOwner.id, housing_id: housing.id })
        .update({ rank: 3 });

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: campaign.establishmentId
      });

      expect(result?.ownerCount).toBe(1);
    });

    it('should decrement return_count when a housing with return events is detached', async () => {
      const sentAt = faker.date.past();
      const campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert({ ...formatCampaignApi(campaign), sent_at: sentAt });

      const housing = { ...genHousingApi(), status: HousingStatus.FIRST_CONTACT };
      await Housing().insert(formatHousingRecordApi(housing));

      await CampaignsHousing().insert({
        campaign_id: campaign.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode
      });

      const event = genEventApi({
        creator: user,
        type: 'housing:status-updated',
        nextOld: {},
        nextNew: {}
      });
      await Events().insert({
        ...formatEventApi(event),
        created_at: new Date(sentAt.getTime() + 1000)
      });
      await HousingEvents().insert({
        event_id: event.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode
      });

      await CampaignsHousing()
        .where({ campaign_id: campaign.id, housing_id: housing.id })
        .delete();

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: campaign.establishmentId
      });

      expect(result?.returnCount).toBe(0);
    });

    it('should compute return_rate as return_count / housing_count', async () => {
      const sentAt = faker.date.past();
      const campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert({
        ...formatCampaignApi(campaign),
        sent_at: sentAt
      });
      const housings = faker.helpers.multiple(
        () => ({ ...genHousingApi(), status: HousingStatus.FIRST_CONTACT }),
        { count: 10 }
      );
      await Housing().insert(housings.map(formatHousingRecordApi));
      await CampaignsHousing().insert(
        housings.map((housing) => ({
          campaign_id: campaign.id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        }))
      );
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
      await Events().insert(
        housingEvents.map((e) => ({ ...formatEventApi(e), created_at: afterSentAt }))
      );
      await HousingEvents().insert(housingEvents.map(formatHousingEventApi));

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: campaign.establishmentId
      });

      expect(result?.returnRate).toBeCloseTo(0.4);
    });

    describe('return_count status filter', () => {
      async function setupCampaignWithHousing(status: HousingStatus) {
        const sentAt = faker.date.past();
        const campaign = genCampaignApi(establishment.id, user);
        await Campaigns().insert({ ...formatCampaignApi(campaign), sent_at: sentAt });

        const housing = { ...genHousingApi(), status };
        await Housing().insert(formatHousingRecordApi(housing));
        await CampaignsHousing().insert({
          campaign_id: campaign.id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        });

        const event = genEventApi({
          creator: user,
          type: 'housing:status-updated',
          nextOld: {},
          nextNew: {}
        });
        await Events().insert({
          ...formatEventApi(event),
          created_at: new Date(sentAt.getTime() + 1000)
        });
        await HousingEvents().insert({
          event_id: event.id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        });

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
            establishmentId: campaign.establishmentId
          });

          expect(result?.returnCount).toBe(expected);
        }
      );
    });

    describe('return_count on housing status change', () => {
      it('should decrement return_count when housing status moves from qualifying to non-qualifying', async () => {
        const sentAt = faker.date.past();
        const campaign = genCampaignApi(establishment.id, user);
        await Campaigns().insert({ ...formatCampaignApi(campaign), sent_at: sentAt });

        const housing = { ...genHousingApi(), status: HousingStatus.FIRST_CONTACT };
        await Housing().insert(formatHousingRecordApi(housing));
        await CampaignsHousing().insert({
          campaign_id: campaign.id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        });

        const event = genEventApi({
          creator: user,
          type: 'housing:status-updated',
          nextOld: {},
          nextNew: {}
        });
        await Events().insert({
          ...formatEventApi(event),
          created_at: new Date(sentAt.getTime() + 1000)
        });
        await HousingEvents().insert({
          event_id: event.id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        });

        // Verify housing is counted before status change
        const before = await campaignRepository.findOne({
          id: campaign.id,
          establishmentId: campaign.establishmentId
        });
        expect(before?.returnCount).toBe(1);

        // Move status out of qualifying range
        await Housing()
          .where({ id: housing.id, geo_code: housing.geoCode })
          .update({ status: HousingStatus.WAITING });

        const after = await campaignRepository.findOne({
          id: campaign.id,
          establishmentId: campaign.establishmentId
        });
        expect(after?.returnCount).toBe(0);
      });

      it('should increment return_count when housing status moves from non-qualifying to qualifying', async () => {
        const sentAt = faker.date.past();
        const campaign = genCampaignApi(establishment.id, user);
        await Campaigns().insert({ ...formatCampaignApi(campaign), sent_at: sentAt });

        const housing = { ...genHousingApi(), status: HousingStatus.WAITING };
        await Housing().insert(formatHousingRecordApi(housing));
        await CampaignsHousing().insert({
          campaign_id: campaign.id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        });

        const event = genEventApi({
          creator: user,
          type: 'housing:status-updated',
          nextOld: {},
          nextNew: {}
        });
        await Events().insert({
          ...formatEventApi(event),
          created_at: new Date(sentAt.getTime() + 1000)
        });
        await HousingEvents().insert({
          event_id: event.id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        });

        // Verify housing is not counted before status change
        const before = await campaignRepository.findOne({
          id: campaign.id,
          establishmentId: campaign.establishmentId
        });
        expect(before?.returnCount).toBe(0);

        // Move status into qualifying range
        await Housing()
          .where({ id: housing.id, geo_code: housing.geoCode })
          .update({ status: HousingStatus.FIRST_CONTACT });

        const after = await campaignRepository.findOne({
          id: campaign.id,
          establishmentId: campaign.establishmentId
        });
        expect(after?.returnCount).toBe(1);
      });
    });
  });
});
