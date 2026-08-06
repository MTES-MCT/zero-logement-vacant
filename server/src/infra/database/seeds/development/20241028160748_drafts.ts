import async from 'async';
import { Knex } from 'knex';

import {
  CampaignDraftDBO,
  campaignsDraftsTable
} from '~/repositories/campaignDraftRepository';
import { CampaignDBO, campaignsTable } from '~/repositories/campaignRepository';
import {
  DraftDBO,
  DraftRecordDBO,
  draftsTable,
  formatDraftApi
} from '~/repositories/draftRepository';
import {
  EstablishmentDBO,
  establishmentsTable
} from '~/repositories/establishmentRepository';
import {
  formatSenderApi,
  SenderDBO,
  sendersTable
} from '~/repositories/senderRepository';
import { genDraftApi, genSenderApi } from '~/test/testFixtures';

export async function seed(knex: Knex): Promise<void> {
  console.time('20241028160748_drafts');
  await knex.raw(`TRUNCATE TABLE ${draftsTable} CASCADE`);

  const establishments = await knex<EstablishmentDBO>(
    establishmentsTable
  ).where({ available: true });
  await async.forEachSeries(establishments, async (establishment) => {
    const campaigns = await knex<CampaignDBO>(campaignsTable).where({
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

  await knex<DraftDBO>(draftsTable);
  console.timeEnd('20241028160748_drafts');
  console.log('\n');
}
