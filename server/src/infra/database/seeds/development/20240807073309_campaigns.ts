import { faker } from '@faker-js/faker/locale/fr';
import async from 'async';
import { Array, pipe } from 'effect';
import type { Knex } from 'knex';

import {
  CampaignHousingDBO,
  campaignsHousingTable
} from '~/repositories/campaignHousingRepository';
import {
  CampaignDBO,
  campaignsTable,
  formatCampaignApi
} from '~/repositories/campaignRepository';
import {
  EstablishmentDBO,
  establishmentsTable
} from '~/repositories/establishmentRepository';
import {
  GroupDBO,
  GROUPS_TABLE,
  parseGroupApi
} from '~/repositories/groupRepository';
import { HousingDBO, housingTable } from '~/repositories/housingRepository';
import {
  fromUserDBO,
  USERS_TABLE,
  UserDBO
} from '~/repositories/userRepository';
import { genCampaignApi } from '~/test/testFixtures';

export async function seed(knex: Knex): Promise<void> {
  console.time('20240807073309_campaigns');
  await knex<CampaignHousingDBO>(campaignsHousingTable).delete();
  await knex<CampaignDBO>(campaignsTable).delete();

  const establishments = await knex<EstablishmentDBO>(
    establishmentsTable
  ).where({ available: true });
  await async.forEachSeries(establishments, async (establishment) => {
    const [users, groups] = await Promise.all([
      knex<UserDBO>(USERS_TABLE).where({ establishment_id: establishment.id }),
      knex<GroupDBO>(GROUPS_TABLE).where({
        establishment_id: establishment.id
      })
    ]);

    const campaigns = pipe(
      faker.helpers.arrayElements(groups, {
        min: 2,
        max: 10
      }),
      Array.map((group) =>
        genCampaignApi(
          establishment.id,
          fromUserDBO(faker.helpers.arrayElement(users)),
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
      const housings = await knex<HousingDBO>(housingTable)
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
  console.log('\n');
}
