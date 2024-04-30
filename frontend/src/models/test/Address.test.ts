import { addressToString, isBanEligible } from '../Address';
import { genAddress } from '../../../test/fixtures.test';
import config from '../../utils/config';

describe('Address', () => {
  describe('addressToString', () => {
    const address = genAddress();

    it('should return undefined when the address is undefined', () => {
      const actual = addressToString(undefined);
      expect(actual).toBeUndefined();
    });

    it('should return a string with the address', () => {
      const actual = addressToString(address);
      expect(actual).toBe(
        `${address.houseNumber} ${address.street}\n${address.postalCode} ${address.city}`
      );
    });

    it('should return a string with the address when street also contains houseNumber', () => {
      const actual = addressToString({
        ...address,
        street: `${address.houseNumber} ${address.street}`,
      });
      expect(actual).toBe(
        `${address.houseNumber} ${address.street}\n${address.postalCode} ${address.city}`
      );
    });
  });

  describe('isBanEligible', () => {
    const address = genAddress();
    it('should return false when the score is undefined', () => {
      const actual = isBanEligible({ ...address, score: undefined });
      expect(actual).toBe(false);
    });

    it('should return false when the address is not eligible', () => {
      const actual = isBanEligible({
        ...address,
        score: config.banEligibleScore - 0.1,
      });
      expect(actual).toBe(false);
    });

    it('should return true when the address is eligible', () => {
      const actual = isBanEligible({
        ...address,
        score: config.banEligibleScore + 0.1,
      });
      expect(actual).toBe(true);
    });
  });
});
