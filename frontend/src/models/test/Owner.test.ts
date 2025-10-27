import type { OwnerRank } from '@zerologementvacant/models';

import { genOwner } from '../../test/fixtures';
import {
  byRank,
  hasOwnerChanges,
  hasRankChanges,
  type HousingOwner
} from '../Owner';

describe('Owner', () => {
  describe('hasOwnerChanges', () => {
    it('should return false if no key has changed', () => {
      const before = genOwner();
      const after = before;

      const actual = hasOwnerChanges(before, after);

      expect(actual).toBeFalse();
    });

    it('should return true if any of the provided keys has changed', () => {
      const before = genOwner();
      const after = {
        ...before,
        email: 'test@test.test'
      };

      const actual = hasOwnerChanges(before, after);

      expect(actual).toBeTrue();
    });
  });

  describe('hasRankChanges', () => {
    it('should return false if no rank has changed', () => {
      const owner = genOwner();
      const before: HousingOwner[] = [
        {
          ...owner,
          rank: 1,
          idprocpte: null,
          idprodroit: null,
          locprop: null,
          propertyRight: null
        }
      ];
      const after: HousingOwner[] = [
        {
          ...owner,
          rank: 1,
          idprocpte: null,
          idprodroit: null,
          locprop: null,
          propertyRight: null
        }
      ];

      const actual = hasRankChanges(before, after);

      expect(actual).toBeFalse();
    });

    it('should return true if a rank has changed', () => {
      const owner = genOwner();
      const before: HousingOwner[] = [
        {
          ...owner,
          rank: 1,
          idprocpte: null,
          idprodroit: null,
          locprop: null,
          propertyRight: null
        }
      ];
      const after: HousingOwner[] = [
        {
          ...owner,
          rank: 2,
          idprocpte: null,
          idprodroit: null,
          locprop: null,
          propertyRight: null
        }
      ];

      const actual = hasRankChanges(before, after);

      expect(actual).toBeTrue();
    });
  });

  describe('byRank', () => {
    it('should sort housing owners by rank', () => {
      const ranks: ReadonlyArray<OwnerRank> = [6, -2, 2, 0, 1, -1, 3, 5, 4];
      const housingOwners: ReadonlyArray<HousingOwner> = ranks.map((rank) => ({
        ...genOwner(),
        rank: rank,
        locprop: null,
        idprocpte: null,
        idprodroit: null,
        propertyRight: null
      }));

      const actual = housingOwners.toSorted(byRank);

      expect(actual).toBeSortedBy('rank');
    });
  });
});
