// @ts-ignore
import { User1 } from './002-users';
import { Establishment1 } from './001-establishments';
import { Housing1 } from './004-housing';
import { genCampaignApi } from '../../server/test/testFixtures';
import campaignRepository from '../../server/repositories/campaignRepository';

export const Campaign1 = genCampaignApi(Establishment1.id, 1, 0, User1.id);

console.log('Campaign1', Campaign1)
console.log('campaignRepository.formatCampaignApi(Campaign1)', campaignRepository.formatCampaignApi(Campaign1))


exports.seed = function(knex: any) {
    return Promise.all([
        knex.table('campaigns').insert(campaignRepository.formatCampaignApi(Campaign1)).then(() =>
            knex.table('campaigns_housing').insert({
                campaign_id: Campaign1.id,
                housing_id: Housing1.id
            })
        )
    ])
};
