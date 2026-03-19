import async from 'async';
import { Knex } from 'knex';

import {
  DraftDBO,
  DraftRecordDBO,
  Drafts,
  draftsTable,
  formatDraftApi
} from '~/repositories/draftRepository';
import { Establishments } from '~/repositories/establishmentRepository';
import { Campaigns } from '~/repositories/campaignRepository';
import { genDraftApi, genSenderApi } from '~/test/testFixtures';
import {
  CampaignDraftDBO,
  campaignsDraftsTable
} from '~/repositories/campaignDraftRepository';
import {
  formatSenderApi,
  SenderDBO,
  sendersTable
} from '~/repositories/senderRepository';

export async function seed(knex: Knex): Promise<void> {
  console.time('20241028160748_drafts');
  await knex.raw(`TRUNCATE TABLE ${draftsTable} CASCADE`);

  const establishments = await Establishments(knex).where({ available: true });
  await async.forEach(establishments, async (establishment) => {
    const campaigns = await Campaigns(knex).where({
      establishment_id: establishment.id
    });

    const entities = campaigns.map((campaign) => {
      const sender = genSenderApi(establishment);
      const draft = genDraftApi(establishment, sender);
      return { campaign, draft };
    });

    const senders: SenderDBO[] = entities
      .map((entity) => entity.draft.sender)
      .map(formatSenderApi);
    await knex.batchInsert<SenderDBO>(sendersTable, senders);
    const drafts: DraftRecordDBO[] = entities
      .map((entity) => entity.draft)
      .map(formatDraftApi);
    console.log(
      `Inserting ${drafts.length} drafts into ${establishment.name}...`
    );
    await knex.batchInsert<DraftDBO>(draftsTable, drafts);

    const campaignDrafts = entities.map<CampaignDraftDBO>((entity) => ({
      campaign_id: entity.campaign.id,
      draft_id: entity.draft.id
    }));
    console.log(`Linking ${campaignDrafts.length} drafts to campaigns...`);
    await knex.batchInsert<CampaignDraftDBO>(
      campaignsDraftsTable,
      campaignDrafts
    );
  });

  await Drafts(knex);
  console.timeEnd('20241028160748_drafts');
  console.log('\n')
}
