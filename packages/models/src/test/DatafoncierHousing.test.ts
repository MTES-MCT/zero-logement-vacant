import { toOccupancy } from '../DatafoncierHousing';
import {
  Occupancy,
  READ_ONLY_OCCUPANCY_VALUES,
  READ_WRITE_OCCUPANCY_VALUES
} from '../Occupancy';

describe('DatafoncierHousing', () => {
  describe('toOccupancy', () => {
    it.each(READ_WRITE_OCCUPANCY_VALUES)('should return %s', (ccthp) => {
      const actual = toOccupancy(ccthp);

      expect(actual).toBe(ccthp);
    });

    it.each(READ_ONLY_OCCUPANCY_VALUES)(
      `should take %s and return ${Occupancy.OTHERS}`,
      (ccthp) => {
        const actual = toOccupancy(ccthp);

        expect(actual).toBe(Occupancy.OTHERS);
      }
    );

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
