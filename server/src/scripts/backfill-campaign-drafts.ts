/**
 * Backfill: create one empty draft for every campaign that has none,
 * then link them via the campaigns_drafts junction table.
 *
 * Usage:
 *   DATABASE_URL=<url> npx tsx server/scripts/backfill-campaign-drafts.ts
 *
 * Or from the server workspace:
 *   DATABASE_URL=<url> yarn tsx src/scripts/backfill-campaign-drafts.ts
 */
import knex from 'knex';
import { v4 as uuidv4 } from 'uuid';
import type { DraftApi } from '~/models/DraftApi';
import type { SenderApi } from '~/models/SenderApi';
import {
  CampaignsDrafts,
  campaignsDraftsTable,
  type CampaignDraftDBO
} from '~/repositories/campaignDraftRepository';
import {
  Campaigns,
  campaignsTable,
  type CampaignDBO
} from '~/repositories/campaignRepository';
import { Drafts, formatDraftApi } from '~/repositories/draftRepository';
import { formatSenderApi, Senders } from '~/repositories/senderRepository';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

const db = knex({
  client: 'pg',
  connection: DATABASE_URL
});

async function main() {
  // 1. Find campaigns without a draft
  const campaignsWithoutDraft: CampaignDBO[] = await Campaigns().whereNotExists(
    (query) => {
      return query
        .select(db.raw('1'))
        .from(campaignsDraftsTable)
        .where(
          `${campaignsDraftsTable}.campaign_id`,
          db.ref(`${campaignsTable}.id`)
        );
    }
  );

  console.log(
    `Found ${campaignsWithoutDraft.length} campaigns without a draft`
  );

  if (campaignsWithoutDraft.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  // 2. Create one empty draft per campaign and link it
  const data = campaignsWithoutDraft.map((campaign) => {
    const sender: SenderApi = {
      id: uuidv4(),
      name: null,
      service: null,
      firstName: null,
      lastName: null,
      address: null,
      email: null,
      phone: null,
      signatories: [null, null],
      establishmentId: campaign.establishment_id,
      createdAt: new Date().toJSON(),
      updatedAt: new Date().toJSON()
    };
    const draft: DraftApi = {
      id: uuidv4(),
      body: null,
      subject: null,
      writtenAt: null,
      writtenFrom: null,
      logo: null,
      logoNext: [null, null],
      sender,
      senderId: sender.id,
      establishmentId: campaign.establishment_id,
      createdAt: new Date().toJSON(),
      updatedAt: new Date().toJSON()
    };

    return { campaign, sender, draft };
  });

  await db.transaction(async (transaction) => {
    const senders = data.map(({ sender }) => sender).map(formatSenderApi);
    const drafts = data.map(({ draft }) => draft).map(formatDraftApi);
    const campaignDrafts = data.map<CampaignDraftDBO>(
      ({ campaign, draft }) => ({
        campaign_id: campaign.id,
        draft_id: draft.id
      })
    );

    await Senders(transaction).insert(senders);
    await Drafts(transaction).insert(drafts);
    await CampaignsDrafts(transaction).insert(campaignDrafts);
  });

  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.destroy());
