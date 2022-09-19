// @ts-ignore
import { establishmentsTable, housingScopeGeometryTable } from '../../../server/repositories/establishmentRepository';
import { Knex } from 'knex';
import campaignRepository, { campaignsTable } from '../../../server/repositories/campaignRepository';
import { CampaignApi } from '../../../server/models/CampaignApi';
import { v4 as uuidv4 } from 'uuid';
import { format, formatISO } from 'date-fns';

exports.seed = function(knex: Knex) {
    return knex
        .table(establishmentsTable)
        .select('id')
        .whereNotExists(function (whereBuilder: any) {
            whereBuilder.from(campaignsTable)
                .whereRaw(`${campaignsTable}.establishment_id = ${establishmentsTable}.id`)
                .andWhere(`${campaignsTable}.campaign_number`, 0)
        })
        .andWhere('available', true)
        .then(results => {
            if (results.length) {
                return knex.table(campaignsTable)
                    .insert(results.map(result => campaignRepository.formatCampaignApi(<CampaignApi>{
                        id: uuidv4(),
                        establishmentId: result.id,
                        campaignNumber: 0,
                        startMonth: format(new Date(), 'yyMM'),
                        filters: {},
                        createdAt: new Date(),
                        validatedAt: new Date(),
                        exportedAt: new Date(),
                        sentAt: new Date(),
                        sendingDate: formatISO(new Date())
                    })))
            }
        }

        )
};
