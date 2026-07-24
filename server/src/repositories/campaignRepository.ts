import { CampaignStatus, HousingFiltersDTO } from '@zerologementvacant/models';
import type { Insertable, Selectable } from 'kysely';
import { sql } from 'kysely';

import db from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import { logger } from '~/infra/logger';
import { CampaignApi, CampaignSortApi } from '~/models/CampaignApi';
import { CampaignFiltersApi } from '~/models/CampaignFiltersApi';
import eventRepository from '~/repositories/eventRepository';
import { fromUserDBO, UserDBO } from '~/repositories/userRepository';

export const campaignsTable = 'campaigns';
export const Campaigns = (transaction = db) =>
  transaction<CampaignDBO>(campaignsTable);

interface FindOneOptions {
  id: string;
  establishmentId: string;
  geoCodes?: string[];
}

const findOne = async (opts: FindOneOptions): Promise<CampaignApi | null> => {
  logger.debug('Finding campaign...', opts);
  const row = await campaignListQuery(opts)
    .where('campaigns.id', '=', opts.id)
    .executeTakeFirst();
  if (!row) {
    return null;
  }

  logger.debug('Found campaign', row);
  return parseCampaignRow(row);
};

interface FindOptions {
  filters: CampaignFiltersApi;
  sort?: CampaignSortApi;
}

const find = async (opts: FindOptions): Promise<CampaignApi[]> => {
  const rows = await applyCampaignSort(
    campaignListQuery(opts.filters),
    opts.sort
  )
    .orderBy('campaigns.createdAt')
    .execute();

  return rows.map(parseCampaignRow);
};

function campaignListQuery(filters: CampaignFiltersApi) {
  let query = kysely
    .selectFrom('campaigns')
    .innerJoin('users', 'users.id', 'campaigns.userId')
    .selectAll('campaigns')
    .select(sql<UserDBO>`to_json(users.*)`.as('creator'));

  if (filters?.establishmentId) {
    query = query.where(
      'campaigns.establishmentId',
      '=',
      filters.establishmentId
    );
  }
  if (filters.groupIds?.length) {
    query = query.where('campaigns.groupId', 'in', filters.groupIds);
  }
  // Filter campaigns to only those where ALL housings are within the user's
  // perimeter. Empty geoCodes means no access → return no campaigns.
  if (filters?.geoCodes !== undefined) {
    if (filters.geoCodes.length === 0) {
      query = query.where(sql<boolean>`1 = 0`);
    } else {
      const geoCodes = filters.geoCodes;
      query = query.where((eb) =>
        eb.not(
          eb.exists(
            eb
              .selectFrom('campaignsHousing')
              .select(sql`1`.as('one'))
              .whereRef('campaignsHousing.campaignId', '=', 'campaigns.id')
              .where('campaignsHousing.housingGeoCode', 'not in', geoCodes)
          )
        )
      );
    }
  }
  return query;
}

function applyCampaignSort(
  query: ReturnType<typeof campaignListQuery>,
  sort?: CampaignSortApi
): ReturnType<typeof campaignListQuery> {
  if (!sort) {
    return query.orderBy('campaigns.createdAt', 'desc');
  }
  let result = query;
  for (const key of Object.keys(sort) as Array<keyof CampaignSortApi>) {
    switch (key) {
      case 'title':
        result = result.orderBy('campaigns.title', sort.title);
        break;
      case 'createdAt':
        result = result.orderBy('campaigns.createdAt', sort.createdAt);
        break;
      case 'sentAt':
        result = result.orderBy('campaigns.sentAt', sort.sentAt);
        break;
      case 'status':
        result = result.orderBy(
          sql`(case campaigns.status when 'archived' then 3 when 'in-progress' then 2 when 'sending' then 1 else 0 end)`,
          sort.status
        );
        break;
      case 'housingCount':
        result = result.orderBy('campaigns.housingCount', sort.housingCount);
        break;
      case 'ownerCount':
        result = result.orderBy('campaigns.ownerCount', sort.ownerCount);
        break;
      case 'returnCount':
        result = result.orderBy('campaigns.returnCount', sort.returnCount);
        break;
      case 'returnRate':
        result = result.orderBy(
          sql`campaigns.return_rate ${sql.raw(sort.returnRate ?? 'asc')} nulls last`
        );
        break;
    }
  }
  return result;
}

async function save(campaign: CampaignApi): Promise<void> {
  logger.debug('Saving campaign', campaign);
  await withinKyselyTransaction(async (trx) => {
    await trx
      .insertInto('campaigns')
      .values(toCampaignInsert(campaign))
      .onConflict((oc) =>
        oc.column('id').doUpdateSet((eb) => ({
          status: eb.ref('excluded.status'),
          title: eb.ref('excluded.title'),
          description: eb.ref('excluded.description'),
          file: eb.ref('excluded.file'),
          sentAt: eb.ref('excluded.sentAt')
        }))
      )
      .execute();
  });
  logger.debug('Campaign saved', campaign);
}

function toCampaignInsert(campaign: CampaignApi): Insertable<DB['campaigns']> {
  return {
    id: campaign.id,
    establishmentId: campaign.establishmentId,
    status: campaign.status,
    filters: campaign.filters as Insertable<DB['campaigns']>['filters'],
    file: campaign.file,
    title: campaign.title,
    description: campaign.description,
    userId: campaign.userId,
    createdAt: new Date(campaign.createdAt),
    validatedAt: campaign.validatedAt
      ? new Date(campaign.validatedAt)
      : undefined,
    exportedAt: campaign.exportedAt ? new Date(campaign.exportedAt) : undefined,
    sentAt: campaign.sentAt
      ? new Date(campaign.sentAt.slice(0, 'yyyy-mm-dd'.length))
      : undefined,
    archivedAt: campaign.archivedAt ? new Date(campaign.archivedAt) : undefined,
    confirmedAt: campaign.confirmedAt
      ? new Date(campaign.confirmedAt)
      : undefined,
    groupId: campaign.groupId,
    returnCount: campaign.returnCount ?? 0
  };
}

async function remove(id: string): Promise<void> {
  logger.debug('Removing campaign...', { id });
  await withinKyselyTransaction(async (trx) => {
    await eventRepository.removeCampaignEvents(id);
    await trx.deleteFrom('campaigns').where('id', '=', id).execute();
  });
  logger.debug('Campaign removed', { id });
}

export interface CampaignDBO {
  id: string;
  title: string;
  description: string;
  /**
   * @deprecated
   */
  status: CampaignStatus;
  /**
   * @deprecated
   */
  filters: HousingFiltersDTO;
  /**
   * @deprecated
   */
  file?: string;

  user_id: string;
  creator?: UserDBO;

  created_at: Date;
  /**
   * @deprecated
   */
  validated_at?: Date;
  /**
   * @deprecated
   */
  exported_at?: Date;
  sent_at?: Date;
  /**
   * @deprecated
   */
  archived_at?: Date;
  /**
   * @deprecated
   */
  confirmed_at?: Date;

  establishment_id: string;
  group_id?: string;

  housing_count: number;
  owner_count: number;
  return_count: number;
  return_rate: number | null;
}

type CampaignRow = Selectable<DB['campaigns']> & { creator: UserDBO | null };

function parseCampaignRow(row: CampaignRow): CampaignApi {
  return {
    id: row.id,
    establishmentId: row.establishmentId,
    status: row.status as CampaignStatus,
    filters: row.filters as CampaignApi['filters'],
    file: row.file as CampaignApi['file'],
    userId: row.userId,
    createdBy: fromUserDBO(row.creator!),
    createdAt: (row.createdAt as Date).toJSON(),
    validatedAt: row.validatedAt?.toJSON(),
    exportedAt: row.exportedAt?.toJSON(),
    sentAt: row.sentAt?.toJSON()?.slice(0, 'yyyy-mm-dd'.length) ?? null,
    archivedAt: row.archivedAt?.toJSON(),
    confirmedAt: row.confirmedAt?.toJSON(),
    title: row.title,
    description: row.description as CampaignApi['description'],
    groupId: row.groupId as CampaignApi['groupId'],
    returnCount: row.sentAt ? row.returnCount : null,
    housingCount: row.housingCount,
    ownerCount: row.ownerCount,
    returnRate: row.sentAt ? row.returnRate : null
  };
}

export const formatCampaignApi = (
  campaign: CampaignApi
): Omit<
  CampaignDBO,
  'housing_count' | 'owner_count' | 'return_rate' | 'creator'
> => ({
  id: campaign.id,
  establishment_id: campaign.establishmentId,
  status: campaign.status,
  filters: campaign.filters,
  file: campaign.file,
  title: campaign.title,
  description: campaign.description,
  user_id: campaign.userId,
  created_at: new Date(campaign.createdAt),
  validated_at: campaign.validatedAt
    ? new Date(campaign.validatedAt)
    : undefined,
  exported_at: campaign.exportedAt ? new Date(campaign.exportedAt) : undefined,
  sent_at: campaign.sentAt
    ? new Date(campaign.sentAt?.slice(0, 'yyyy-mm-dd'.length))
    : undefined,
  archived_at: campaign.archivedAt ? new Date(campaign.archivedAt) : undefined,
  confirmed_at: campaign.confirmedAt
    ? new Date(campaign.confirmedAt)
    : undefined,
  group_id: campaign.groupId,
  return_count: campaign.returnCount ?? 0
});

export default {
  findOne,
  find,
  save,
  remove,
  formatCampaignApi
};
