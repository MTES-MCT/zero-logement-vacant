import { displayCount } from '../stringUtils';

describe('String utils', () => {
  describe('displayCount', () => {
    it('should return a string indicating the value is falsy', () => {
      const actual = displayCount(0, 'logement');
      expect(actual).toBe('Aucun logement');
    });

    it('should return a singular string indicating the value is 1', () => {
      const actual = displayCount(1, 'logement');
      expect(actual).toBe('Un logement');
    });

    it('should return a plural string', () => {
      const actual = displayCount(2, 'logement');
      expect(actual).toBe('2 logements');
    });

    it('should return a plural string with a filtered count', () => {
      const actual = displayCount(2, 'logement', undefined, 1);
      expect(actual).toBe('1 logement filtré sur un total de 2 logements');
    });

    it('should feminize the string', () => {
      const actual = displayCount(2, 'maison', { feminine: true });
      expect(actual).toBe('2 maisons');
    });
  });
});
