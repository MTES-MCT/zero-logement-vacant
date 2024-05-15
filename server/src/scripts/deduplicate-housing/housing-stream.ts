import Stream = Highland.Stream;
import { HousingApi } from '~/models/HousingApi';
import highland from 'highland';
import housingRepository, {
  Housing,
  HousingDBO,
  parseHousingApi,
} from '~/repositories/housingRepository';
import { prependAsync } from '../shared';

export function housingStream(): Stream<HousingApi> {
  const query = Housing()
    .whereLike('local_id', '%:%')
    .orderBy('local_id')
    .stream();

  return highland<HousingDBO>(query).map(parseHousingApi).map(validate);
}

export function parseLocalId(badLocalId: string): string {
  const [localId] = badLocalId.split(':');
  return localId;
}

type HousingByLocalId = Record<string, HousingApi[]>;

export function prependOriginalHousing(
  stream: Stream<HousingByLocalId>,
): Stream<HousingApi[]> {
  return stream
    .map((group) => Object.values(group))
    .sequence()
    .through(
      prependAsync(async (housingList) => {
        const { geoCode, localId } = housingList[0];
        const originalHousing = await housingRepository.findOne({
          geoCode,
          localId: parseLocalId(localId),
        });
        return originalHousing ? [originalHousing] : [];
      }),
    );
}

function validate(housing: HousingApi): HousingApi {
  return {
    ...housing,
    mutationDate:
      // Specific rule because of the given data
      !!housing.mutationDate && housing.mutationDate < new Date('3000-01-01')
        ? housing.mutationDate
        : null,
  };
}
