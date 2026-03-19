import { faker } from '@faker-js/faker/locale/fr';

import { CampaignEventApi, CampaignHousingEventApi } from '~/models/EventApi';
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
  formatEventApi
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
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  genCampaignApi,
  genEstablishmentApi,
  genEventApi,
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi,
  genUserApi
} from '~/test/testFixtures';

describe('Campaign repository', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
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
      await Users().insert(formatUserApi(user));
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
      await HousingOwners().insert(formatHousingOwnerApi({ ...primaryHousingOwner, rank: 1 }));

      const secondaryOwner = genOwnerApi();
      await Owners().insert(formatOwnerApi(secondaryOwner));
      const secondaryHousingOwner = genHousingOwnerApi(housing, secondaryOwner);
      await HousingOwners().insert(formatHousingOwnerApi({ ...secondaryHousingOwner, rank: 2 }));

      await HousingOwners()
        .where({ owner_id: secondaryOwner.id, housing_id: housing.id })
        .update({ rank: 3 });

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: campaign.establishmentId
      });

      expect(result?.ownerCount).toBe(1);
    });

    it('should compute return_rate as return_count / housing_count', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert({ ...formatCampaignApi(campaign), return_count: 4, sent_at: new Date() });

      const housings = faker.helpers.multiple(() => genHousingApi(), { count: 10 });
      await Housing().insert(housings.map(formatHousingRecordApi));

      await CampaignsHousing().insert(
        housings.map((housing) => ({
          campaign_id: campaign.id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        }))
      );

      const result = await campaignRepository.findOne({
        id: campaign.id,
        establishmentId: campaign.establishmentId
      });

      expect(result?.returnRate).toBeCloseTo(0.4);
    });
  });
});
