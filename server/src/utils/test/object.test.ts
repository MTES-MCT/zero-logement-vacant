import { compactUndefined } from '~/utils/object';

describe('Object utils', () => {
  describe('compactUndefined', () => {
    it('should remove keys that have an undefined value', () => {
      const actual = compactUndefined({
        a: 'a',
        b: 'b',
        c: undefined,
        d: null
      });

      expect(actual).toStrictEqual({
        a: 'a',
        b: 'b',
        d: null
      });
    });
  });
});
