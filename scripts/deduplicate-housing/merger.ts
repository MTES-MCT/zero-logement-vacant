import fp from 'lodash/fp';
import { HousingApi, HousingRecordApi } from '../../server/models/HousingApi';
import {
  contramap,
  DEFAULT_ORDER,
  first,
  firstDefined,
  max,
  merge as mergeObjects,
  shortest,
} from '../../shared/';
import { logger } from '../../server/utils/logger';
import highland from 'highland';
import {
  formatHousingRecordApi,
  Housing,
} from '../../server/repositories/housingRepository';
import db from '../../server/repositories/db';
import { CampaignsHousing } from '../../server/repositories/campaignHousingRepository';
import { Knex } from 'knex';
import Stream = Highland.Stream;
import { HousingNotes } from '../../server/repositories/noteRepository';

export function merge() {
  return (stream: Stream<HousingApi[]>): Stream<HousingRecordApi> => {
    return stream
      .flatMap((housingList) => {
        const merged = fp
          .orderBy<HousingRecordApi>(
            ['mutationDate', 'dataYears'],
            ['desc', 'desc'],
            housingList
          )
          .reduce((a, b) => {
            const youngest = youngestOf(a, b);
            return mergeObjects<HousingRecordApi>({
              id: first,
              invariant: first,
              localId: shortest,
              buildingId: youngestOrFirstDefined<'buildingId'>(
                youngest.buildingId
              ),
              buildingGroupId: youngestOrFirstDefined<'buildingGroupId'>(
                youngest.buildingGroupId
              ),
              rawAddress: first,
              geoCode: first,
              longitude: youngestOrFirstDefined<'longitude'>(
                youngest.longitude
              ),
              latitude: youngestOrFirstDefined<'latitude'>(youngest.latitude),
              cadastralClassification:
                youngestOrFirstDefined<'cadastralClassification'>(
                  youngest.cadastralClassification
                ),
              uncomfortable: first,
              vacancyStartYear: youngestOrFirstDefined<'vacancyStartYear'>(
                youngest.vacancyStartYear
              ),
              housingKind: () => youngest.housingKind,
              roomsCount: () => youngest.roomsCount,
              livingArea: () => youngest.livingArea,
              cadastralReference: youngestOrFirstDefined<'cadastralReference'>(
                youngest.cadastralReference
              ),
              buildingYear: youngestOrFirstDefined<'buildingYear'>(
                youngest.buildingYear
              ),
              taxed: youngestOrFirstDefined<'taxed'>(youngest.taxed),
              vacancyReasons: youngestOrFirstDefined<'vacancyReasons'>(
                youngest.vacancyReasons
              ),
              dataYears: fp.pipe(fp.union<number>, (dataYears) =>
                fp.orderBy<number>(['dataYears'], ['desc'])(dataYears)
              ),
              buildingLocation: youngestOrFirstDefined<'buildingLocation'>(
                youngest.buildingLocation
              ),
              ownershipKind: youngestOrFirstDefined<'ownershipKind'>(
                youngest.ownershipKind
              ),
              status: () => youngest.status,
              subStatus: () => youngest.subStatus,
              precisions: () => youngest.precisions,
              energyConsumption: youngestOrFirstDefined<'energyConsumption'>(
                youngest.energyConsumption
              ),
              energyConsumptionAt:
                youngestOrFirstDefined<'energyConsumptionAt'>(
                  youngest.energyConsumptionAt
                ),
              occupancy: () => youngest.occupancy,
              occupancyRegistered: () => youngest.occupancyRegistered,
              occupancyIntended: () => youngest.occupancyIntended,
              source: () => youngest.source,
              mutationDate: youngestOrFirstDefined<'mutationDate'>(
                youngest.mutationDate
              ),
            })(a, b);
          });

        return highland<HousingRecordApi>(cleanup(merged, housingList));
      })
      .tap((housing) => {
        logger.debug('Merged housing', { localId: housing.localId });
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
    await HousingNotes(transaction).modify(
      transfer({
        from: houses,
        to: merged,
        foreignKey: 'note_id',
        table: 'housing_notes',
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
  });
  return merged;
}

interface TransferOptions {
  from: HousingRecordApi[];
  to: HousingRecordApi;
  foreignKey: string;
  table: string;
}

function transfer({ from, to, foreignKey, table }: TransferOptions) {
  return (query: Knex.QueryBuilder): void => {
    query
      .update({
        housing_geo_code: to.geoCode,
        housing_id: to.id,
      })
      .whereIn([foreignKey, 'housing_geo_code', 'housing_id'], (query) => {
        query
          .select([foreignKey, 'housing_geo_code', 'housing_id'])
          .from(table)
          .whereIn(
            ['housing_geo_code', 'housing_id'],
            from.map((housing) => [housing.geoCode, housing.id])
          )
          .whereNotExists((query) => {
            query
              .select('*')
              .from({ subquery: table })
              .where({
                [foreignKey]: db.ref(`${table}.${foreignKey}`),
                housing_geo_code: to.geoCode,
                housing_id: to.id,
              });
          })
          .distinctOn(foreignKey);
      });
  };
}

const youngestOf = max<HousingRecordApi>(
  contramap((housing: HousingRecordApi) => Math.max(...housing.dataYears))(
    DEFAULT_ORDER
  )
);

function youngestOrFirstDefined<K extends keyof HousingRecordApi>(
  youngest: HousingRecordApi[K]
) {
  return (
    first: HousingRecordApi[K],
    second: HousingRecordApi[K]
  ): HousingRecordApi[K] => {
    return youngest ?? firstDefined(first, second);
  };
}

export default {
  merge,
};
