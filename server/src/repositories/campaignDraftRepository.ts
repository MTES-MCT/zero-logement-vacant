import { Knex } from 'knex';

import db from '~/infra/database';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import { CampaignApi } from '~/models/CampaignApi';
import { DraftApi } from '~/models/DraftApi';

export const campaignsDraftsTable = 'campaigns_drafts';
export const CampaignsDrafts = (transaction: Knex<CampaignDraftDBO> = db) =>
  transaction(campaignsDraftsTable);

async function save(campaign: CampaignApi, draft: DraftApi): Promise<void> {
  await withinKyselyTransaction(async (trx) => {
    await trx
      .insertInto('campaignsDrafts')
      .values({
        campaignId: campaign.id,
        draftId: draft.id
      })
      .onConflict((oc) => oc.columns(['campaignId', 'draftId']).doNothing())
      .execute();
  });
}

export interface CampaignDraftDBO {
  campaign_id: string;
  draft_id: string;
}

export default {
  save
};
