import { isBanEligible } from '../Address';
import { genAddress } from '../../../test/fixtures.test';
import config from '../../utils/config';

describe('Address', () => {
  describe('isBanEligible', () => {
    const address = genAddress();
    it('should return false when the score is undefined', () => {
      const actual = isBanEligible({ ...address, score: undefined });
      expect(actual).toBe(false);
    });

    it('should return false when the address is not eligible', () => {
      const actual = isBanEligible({
        ...address,
        score: config.banEligibleScore - 0.1
      });
      expect(actual).toBe(false);
    });

    it('should return true when the address is eligible', () => {
      const actual = isBanEligible({
        ...address,
        score: config.banEligibleScore + 0.1
      });
      expect(actual).toBe(true);
    });
  });
});
