import Stream = Highland.Stream;
import { HousingApi } from '../../server/models/HousingApi';
import highland from 'highland';
import housingRepository, {
  Housing,
  HousingDBO,
  parseHousingApi,
} from '../../server/repositories/housingRepository';
import { prependAsync } from '../shared';

export function housingStream(): Stream<HousingApi> {
  const query = Housing()
    .whereLike('local_id', '%:%')
    .orderBy('local_id')
    .stream();

  return highland<HousingDBO>(query).map(parseHousingApi);
}

export function parseLocalId(badLocalId: string): string {
  const [localId] = badLocalId.split(':');
  return localId;
}

type HousingByLocalId = Record<string, HousingApi[]>;

export function prependOriginalHousing(
  stream: Stream<HousingByLocalId>
): Stream<HousingApi[]> {
  return stream
    .map((group) => Object.values(group))
    .sequence()
    .through(
      prependAsync(async (housingList) => {
        const { geoCode, localId } = housingList[0];
        const originalHousing = await housingRepository.findOne({
          geoCode,
          localId,
        });
        return originalHousing ? [originalHousing] : [];
      })
    );
}
