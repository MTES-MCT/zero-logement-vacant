import { displayCount, reduceStringArray } from '../stringUtils';

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

  describe('reduceStringArray', () => {
    it('should return an empty string when the array is empty', () => {
      const actual = reduceStringArray([]);
      expect(actual).toBe('');
    });

    it('should return a string without undefined elements', () => {
      const actual = reduceStringArray(['a', undefined]);
      expect(actual).toBe('a');
    });

    it('should return a string with two elements join by a break line by default', () => {
      const actual = reduceStringArray(['a', 'b']);
      expect(actual).toBe('a\nb');
    });

    it('should return a string with two elements join by a space', () => {
      const actual = reduceStringArray(['a', 'b'], false);
      expect(actual).toBe('a b');
    });
  });
});
