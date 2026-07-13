import { faker } from '@faker-js/faker/locale/fr';

import campaignHousingRepository, {
  CampaignsHousing,
  formatCampaignHousingApi
} from '~/repositories/campaignHousingRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import { toUserDBO, Users } from '~/repositories/userRepository';
import { factories } from '~/test/factories';
import {
  genEstablishmentApi,
  genHousingApi,
  genUserApi
} from '~/test/testFixtures';

describe('Campaign housing repository', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));
  });

  describe('removeMany', () => {
    it('should remove housings from a campaign', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const housings = faker.helpers.multiple(() =>
        genHousingApi(faker.helpers.arrayElement(establishment.geoCodes))
      );
      await Housing().insert(housings.map(formatHousingRecordApi));
      const slice = housings.slice(0, 1);

      await campaignHousingRepository.removeMany(campaign, slice);

      const campaignHousings = await CampaignsHousing()
        .where({ campaign_id: campaign.id })
        .whereIn(
          ['housing_geo_code', 'housing_id'],
          housings.map((housing) => [housing.geoCode, housing.id])
        );
      expect(campaignHousings).toBeArrayOfSize(0);
    });

    it('should do nothing and leave count unchanged when housing list is empty', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const housings = faker.helpers.multiple(
        () => genHousingApi(faker.helpers.arrayElement(establishment.geoCodes)),
        { count: { min: 1, max: 3 } }
      );
      await Housing().insert(housings.map(formatHousingRecordApi));
      await CampaignsHousing().insert(
        housings.map((housing) => ({
          campaign_id: campaign.id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        }))
      );

      const countBefore = await CampaignsHousing()
        .where({ campaign_id: campaign.id })
        .count<{ count: string }>('*')
        .first();

      await campaignHousingRepository.removeMany(campaign, []);

      const countAfter = await CampaignsHousing()
        .where({ campaign_id: campaign.id })
        .count<{ count: string }>('*')
        .first();

      expect(Number(countAfter?.count)).toBe(Number(countBefore?.count));
    });

    it('should remove only the specified subset, leaving others intact', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const housings = faker.helpers.multiple(
        () => genHousingApi(faker.helpers.arrayElement(establishment.geoCodes)),
        { count: { min: 2, max: 4 } }
      );
      await Housing().insert(housings.map(formatHousingRecordApi));
      await campaignHousingRepository.insertHousingList(campaign.id, housings);

      const toRemove = housings.slice(0, 1);
      const toKeep = housings.slice(1);

      await campaignHousingRepository.removeMany(campaign, toRemove);

      const remaining = await CampaignsHousing().where({
        campaign_id: campaign.id
      });
      const remainingIds = remaining.map((r) => r.housing_id);
      expect(remainingIds).not.toContain(toRemove[0].id);
      toKeep.forEach((h) => {
        expect(remainingIds).toContain(h.id);
      });
    });
  });

  describe('insertHousingList', () => {
    it('should insert one row per housing with correct fields', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const housings = faker.helpers.multiple(
        () => genHousingApi(faker.helpers.arrayElement(establishment.geoCodes)),
        { count: { min: 2, max: 5 } }
      );
      await Housing().insert(housings.map(formatHousingRecordApi));

      await campaignHousingRepository.insertHousingList(campaign.id, housings);

      const rows = await CampaignsHousing().where({ campaign_id: campaign.id });
      expect(rows).toBeArrayOfSize(housings.length);
      housings.forEach((housing) => {
        const row = rows.find((r) => r.housing_id === housing.id);
        expect(row).toBeDefined();
        expect(row?.housing_geo_code).toBe(housing.geoCode);
        expect(row?.campaign_id).toBe(campaign.id);
      });
    });

    it('should deduplicate rows when called twice with the same housings', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const housings = faker.helpers.multiple(
        () => genHousingApi(faker.helpers.arrayElement(establishment.geoCodes)),
        { count: { min: 2, max: 4 } }
      );
      await Housing().insert(housings.map(formatHousingRecordApi));

      await campaignHousingRepository.insertHousingList(campaign.id, housings);
      await campaignHousingRepository.insertHousingList(campaign.id, housings);

      const rows = await CampaignsHousing().where({ campaign_id: campaign.id });
      expect(rows).toBeArrayOfSize(housings.length);
    });
  });

  describe('formatCampaignHousingApi', () => {
    it('should map housing.id, housing.geoCode, and campaign.id to DBO fields', () => {
      const campaign = { id: faker.string.uuid() };
      const housings = faker.helpers.multiple(() =>
        genHousingApi(faker.helpers.arrayElement(establishment.geoCodes))
      );

      const result = formatCampaignHousingApi(campaign, housings);

      expect(result).toBeArrayOfSize(housings.length);
      housings.forEach((housing, index) => {
        expect(result[index]).toMatchObject({
          campaign_id: campaign.id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        });
      });
    });

    it('should return an empty array when housing list is empty', () => {
      const campaign = { id: faker.string.uuid() };

      const result = formatCampaignHousingApi(campaign, []);

      expect(result).toBeArrayOfSize(0);
    });
  });
});
