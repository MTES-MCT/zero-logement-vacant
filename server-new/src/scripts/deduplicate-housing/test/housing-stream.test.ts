import { prependOriginalHousing } from '../housing-stream';
import highland from 'highland';
import { genHousingApi, genInvariant, genLocalId } from '~/test/testFixtures';
import { HousingApi } from '~/models/HousingApi';
import {
  formatHousingRecordApi,
  Housing,
} from '~/repositories/housingRepository';

describe('Housing stream', () => {
  describe('concatOriginalHousing', () => {
    it('should concat the original housing', async () => {
      const localId = genLocalId('12', genInvariant('345'));
      const housingList = new Array(3)
        .fill('0')
        .map(() => genHousingApi('12345'))
        .map<HousingApi>((housing) => ({
          ...housing,
          localId,
        }));
      const stream = highland(
        Promise.resolve({
          [localId]: housingList,
        }),
      );
      const added: HousingApi = { ...genHousingApi('12345'), localId };
      await Housing().insert(formatHousingRecordApi(added));

      const actual = await prependOriginalHousing(stream).toPromise(Promise);

      expect(actual).toIncludeAllMembers(housingList);
      expect(actual).toPartiallyContain<Partial<HousingApi>>({
        id: added.id,
        invariant: added.invariant,
        localId: added.localId,
      });
    });
  });
});
