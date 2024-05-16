import { merge } from '../merger';

describe('Merger', () => {
  describe('merge', () => {
    it('should merge strings', () => {
      const first = {
        name: 'John',
      };
      const second = {
        name: 'Doe',
      };

      const actual = merge<{ name: string }>({
        name: (a, b) => `${a} ${b}`,
      })(first, second);

      expect(actual).toStrictEqual({
        name: 'John Doe',
      });
    });
  });
});
