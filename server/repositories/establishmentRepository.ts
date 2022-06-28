import db from './db';
import { localitiesTable } from './localityRepository';
import { EstablishmentApi, EstablishmentDataApi } from '../models/EstablishmentApi';
import { housingTable } from './housingRepository';
import { usersTable } from './userRepository';
import { eventsTable } from './eventRepository';
import { campaignsTable } from './campaignRepository';

export const establishmentsTable = 'establishments';
export const housingScopeGeometryTable = 'housing_scopes_geom';

const get = async (establishmentId: string): Promise<EstablishmentApi> => {
    try {
        return db
            .select(`${establishmentsTable}.*`,
                db.raw('json_agg(json_build_object(\'geo_code\', l.geo_code, \'name\', l.name) order by l.name) as localities')
            )
            .from(establishmentsTable)
            .joinRaw(`join ${localitiesTable} as l on (l.id = any(${establishmentsTable}.localities_id))`)
            .where(`${establishmentsTable}.id`, establishmentId)
            .groupBy(`${establishmentsTable}.id`)
            .first()
            .then(result => {
                if (result) {
                    return <EstablishmentApi>{
                        id: result.id,
                        name: result.name,
                        siren: result.siren,
                        housingScopes: {
                            geom: false,
                            scopes: result.housing_scopes
                        },
                        localities: result.localities
                            .map((l: { geo_code: any; name: any; }) => ({
                                geoCode: l.geo_code,
                                name: l.name
                            }))
                    }
                } else {
                    console.error('Establishment not found', establishmentId);
                    throw Error('Establishment not found')
                }
            })
    } catch (err) {
        console.error('Getting establishment failed', err, establishmentId);
        throw new Error('Getting establishment by email failed');
    }
}

const listAvailable = async (): Promise<EstablishmentApi[]> => {
    try {
        return db(establishmentsTable)
            .where('available', true)
            .orderBy('name')
            .then(_ => _.map(result => (
                    <EstablishmentApi> {
                    id: result.id,
                    name: result.name
                }
            )))
    } catch (err) {
        console.error('Listing available establishment failed', err);
        throw new Error('Listing available establishment failed');
    }
}

const listData = async (establishmentId?: string): Promise<EstablishmentDataApi[]> => {
    try {
        return db(establishmentsTable)
            .select(
                `${establishmentsTable}.*`,
                db.raw(`count(distinct(${housingTable}.id)) as "housing_count"`),
                db.raw(`min(${usersTable}.activated_at) as "first_activated_at"`),
                db.raw(`max(${usersTable}.activated_at) as "last_authenticated_at"`),
                db.raw(`count(distinct(${eventsTable}.housing_id)) as "last_month_updates_count"`),
                db.raw(`count(distinct(${campaignsTable}.id)) as "campaigns_count"`),
                db.raw(`count(distinct(${housingTable}.id)) filter (where ${housingTable}.status is not null) as "contacted_housing_count"`),
                db.raw(`min(${campaignsTable}.sent_at) as "first_campaign_sent_at"`),
                db.raw(`max(${campaignsTable}.sent_at) as "last_campaign_sent_at"`),
                db.raw(`(select avg(diff.avg) from (
                    select (sent_at - lag(sent_at) over (order by sent_at)) as "avg" from campaigns where establishment_id = ${establishmentsTable}.id) as diff
                ) as "delay_between_campaigns"`),
                db.raw(`(select avg(count.count) from (
                    select count(*) from campaigns c, campaigns_housing ch where ch.campaign_id = c.id and c.establishment_id = ${establishmentsTable}.id group by ch.campaign_id) as count
                )as "contacted_housing_per_campaign"`)
            )
            .joinRaw(`join ${localitiesTable} on ${localitiesTable}.id = any(${establishmentsTable}.localities_id)` )
            .join(housingTable, `${housingTable}.insee_code`, `${localitiesTable}.geo_code`)
            .leftJoin(campaignsTable, `${campaignsTable}.establishment_id`, `${establishmentsTable}.id`)
            .leftJoin(usersTable, `${usersTable}.establishment_id`, `${establishmentsTable}.id`)
            .joinRaw(`left join ${eventsTable} on ${eventsTable}.housing_id = ${housingTable}.id and ${eventsTable}.created_by = ${usersTable}.id and ${eventsTable}.created_at > current_timestamp - interval '30D'`)
            .where('available', true)
            .andWhereRaw('data_years && ?::integer[] ', [[2022]])
            .groupBy(`${establishmentsTable}.id`)
            .orderBy(`${establishmentsTable}.name`)
            .modify((queryBuilder: any) => {
                if (establishmentId) {
                    queryBuilder.andWhere(`${establishmentsTable}.id`, establishmentId)
                }
            })
            .then(_ => _.map((result: any) => (
                <EstablishmentDataApi> {
                    id: result.id,
                    name: result.name,
                    housingCount: result.housing_count,
                    firstActivatedAt: result.first_activated_at,
                    lastAuthenticatedAt: result.last_authenticated_at,
                    lastMonthUpdatesCount: result.last_month_updates_count,
                    campaignsCount: result.campaigns_count,
                    contactedHousingCount: result.contacted_housing_count,
                    contactedHousingPerCampaign: result.contacted_housing_per_campaign,
                    firstCampaignSentAt: result.first_campaign_sent_at,
                    lastCampaignSentAt: result.last_campaign_sent_at,
                    delayBetweenCampaigns: result.delay_between_campaigns
                }
            )))
    } catch (err) {
        console.error('Listing establishment data failed', err);
        throw new Error('Listing establishment data failed');
    }
}

export default {
    get,
    listAvailable,
    listData
}

