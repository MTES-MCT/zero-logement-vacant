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
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  genCampaignApi,
  genEstablishmentApi,
  genEventApi,
  genHousingApi,
  genUserApi
} from '~/test/testFixtures';

describe('Campaign repository', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('remove', () => {
    const campaign = genCampaignApi(establishment.id, user.id);
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
});
