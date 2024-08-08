import { genGeoCode } from '../fixtures';

describe('Fixtures', () => {
  describe('genGeoCode', () => {
    it('should generate a valid geo code', () => {
      Array.from({ length: 100 }, genGeoCode).forEach((geoCode) => {
        expect(geoCode).not.toStartWith('00');
        expect(geoCode).not.toStartWith('20');
        expect(geoCode).not.toStartWith('99');
        expect(geoCode).not.toEndWith('999');
      });
    });
  });
});
