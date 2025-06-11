import { faker } from '@faker-js/faker/locale/fr';
import campaignHousingRepository, {
  CampaignsHousing
} from '~/repositories/campaignHousingRepository';
import {
  Campaigns,
  formatCampaignApi
} from '~/repositories/campaignRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  genCampaignApi,
  genEstablishmentApi,
  genHousingApi,
  genUserApi
} from '~/test/testFixtures';

describe('Campaign housing repository', () => {
  describe('removeMany', () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);

    beforeAll(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(formatUserApi(user));
    });

    it('should remove housings from a campaign', async () => {
      const campaign = genCampaignApi(establishment.id, user.id);
      await Campaigns().insert(formatCampaignApi(campaign));
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
  });
});
