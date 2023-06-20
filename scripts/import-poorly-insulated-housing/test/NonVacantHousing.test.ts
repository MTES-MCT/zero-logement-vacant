import {
  geoCode,
  nature,
  NonVacantHousing,
  occupancy,
} from '../NonVacantHousing';

describe('NonVacantHousing', () => {
  describe('occupancy', () => {
    it('should be true if the filter includes ff_ccthp', () => {
      const housing = { ff_ccthp: 'L' } as NonVacantHousing;

      const actual = occupancy('L', 'V')(housing);

      expect(actual).toBeTrue();
    });

    it('should be false otherwise', () => {
      const housing = { ff_ccthp: 'H' } as NonVacantHousing;

      const actual = occupancy('L', 'V')(housing);

      expect(actual).toBeFalse();
    });
  });

  describe('nature', () => {
    it('should be true if the filter includes ff_dteloc', () => {
      const housing = { ff_dteloc: 'MAISON' } as NonVacantHousing;

      const actual = nature('MAISON', 'APPARTEMENT')(housing);

      expect(actual).toBeTrue();
    });

    it('should be false otherwise', () => {
      const housing = { ff_dteloc: 'APPARTEMENT' } as NonVacantHousing;

      const actual = nature('MAISON')(housing);

      expect(actual).toBeFalse();
    });
  });

  describe('geoCode', () => {
    it('should be true if the filter includes ff_idcom', () => {
      const housing = { ff_idcom: '75056' } as NonVacantHousing;

      const actual = geoCode('75056')(housing);

      expect(actual).toBeTrue();
    });

    it('should be false otherwise', () => {
      const housing = { ff_idcom: '75056' } as NonVacantHousing;

      const actual = geoCode('32013')(housing);

      expect(actual).toBeFalse();
    });
  });
});
