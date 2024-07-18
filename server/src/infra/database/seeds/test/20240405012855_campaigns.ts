import { Knex } from 'knex';

import { HousingStatusApi } from '~/models/HousingStatusApi';
import campaignRepository, {
  campaignsTable
} from '~/repositories/campaignRepository';
import { campaignsHousingTable } from '~/repositories/campaignHousingRepository';
import { housingTable } from '~/repositories/housingRepository';
import { genCampaignApi } from '~/test/testFixtures';
import { User1 } from './20240405012221_users';
import { Establishment1 } from './20240405011849_establishments';
import { Housing1 } from './20240405012750_housing';

export const Campaign1 = genCampaignApi(Establishment1.id, User1.id);

export async function seed(knex: Knex): Promise<void> {
  await Promise.all([
    knex
      .table(campaignsTable)
      .insert(campaignRepository.formatCampaignApi(Campaign1))
      .then(() =>
        knex.table(campaignsHousingTable).insert({
          campaign_id: Campaign1.id,
          housing_id: Housing1.id,
          housing_geo_code: Housing1.geoCode,
        })
      ),
    knex
      .table(housingTable)
      .update({ status: HousingStatusApi.Waiting, })
      .where('id', Housing1.id)
  ]);
}
