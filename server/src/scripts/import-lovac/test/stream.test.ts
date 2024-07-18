import highland from 'highland';
import { appendAll } from '~/utils/stream';

describe('Import Lovac', () => {
  describe('appendAll', () => {
    it('should resolve an object of promises', (done) => {
      const stream = highland(['Commune de Paris']).map((name) => ({ name, }));

      const actual = stream.through(
        appendAll({
          zipcode: async () => 75016,
        })
      );

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
