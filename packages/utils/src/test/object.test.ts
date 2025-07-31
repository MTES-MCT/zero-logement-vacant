import { compactNullable, compactUndefined } from '../object';

describe('object', () => {
  describe('compactNullable', () => {
    it('should remove null or undefined keys', () => {
      const actual = compactNullable({
        a: undefined,
        b: null,
        c: 'value'
      });

      expect(actual).toStrictEqual({
        c: 'value'
      });
    });
  });

  describe('compactUndefined', () => {
    it('should remove undefined keys', () => {
      const actual = compactUndefined({
        a: undefined,
        b: 'value',
        c: null
      });

      expect(actual).toStrictEqual({
        b: 'value',
        c: null
      });
    });
  });
});
