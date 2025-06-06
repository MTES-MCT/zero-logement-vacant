import { diff, HousingUpdatePayloadDTO } from '../HousingDTO';
import { HousingStatus } from '../HousingStatus';
import { Occupancy } from '../Occupancy';

describe('HousingDTO', () => {
  describe('diff', () => {
    it('should diff all changed properties', () => {
      const before: HousingUpdatePayloadDTO = {
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null,
        occupancy: Occupancy.VACANT,
        occupancyIntended: null
      };
      const after: HousingUpdatePayloadDTO = {
        status: HousingStatus.COMPLETED,
        subStatus: 'Suivi terminé',
        occupancy: Occupancy.RENT,
        occupancyIntended: Occupancy.RENT
      };

      const actual = diff(before, after);

      expect(actual).toStrictEqual<ReturnType<typeof diff>>([
        {
          status: HousingStatus.NEVER_CONTACTED,
          subStatus: null,
          occupancy: Occupancy.VACANT,
          occupancyIntended: null
        },
        {
          status: HousingStatus.COMPLETED,
          subStatus: 'Suivi terminé',
          occupancy: Occupancy.RENT,
          occupancyIntended: Occupancy.RENT
        }
      ]);
    });

    it('should diff only changed properties', () => {
      const before: HousingUpdatePayloadDTO = {
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null,
        occupancy: Occupancy.VACANT,
        occupancyIntended: null
      };
      const after: HousingUpdatePayloadDTO = {
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null,
        occupancy: Occupancy.VACANT,
        // Only this property changed
        occupancyIntended: Occupancy.RENT
      };

      const actual = diff(before, after);

      expect(actual).toStrictEqual<ReturnType<typeof diff>>([
        { occupancyIntended: null },
        { occupancyIntended: Occupancy.RENT }
      ]);
    });
  });
});
