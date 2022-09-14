// @ts-ignore
import { User1 } from './002-users';
import { Establishment1 } from './001-establishments';
import { Housing1 } from './004-housing';
import { genCampaignApi } from '../../server/test/testFixtures';
import campaignRepository, { campaignsTable } from '../../server/repositories/campaignRepository';
import { campaignsHousingTable } from '../../server/repositories/campaignHousingRepository';
import { housingTable } from '../../server/repositories/housingRepository';
import { HousingStatusApi } from '../../server/models/HousingStatusApi';

export const Campaign1 = genCampaignApi(Establishment1.id, 1, 0, User1.id);

exports.seed = function(knex: any) {
    return Promise.all([
        knex.table(campaignsTable).insert(campaignRepository.formatCampaignApi(Campaign1)).then(() =>
            knex.table(campaignsHousingTable).insert({
                campaign_id: Campaign1.id,
                housing_id: Housing1.id
            })
        ),
        knex.table(housingTable).update({status: HousingStatusApi.Waiting}).where('id', Housing1.id)
    ])
};
