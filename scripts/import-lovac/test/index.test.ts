import highland from 'highland';
import { appendAll } from '../stream';

describe('Import Lovac', () => {
  describe('appendAll', () => {
    it('should resolve an object of promises', (done) => {
      const stream = highland(['Commune de Paris']).map((name) => ({ name }));
      const doAppendAll = appendAll({
        zipcode: async () => 75016,
      });

      const actual = doAppendAll(stream);

      actual
        .each((item) => {
          expect(item).toStrictEqual({
            name: 'Commune de Paris',
            zipcode: 75016,
          });
        })
        .done(done);
    });
  });
});
