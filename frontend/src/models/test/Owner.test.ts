import { genOwner } from '../../../test/fixtures.test';
import { hasOwnerChanges, hasRankChanges, HousingOwner } from '../Owner';

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
          locprop: null
        }
      ];
      const after: HousingOwner[] = [
        {
          ...owner,
          rank: 1,
          idprocpte: null,
          idprodroit: null,
          locprop: null
        }
      ];

      const actual = hasRankChanges(before, after);

      expect(actual).toBeFalse();
    });

    it('should return true if a rank has changed', () => {
      const owner = genOwner();
      const before: HousingOwner = {
        ...owner,
        rank: 1,
        idprocpte: null,
        idprodroit: null,
        locprop: null
      };
      const after: HousingOwner = {
        ...owner,
        rank: 2,
        idprocpte: null,
        idprodroit: null,
        locprop: null
      };

      const actual = hasRankChanges(before, after);

      expect(actual).toBeTrue();
    });
  });
});
