import { faker } from '@faker-js/faker/locale/fr';
import async from 'async';
import type { Knex } from 'knex';

import {
  CampaignDBO,
  Campaigns,
  campaignsTable,
  formatCampaignApi
} from '~/repositories/campaignRepository';
import { Establishments } from '~/repositories/establishmentRepository';
import { genCampaignApi } from '~/test/testFixtures';
import { Users } from '~/repositories/userRepository';
import { Groups, parseGroupApi } from '~/repositories/groupRepository';
import { Housing } from '~/repositories/housingRepository';
import {
  CampaignHousingDBO,
  CampaignsHousing,
  campaignsHousingTable
} from '~/repositories/campaignHousingRepository';

export async function seed(knex: Knex): Promise<void> {
  await CampaignsHousing(knex).delete();
  await Campaigns(knex).delete();

  const establishments = await Establishments(knex).where({ available: true });
  await async.forEach(establishments, async (establishment) => {
    const [users, groups] = await Promise.all([
      Users(knex).where({ establishment_id: establishment.id }),
      Groups(knex).where({ establishment_id: establishment.id })
    ]);

    const campaigns = faker.helpers.multiple(
      () => {
        const creator = faker.helpers.arrayElement(users);
        // Optionally link the campaign to a group with a 10% probability
        const group = faker.helpers.maybe(
          () => parseGroupApi(faker.helpers.arrayElement(groups)),
          { probability: 0.1 }
        );
        return genCampaignApi(establishment.id, creator.id, group);
      },
      {
        count: { min: 1, max: 5 }
      }
    );

    console.log('Inserting campaigns...', {
      establishment: establishment.name,
      campaigns: campaigns.length
    });
    await knex.batchInsert<CampaignDBO>(
      campaignsTable,
      campaigns.map(formatCampaignApi)
    );

    await async.forEach(campaigns, async (campaign) => {
      const housings = await Housing(knex)
        .whereIn('geo_code', establishment.localities_geo_code)
        .limit(faker.number.int({ min: 1, max: 1000 }));
      const campaignHousings = housings.map<CampaignHousingDBO>((housing) => ({
        campaign_id: campaign.id,
        housing_geo_code: housing.geo_code,
        housing_id: housing.id
      }));
      console.log('Linking campaigns to housings...', {
        campaign: campaign.title,
        housings: campaignHousings.length
      });
      await knex.batchInsert<CampaignHousingDBO>(
        campaignsHousingTable,
        campaignHousings
      );
    });
  });
}
