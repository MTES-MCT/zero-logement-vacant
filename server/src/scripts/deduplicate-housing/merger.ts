import fp from 'lodash/fp';
import { HousingApi, HousingRecordApi } from '~/models/HousingApi';
import {
  contramap,
  DEFAULT_ORDER,
  first,
  firstDefined,
  max,
  merge as mergeObjects
} from '@zerologementvacant/shared';
import { logger } from '~/infra/logger';
import highland from 'highland';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import db from '~/infra/database/';
import { CampaignsHousing } from '~/repositories/campaignHousingRepository';
import { Knex } from 'knex';
import { HousingNotes } from '~/repositories/noteRepository';
import {
  GroupHousingEvents,
  HousingEvents
} from '~/repositories/eventRepository';
import { GroupsHousing } from '~/repositories/groupRepository';
import Stream = Highland.Stream;

function merge() {
  return (stream: Stream<HousingApi[]>): Stream<HousingRecordApi> => {
    return stream
      .flatMap((housingList) => {
        const merged = fp
          .orderBy<HousingRecordApi>(
            ['dataYears', 'mutationDate'],
            ['desc', 'desc'],
            housingList
          )
          .reduce((a, b) => {
            const youngest = youngestOf(a, b);
            return mergeObjects<HousingRecordApi>({
              id: first,
              invariant: first,
              localId: first,
              buildingId: firstDefined,
              buildingGroupId: firstDefined,
              rawAddress: first,
              geoCode: first,
              longitude: firstDefined,
              latitude: firstDefined,
              cadastralClassification: firstDefined,
              uncomfortable: first,
              vacancyStartYear: firstDefined,
              housingKind: () => youngest.housingKind,
              roomsCount: () => youngest.roomsCount,
              livingArea: () => youngest.livingArea,
              cadastralReference: firstDefined,
              buildingYear: firstDefined,
              taxed: firstDefined,
              vacancyReasons: firstDefined,
              dataYears: fp.pipe(fp.union<number>, (dataYears) =>
                fp.orderBy<number>(fp.identity, 'desc', dataYears)
              ),
              buildingLocation: firstDefined,
              ownershipKind: firstDefined,
              status: () => youngest.status,
              subStatus: () => youngest.subStatus,
              precisions: () => youngest.precisions,
              energyConsumption: firstDefined,
              energyConsumptionAt: firstDefined,
              occupancy: () => youngest.occupancy,
              occupancyRegistered: () => youngest.occupancyRegistered,
              occupancyIntended: () => youngest.occupancyIntended,
              source: () => youngest.source,
              mutationDate: firstDefined,
            })(a, b);
          });

        return highland<HousingRecordApi>(cleanup(merged, housingList));
      })
      .tap((housing) => {
        logger.debug('Merged housing', { localId: housing.localId, });
      });
  };
}

export async function cleanup(
  merged: HousingRecordApi,
  housingList: HousingRecordApi[]
): Promise<HousingRecordApi> {
  const houses = housingList.filter((housing) => housing.id !== merged.id);

  await db.transaction(async (transaction) => {
    // Transfer campaigns to the merged housing
    await CampaignsHousing(transaction).modify(
      transfer({
        from: houses,
        to: merged,
        foreignKey: 'campaign_id',
        table: 'campaigns_housing',
      })
    );
    await HousingEvents(transaction).modify(
      transfer({
        from: houses,
        to: merged,
        foreignKey: 'event_id',
        table: 'housing_events',
      })
    );
    await HousingNotes(transaction).modify(
      transfer({
        from: houses,
        to: merged,
        foreignKey: 'note_id',
        table: 'housing_notes',
      })
    );
    await GroupsHousing(transaction).modify(
      transfer({
        from: houses,
        to: merged,
        foreignKey: 'group_id',
        table: 'groups_housing',
      })
    );
    await GroupHousingEvents(transaction).modify(
      transfer({
        from: houses,
        to: merged,
        foreignKey: ['event_id', 'group_id'],
        table: 'group_housing_events',
      })
    );

    await Housing(transaction)
      .insert(formatHousingRecordApi(merged))
      .onConflict(['geo_code', 'local_id'])
      .merge();

    // Remove duplicate houses
    await Housing(transaction)
      .whereIn(
        'id',
        houses.map((housing) => housing.id)
      )
      .delete();

    // Clean up local_id
    if (merged.localId.includes(':')) {
      await Housing(transaction)
        .where({
          geo_code: merged.geoCode,
          local_id: merged.localId,
        })
        .update({
          local_id: merged.localId.split(':')[0],
        });
    }
  });
  return merged;
}

interface TransferOptions {
  from: HousingRecordApi[];
  to: HousingRecordApi;
  foreignKey: string | string[];
  table: string;
}

function transfer({ from, to, foreignKey, table, }: TransferOptions) {
  return (query: Knex.QueryBuilder): void => {
    const foreignKeys = Array.isArray(foreignKey) ? foreignKey : [foreignKey];
    query
      .update({
        housing_geo_code: to.geoCode,
        housing_id: to.id,
      })
      .whereIn([...foreignKeys, 'housing_geo_code', 'housing_id'], (query) => {
        query
          .select([...foreignKeys, 'housing_geo_code', 'housing_id'])
          .from(table)
          .whereIn(
            ['housing_geo_code', 'housing_id'],
            from.map((housing) => [housing.geoCode, housing.id])
          )
          .whereNotExists((query) => {
            const refs = fp.fromPairs(
              foreignKeys.map((key) => [key, db.ref(`${table}.${key}`)])
            );
            query
              .select('*')
              .from({ subquery: table, })
              .where({
                ...refs,
                housing_geo_code: to.geoCode,
                housing_id: to.id,
              });
          })
          .distinctOn(...foreignKeys);
      });
  };
}

const youngestOf = max<HousingRecordApi>(
  contramap((housing: HousingRecordApi) => Math.max(...housing.dataYears))(
    DEFAULT_ORDER
  )
);

export default {
  merge,
};
