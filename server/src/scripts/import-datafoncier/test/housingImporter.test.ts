import { genDatafoncierHousing } from '~/test/testFixtures';
import { processHousing } from '../housingImporter';
import {
  formatHousingRecordApi,
  Housing,
} from '~/repositories/housingRepository';
import { toHousingRecordApi } from '../../shared';
import { DatafoncierHousing } from '@zerologementvacant/shared';

describe('Housing importer', () => {
  describe('processHousing', () => {
    let housing: DatafoncierHousing;

    beforeEach(() => {
      housing = {
        ...genDatafoncierHousing(),
        ccthp: 'V',
      };
    });

    it('should create the housing if it does not exist', async () => {
      await processHousing(housing);

      const actual = await Housing()
        .where({ invariant: housing.invar })
        .first();
      expect(actual).toBeDefined();
    });

    it('should leave the existing housing untouched otherwise', async () => {
      await Housing().insert(
        formatHousingRecordApi(
          toHousingRecordApi({ source: 'lovac' }, housing),
        ),
      );
      const updated: DatafoncierHousing = {
        ...housing,
        ccthp: 'L',
      };

      await processHousing(updated);

      const actual = await Housing()
        .where({ invariant: housing.invar })
        .first();
      expect(actual).toHaveProperty('occupancy', housing.ccthp);
    });
  });
});
