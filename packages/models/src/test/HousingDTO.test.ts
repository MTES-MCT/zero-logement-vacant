import {
  diffHousingUpdatePayload,
  HousingUpdatePayloadDTO
} from '../HousingDTO';
import { HousingStatus } from '../HousingStatus';
import { Occupancy } from '../Occupancy';

describe('HousingDTO', () => {
  describe('diff', () => {
    it('should diff all changed properties', () => {
      const before: HousingUpdatePayloadDTO = {
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null,
        occupancy: Occupancy.VACANT,
        occupancyIntended: null,
        actualEnergyConsumption: null
      };
      const after: HousingUpdatePayloadDTO = {
        status: HousingStatus.COMPLETED,
        subStatus: 'Suivi terminé',
        occupancy: Occupancy.RENT,
        occupancyIntended: Occupancy.RENT,
        actualEnergyConsumption: 'A'
      };

      const actual = diffHousingUpdatePayload(before, after);

      expect(actual).toStrictEqual<ReturnType<typeof diffHousingUpdatePayload>>(
        {
          before: {
            status: HousingStatus.NEVER_CONTACTED,
            subStatus: null,
            occupancy: Occupancy.VACANT,
            occupancyIntended: null,
            actualEnergyConsumption: null
          },
          after: {
            status: HousingStatus.COMPLETED,
            subStatus: 'Suivi terminé',
            occupancy: Occupancy.RENT,
            occupancyIntended: Occupancy.RENT,
            actualEnergyConsumption: 'A'
          },
          changed: [
            'status',
            'subStatus',
            'occupancy',
            'occupancyIntended',
            'actualEnergyConsumption'
          ]
        }
      );
    });

    it('should diff only changed properties', () => {
      const before: HousingUpdatePayloadDTO = {
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null,
        occupancy: Occupancy.VACANT,
        occupancyIntended: null,
        actualEnergyConsumption: null
      };
      const after: HousingUpdatePayloadDTO = {
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null,
        occupancy: Occupancy.VACANT,
        actualEnergyConsumption: null,
        // Only this property changed
        occupancyIntended: Occupancy.RENT
      };

      const actual = diffHousingUpdatePayload(before, after);

      expect(actual).toStrictEqual<ReturnType<typeof diffHousingUpdatePayload>>(
        {
          before: { occupancyIntended: null },
          after: { occupancyIntended: Occupancy.RENT },
          changed: ['occupancyIntended']
        }
      );
    });
  });
});
