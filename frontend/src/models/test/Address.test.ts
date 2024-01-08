import { addressToString } from '../Address';

describe('Address', () => {
  describe('addressToString', () => {
    it('should return undefined when the address is undefined', () => {
      const actual = addressToString(undefined);
      expect(actual).toBeUndefined();
    });

    it('should return a string with the address', () => {
      const actual = addressToString({
        street: 'rue de la paix',
        houseNumber: '1',
        postalCode: '75000',
        city: 'Paris',
      });
      expect(actual).toBe('1 rue de la paix\n75000 Paris');
    });

    it('should return a string with the address when street also contains houseNumber', () => {
      const actual = addressToString({
        street: '1 rue de la paix',
        houseNumber: '1',
        postalCode: '75000',
        city: 'Paris',
      });
      expect(actual).toBe('1 rue de la paix\n75000 Paris');
    });
  });
});
