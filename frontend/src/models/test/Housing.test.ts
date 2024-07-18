import { byAddress, Housing } from '../Housing';
import { Compare } from '../../utils/compareUtils';

describe('Housing', () => {
  describe('#byAddress', () => {
    const housing = (rawAddress: string[]): Housing =>
      ({ rawAddress, } as unknown as Housing);

    it('should sort by city first', () => {
      const h1 = housing(['1 rue Alpha', 'Tours']);
      const h2 = housing(['1 rue Alpha', 'Strasbourg']);

      const actual = byAddress(h1, h2);

      expect(actual).toBe(Compare.A_GT_B);
    });

    it('should then sort by house number', () => {
      const h1 = housing(['1 rue Alpha', 'Strasbourg']);
      const h2 = housing(['2 rue Alpha', 'Strasbourg']);

      const actual = byAddress(h1, h2);

      expect(actual).toBe(Compare.B_GT_A);
    });

    it('should then sort by street', () => {
      const h1 = housing(['2 rue Alpha', 'Strasbourg']);
      const h2 = housing(['1 rue Beta', 'Strasbourg']);

      const actual = byAddress(h1, h2);

      expect(actual).toBe(Compare.B_GT_A);
    });

    it('should sort addresses', () => {
      const housings = [
        housing(['1 rue Alpha', 'Tours']),
        housing(['1 rue Alpha', 'Strasbourg']),
        housing(['2 rue Beta', 'Strasbourg']),
        housing(['2 rue Alpha', 'Strasbourg'])
      ];

      // Copy array because sort mutates input
      const actual = [...housings].sort(byAddress);

      expect(actual).toStrictEqual([
        housings[1],
        housings[3],
        housings[2],
        housings[0]
      ]);
    });
  });
});
