import fp from 'lodash/fp';
import { HousingRecordApi } from '../../server/models/HousingApi';
import {
  contramap,
  DEFAULT_ORDER,
  first,
  firstDefined,
  max,
  merge as mergeObjects,
  shortest,
} from '../../shared/';
import Stream = Highland.Stream;

export function merge() {
  return (stream: Stream<HousingRecordApi[]>): Stream<HousingRecordApi> => {
    return stream.map(
      fp.pipe(
        fp.orderBy<HousingRecordApi>(
          ['dataYears', 'mutationDate'],
          ['desc', 'desc']
        ),
        fp.reduce<HousingRecordApi, HousingRecordApi>((a, b) => {
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
            longitude: youngestOrFirstDefined<'longitude'>(youngest.longitude),
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
            energyConsumptionAt: youngestOrFirstDefined<'energyConsumptionAt'>(
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
        })
      )
    );
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
