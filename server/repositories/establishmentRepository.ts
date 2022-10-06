import db from './db';
import { localitiesTable } from './localityRepository';
import { EstablishmentApi, EstablishmentDataApi, LocalityApi } from '../models/EstablishmentApi';
import { housingTable } from './housingRepository';
import { usersTable } from './userRepository';
import { eventsTable } from './eventRepository';
import { campaignsTable } from './campaignRepository';
import { MonitoringFiltersApi } from '../models/MonitoringFiltersApi';
import { differenceInDays } from 'date-fns';

export const establishmentsTable = 'establishments';

const get = async (establishmentId: string): Promise<EstablishmentApi> => {
    try {
        return db
            .select(`${establishmentsTable}.*`,
                db.raw('json_agg(json_build_object(\'geo_code\', l.geo_code, \'name\', l.name) order by l.name) as localities')
            )
            .from(establishmentsTable)
            .joinRaw(`join ${localitiesTable} as l on (l.geo_code = any(${establishmentsTable}.localities_geo_code))`)
            .where(`${establishmentsTable}.id`, establishmentId)
            .groupBy(`${establishmentsTable}.id`)
            .first()
            .then(result => {
                if (result) {
                    return <EstablishmentApi>{
                        id: result.id,
                        name: result.name,
                        siren: result.siren,
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

const listDataWithFilters = async (filters: MonitoringFiltersApi): Promise<EstablishmentDataApi[]> => {
    try {
        return db(establishmentsTable)
            .select(
                `${establishmentsTable}.*`,
                db.raw(`count(distinct(${housingTable}.id)) as "housing_count"`),
                db.raw(`min(${usersTable}.activated_at) as "first_activated_at"`),
                db.raw(`max(${usersTable}.last_authenticated_at) as "last_authenticated_at"`),
                db.raw(`count(distinct(${eventsTable}.housing_id)) as "last_month_updates_count"`),
                db.raw(`count(distinct(${campaignsTable}.id)) as "campaigns_count"`),
                db.raw(`count(distinct(${housingTable}.id)) filter (where ${campaignsTable}.sending_date is not null and ${housingTable}.status is not null) as "contacted_housing_count"`),
                db.raw(`min(${campaignsTable}.sending_date) as "first_campaign_sending_date"`),
                db.raw(`max(${campaignsTable}.sending_date) as "last_campaign_sending_date"`),
                db.raw(`(select avg(diff.avg) from (
                    select (age(sending_date, lag(sending_date) over (order by sending_date))) as "avg" from campaigns where establishment_id = ${establishmentsTable}.id and campaign_number <> 0) as diff
                ) as "delay_between_campaigns"`),
                db.raw(`(select avg(count.count) from (
                    select count(*) from campaigns c, campaigns_housing ch where c.sending_date is not null and ch.campaign_id = c.id and c.establishment_id = ${establishmentsTable}.id group by ch.campaign_id) as count
                )as "contacted_housing_per_campaign"`)
            )
            .joinRaw(`join ${housingTable} on insee_code  = any (${establishmentsTable}.localities_geo_code)`)
            .modify((queryBuilder: any) => {
                if (filters.dataYears?.length) {
                    queryBuilder.where(db.raw('data_years && ?::integer[]', [filters.dataYears]))
                }
            })
            .joinRaw(`left join ${campaignsTable} on ${campaignsTable}.establishment_id = ${establishmentsTable}.id and ${campaignsTable}.campaign_number > 0` )
            .leftJoin(usersTable, `${usersTable}.establishment_id`, `${establishmentsTable}.id`)
            .joinRaw(`left join ${eventsTable} on ${eventsTable}.housing_id = ${housingTable}.id and ${eventsTable}.created_by = ${usersTable}.id and ${eventsTable}.created_at > current_timestamp - interval '30D'`)
            .where('available', true)
            .groupBy(`${establishmentsTable}.id`)
            .orderBy(`${establishmentsTable}.name`)
            .modify((queryBuilder: any) => {
                if (filters.establishmentIds?.length) {
                    queryBuilder.whereIn(`${establishmentsTable}.id`, filters.establishmentIds)
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
                    contactedHousingPerCampaign: result.contacted_housing_per_campaign ? Math.floor(result.contacted_housing_per_campaign) : undefined,
                    firstCampaignSendingDate: result.first_campaign_sending_date,
                    lastCampaignSendingDate: result.last_campaign_sending_date,
                    delayBetweenCampaigns: result.delay_between_campaigns,
                    firstCampaignSentDelay: (result.first_campaign_sending_date && result.first_activated_at) ? differenceInDays(result.first_campaign_sending_date, result.first_activated_at) : undefined
                }
            )))
    } catch (err) {
        console.error('Listing establishment data failed', err);
        throw new Error('Listing establishment data failed');
    }
}

const formatLocalityApi = (localityApi: LocalityApi) => ({
    id: localityApi.id,
    geo_code: localityApi.geoCode,
    name: localityApi.name
})

const formatEstablishmentApi = (establishmentApi: EstablishmentApi) => ({
    id: establishmentApi.id,
    name: establishmentApi.name,
    siren: establishmentApi.siren,
    localities_id: establishmentApi.localities.map(_ => _.id),
    localities_geo_code: establishmentApi.localities.map(_ => _.geoCode)
})

export default {
    get,
    listAvailable,
    listDataWithFilters,
    formatLocalityApi,
    formatEstablishmentApi
}
