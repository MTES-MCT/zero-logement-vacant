import { fc, test } from '@fast-check/jest';

import {
  SourceHousingOwner,
  sourceHousingOwnerSchema
} from '~/scripts/import-lovac/source-housing-owners/source-housing-owner';
import { PositiveRank } from '~/models/HousingOwnerApi';

describe('SourceHousingOwner', () => {
  describe('sourceHousingOwnerSchema', () => {
    test.prop<SourceHousingOwner>({
      local_id: fc.string({ minLength: 12, maxLength: 12 }),
      idpersonne: fc.string({ minLength: 8, maxLength: 8 }),
      idprocpte: fc.string({ minLength: 11, maxLength: 11 }),
      idprodroit: fc.string({ minLength: 13, maxLength: 13 }),
      locprop: fc.integer({ min: 1, max: 9 }),
      rank: fc.constantFrom<PositiveRank>(1, 2, 3, 4, 5, 6)
    })('should validate a source housing owner', (sourceHousingOwner) => {
      const actual = sourceHousingOwnerSchema.validateSync(sourceHousingOwner);

      expect(actual).toStrictEqual(sourceHousingOwner);
    });
  });
});
