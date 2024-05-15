import { createQuery } from '../http-request';

describe('HTTP Request', () => {
  describe('createQuery', () => {
    it('should create a query string', () => {
      const actual = createQuery({
        string: 'string',
        number: '123',
        undefined: undefined,
        null: null,
      });

      expect(actual).toBe('?string=string&number=123');
    });
  });
});
