import { Occupancy, OCCUPANCY_VALUES } from '../Occupancy';
import { toOccupancy } from '../DatafoncierHousing';

describe('DatafoncierHousing', () => {
  describe('toOccupancy', () => {
    it.each(OCCUPANCY_VALUES)('should return %s', (ccthp) => {
      const actual = toOccupancy(ccthp);

      expect(actual).toBe(ccthp);
    });

    it(`should return ${Occupancy.UNKNOWN} when ccthp is null`, () => {
      const actual = toOccupancy(null);

      expect(actual).toBe(Occupancy.UNKNOWN);
    });

    it(`should return ${Occupancy.UNKNOWN} otherwise`, () => {
      const actual = toOccupancy('test');

      expect(actual).toBe(Occupancy.UNKNOWN);
    });
  });
});
