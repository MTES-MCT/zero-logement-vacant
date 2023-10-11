import { establishmentsTable } from '../../../server/repositories/establishmentRepository';
import { Knex } from 'knex';
import campaignRepository, {
  campaignsTable,
} from '../../../server/repositories/campaignRepository';
import { DefaultCampaign } from '../../../server/models/CampaignApi';

exports.seed = function (knex: Knex) {
  return knex
    .table(establishmentsTable)
    .select('id')
    .whereNotExists(function (whereBuilder: any) {
      whereBuilder
        .from(campaignsTable)
        .whereRaw(
          `${campaignsTable}.establishment_id = ${establishmentsTable}.id`
        )
        .andWhere(`${campaignsTable}.campaign_number`, 0);
    })
    .andWhere('available', true)
    .then((results) => {
      if (results.length) {
        return knex
          .table(campaignsTable)
          .insert(
            results.map((result) =>
              campaignRepository.formatCampaignApi(<any>{
                ...DefaultCampaign,
                establishmentId: result.id,
                groupId: null,
              })
            )
          )
        );
      }
    });
};
