// @ts-ignore
import { User1 } from './003-users';
import { Establishment1 } from './001-establishments';
import { Housing0, Housing1 } from './005-housing';
import { genCampaignApi } from '../../../server/test/testFixtures';
import campaignRepository, { campaignsTable } from '../../../server/repositories/campaignRepository';
import { campaignsHousingTable } from '../../../server/repositories/campaignHousingRepository';
import { housingTable } from '../../../server/repositories/housingRepository';
import { HousingStatusApi } from '../../../server/models/HousingStatusApi';
import { Knex } from 'knex';

export const Campaign1 = genCampaignApi(Establishment1.id, 1, 0, User1.id);

exports.seed = function(knex: Knex) {
    return Promise.all([
        knex.table(campaignsTable)
            .where('establishment_id', Establishment1.id)
            .andWhere('campaign_number', 0)
            .first()
            .then(campaign =>
                    knex.table(campaignsHousingTable).insert({
                    campaign_id: campaign.id,
                    housing_id: Housing0.id
                })
            ),
        knex.table(campaignsTable).insert(campaignRepository.formatCampaignApi(Campaign1)).then(() =>
            knex.table(campaignsHousingTable).insert({
                campaign_id: Campaign1.id,
                housing_id: Housing1.id
            })
        ),
        knex.table(housingTable).update({status: HousingStatusApi.Waiting}).where('id', Housing1.id)
    ])
};
