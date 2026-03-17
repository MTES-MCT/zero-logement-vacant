import { Knex } from 'knex';

import db from '~/infra/database';
import { withinTransaction } from '~/infra/database/transaction';
import { CampaignApi } from '~/models/CampaignApi';
import { DraftApi } from '~/models/DraftApi';

export const campaignsDraftsTable = 'campaigns_drafts';
export const CampaignsDrafts = (transaction: Knex<CampaignDraftDBO> = db) =>
  transaction(campaignsDraftsTable);

async function save(campaign: CampaignApi, draft: DraftApi): Promise<void> {
  await withinTransaction(async (transaction) => {
    await CampaignsDrafts(transaction)
      .insert({
        campaign_id: campaign.id,
        draft_id: draft.id
      })
      .onConflict(['campaign_id', 'draft_id'])
      .ignore();
  });
}

export interface CampaignDraftDBO {
  campaign_id: string;
  draft_id: string;
}

export default {
  save,
};
