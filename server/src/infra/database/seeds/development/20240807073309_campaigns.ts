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
import { parseUserApi, Users } from '~/repositories/userRepository';
import { Groups, parseGroupApi } from '~/repositories/groupRepository';
import { Housing } from '~/repositories/housingRepository';
import {
  CampaignHousingDBO,
  CampaignsHousing,
  campaignsHousingTable
} from '~/repositories/campaignHousingRepository';
import { Array, pipe } from 'effect';

export async function seed(knex: Knex): Promise<void> {
  console.time('20240807073309_campaigns');
  await CampaignsHousing(knex).delete();
  await Campaigns(knex).delete();

  const establishments = await Establishments(knex).where({ available: true });
  await async.forEachSeries(establishments, async (establishment) => {
    const [users, groups] = await Promise.all([
      Users(knex).where({ establishment_id: establishment.id }),
      Groups(knex).where({ establishment_id: establishment.id })
    ]);

    const campaigns = pipe(
      faker.helpers.arrayElements(groups, {
        min: 2,
        max: 10
      }),
      Array.map((group) =>
        genCampaignApi(
          establishment.id,
          parseUserApi(faker.helpers.arrayElement(users)),
          parseGroupApi(group)
        )
      )
    );

    console.log(`Inserting ${campaigns.length} campaigns...`, {
      establishment: establishment.name
    });
    await knex.batchInsert<CampaignDBO>(
      campaignsTable,
      campaigns.map(formatCampaignApi)
    );

    await async.forEachSeries(campaigns, async (campaign) => {
      const housings = await Housing(knex)
        .whereIn('geo_code', establishment.localities_geo_code)
        .limit(faker.number.int({ min: 1, max: 1000 }));
      const campaignHousings = housings.map<CampaignHousingDBO>((housing) => ({
        campaign_id: campaign.id,
        housing_geo_code: housing.geo_code,
        housing_id: housing.id
      }));
      console.log(
        `Adding ${campaignHousings.length} housings to the campaign ${campaign.title}...`
      );
      await knex.batchInsert<CampaignHousingDBO>(
        campaignsHousingTable,
        campaignHousings
      );
    });
  });
  console.timeEnd('20240807073309_campaigns');
  console.log('\n')
}
