import { differenceInDays } from 'date-fns';
import highland from 'highland';
import { Knex } from 'knex';

import db, { likeUnaccent } from './db';
import {
  EstablishmentApi,
  EstablishmentDataApi,
} from '../models/EstablishmentApi';
import { housingTable, ReferenceDataYear } from './housingRepository';
import { usersTable } from './userRepository';
import { eventsTable, housingEventsTable } from './eventRepository';
import { campaignsTable } from './campaignRepository';
import { MonitoringFiltersApi } from '../models/MonitoringFiltersApi';
import { HousingStatusApi } from '../models/HousingStatusApi';
import { EstablishmentFilterApi } from '../models/EstablishmentFilterApi';

export const establishmentsTable = 'establishments';

type FindOptions = Partial<EstablishmentFilterApi>;

const find = async (opts?: FindOptions): Promise<EstablishmentApi[]> => {
  const establishments: EstablishmentDbo[] = await db<EstablishmentDbo>(
    establishmentsTable
  )
    .modify(filter(opts))
    .orderBy('name');

  return establishments.map(parseEstablishmentApi);
};

function filter(filters?: EstablishmentFilterApi) {
  return (builder: Knex.QueryBuilder<EstablishmentDbo>) => {
    if (filters?.available) {
      builder.where('available', true);
    }
    if (filters?.query?.length) {
      builder.whereRaw(likeUnaccent('name', filters.query));
    }
    if (filters?.geoCodes) {
      builder.whereRaw('? && localities_geo_code', [filters.geoCodes]);
    }
    if (filters?.kind) {
      builder.where('kind', filters.kind);
    }
    if (filters?.name) {
      builder.whereRaw(
        `lower(unaccent(regexp_replace(regexp_replace(name, '''| [(].*[)]', '', 'g'), ' | - ', '-', 'g'))) like '%' || ?`,
        filters?.name
      );
    }
    if (filters?.sirens) {
      builder.whereIn('siren', filters.sirens);
    }
  };
}

const get = async (
  establishmentId: string
): Promise<EstablishmentApi | null> => {
  console.log('Get establishments by id', establishmentId);

  const result = await db(establishmentsTable)
    .where(`${establishmentsTable}.id`, establishmentId)
    .first();

  return result ? parseEstablishmentApi(result) : null;
};

interface FindOneOptions {
  siren?: number;
}

const findOne = async (
  options: FindOneOptions
): Promise<EstablishmentApi | null> => {
  console.log('Find establishment by', options);

  const result = await db(establishmentsTable)
    .from(establishmentsTable)
    .where(`${establishmentsTable}.siren`, options.siren)
    .first();

  return result ? parseEstablishmentApi(result) : null;
};

const update = async (establishmentApi: EstablishmentApi): Promise<void> => {
  await db<EstablishmentDbo>(establishmentsTable)
    .where('id', establishmentApi.id)
    .update(formatEstablishmentApi(establishmentApi));
};

interface StreamOptions {
  updatedAfter?: Date;
}

const stream = (options?: StreamOptions) => {
  const stream = db(establishmentsTable)
    .orderBy('name')
    .modify((query) => {
      if (options?.updatedAfter) {
        query.andWhere('updated_at', '>', options.updatedAfter);
      }
    })
    .stream();
  return highland<EstablishmentDbo>(stream).map(parseEstablishmentApi);
};

const listDataWithFilters = async (
  filters: MonitoringFiltersApi
): Promise<EstablishmentDataApi[]> => {
  try {
    return db(establishmentsTable)
      .select(
        `${establishmentsTable}.*`,
        db.raw(`count(distinct(${housingTable}.id)) as "housing_count"`),
        db.raw(`min(${usersTable}.activated_at) as "first_activated_at"`),
        db.raw(
          `max(${usersTable}.last_authenticated_at) as "last_authenticated_at"`
        ),
        db.raw(
          `count(distinct(${housingEventsTable}.housing_id)) as "last_month_updates_count"`
        ),
        db.raw(`count(distinct(${campaignsTable}.id)) as "campaigns_count"`),
        db.raw(
          `count(distinct(${housingTable}.id)) filter (where ${campaignsTable}.sending_date is not null and coalesce(${housingTable}.status, 0) <> ${HousingStatusApi.NeverContacted}) as "contacted_housing_count"`
        ),
        db.raw(
          `min(${campaignsTable}.sending_date) as "first_campaign_sending_date"`
        ),
        db.raw(
          `max(${campaignsTable}.sending_date) as "last_campaign_sending_date"`
        ),
        db.raw(`(select avg(diff.avg) from (
                    select (age(sending_date, lag(sending_date) over (order by sending_date))) as "avg" from campaigns where establishment_id = ${establishmentsTable}.id and campaign_number <> 0) as diff
                ) as "delay_between_campaigns"`),
        db.raw(`(select avg(count.count) from (
                    select count(*) from campaigns c, campaigns_housing ch where c.sending_date is not null and ch.campaign_id = c.id and c.establishment_id = ${establishmentsTable}.id group by ch.campaign_id) as count
                )as "contacted_housing_per_campaign"`)
      )
      .joinRaw(
        `join ${housingTable} on geo_code  = any (${establishmentsTable}.localities_geo_code)`
      )
      .modify((queryBuilder: any) => {
        queryBuilder.andWhereRaw(
          'vacancy_start_year <= ?',
          ReferenceDataYear - 2
        );
        if (filters.dataYears?.length) {
          queryBuilder.where(
            db.raw('data_years && ?::integer[]', [filters.dataYears])
          );
        }
      })
      .joinRaw(
        `left join ${campaignsTable} on ${campaignsTable}.establishment_id = ${establishmentsTable}.id and ${campaignsTable}.campaign_number > 0`
      )
      .leftJoin(
        usersTable,
        `${usersTable}.establishment_id`,
        `${establishmentsTable}.id`
      )
      .leftJoin(
        housingEventsTable,
        `${housingEventsTable}.housing_id`,
        `${housingTable}.id`
      )
      .joinRaw(
        `left join ${eventsTable} on ${eventsTable}.id = ${housingEventsTable}.event_id and ${eventsTable}.created_by = ${usersTable}.id and ${eventsTable}.created_at > current_timestamp - interval '30D'`
      )
      .where('available', true)
      .groupBy(`${establishmentsTable}.id`)
      .orderBy(`${establishmentsTable}.name`)
      .modify((queryBuilder: any) => {
        if (filters.establishmentIds?.length) {
          queryBuilder.whereIn(
            `${establishmentsTable}.id`,
            filters.establishmentIds
          );
        }
      })
      .then((_) =>
        _.map(
          (result: any) =>
            <EstablishmentDataApi>{
              id: result.id,
              name: result.name,
              housingCount: result.housing_count,
              firstActivatedAt: result.first_activated_at,
              lastAuthenticatedAt: result.last_authenticated_at,
              lastMonthUpdatesCount: result.last_month_updates_count,
              campaignsCount: result.campaigns_count,
              contactedHousingCount: result.contacted_housing_count,
              contactedHousingPerCampaign: result.contacted_housing_per_campaign
                ? Math.floor(result.contacted_housing_per_campaign)
                : undefined,
              firstCampaignSendingDate: result.first_campaign_sending_date,
              lastCampaignSendingDate: result.last_campaign_sending_date,
              delayBetweenCampaigns: result.delay_between_campaigns,
              firstCampaignSentDelay:
                result.first_campaign_sending_date && result.first_activated_at
                  ? differenceInDays(
                      result.first_campaign_sending_date,
                      result.first_activated_at
                    )
                  : undefined,
            }
        )
      );
  } catch (err) {
    console.error('Listing establishment data failed', err);
    throw new Error('Listing establishment data failed');
  }
};

interface EstablishmentDbo {
  id: string;
  name: string;
  siren: number;
  available: boolean;
  localities_geo_code: string[];
  campaign_intent?: string;
  priority?: string;
  kind: string;
  updated_at: Date;
}

const formatEstablishmentApi = (
  establishmentApi: EstablishmentApi
): EstablishmentDbo => ({
  id: establishmentApi.id,
  name: establishmentApi.name,
  siren: establishmentApi.siren,
  available: establishmentApi.available,
  localities_geo_code: establishmentApi.geoCodes,
  campaign_intent: establishmentApi.campaignIntent,
  priority: establishmentApi.priority,
  kind: establishmentApi.kind,
  updated_at: new Date(),
});

const parseEstablishmentApi = (
  establishmentDbo: EstablishmentDbo
): EstablishmentApi =>
  <EstablishmentApi>{
    id: establishmentDbo.id,
    name: establishmentDbo.name,
    shortName:
      establishmentDbo.kind === 'Commune'
        ? establishmentDbo.name.replaceAll(/^Commune d(e\s|')/g, '')
        : establishmentDbo.name,
    siren: establishmentDbo.siren,
    available: establishmentDbo.available,
    geoCodes: establishmentDbo.localities_geo_code,
    campaignIntent: establishmentDbo.campaign_intent,
    priority: establishmentDbo.priority ?? 'standard',
    kind: establishmentDbo.kind,
  };

export default {
  find,
  get,
  findOne,
  update,
  stream,
  listDataWithFilters,
  formatEstablishmentApi,
};
