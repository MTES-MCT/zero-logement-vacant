import {
  HOUSING_STATUS_IDS,
  HousingStatus,
  HOUSING_STATUS_VALUES,
  isHousingStatus,
  toHousingStatusId
} from '../HousingStatus';

describe('HousingStatus', () => {
  describe('isHousingStatus', () => {
    it.each(HOUSING_STATUS_VALUES)('returns true for valid status %i', (status) => {
      expect(isHousingStatus(status)).toBe(true);
    });

    it.each([-1, 6, 7, 100])('returns false for out-of-range number %i', (value) => {
      expect(isHousingStatus(value)).toBe(false);
    });
  });

  describe('toHousingStatusId', () => {
    it.each<[HousingStatus, string]>([
      [HousingStatus.NEVER_CONTACTED, 'never-contacted'],
      [HousingStatus.WAITING, 'waiting'],
      [HousingStatus.FIRST_CONTACT, 'first-contact'],
      [HousingStatus.IN_PROGRESS, 'in-progress'],
      [HousingStatus.COMPLETED, 'completed'],
      [HousingStatus.BLOCKED, 'blocked']
    ])('maps HousingStatus.%s (%i) to "%s"', (status, expected) => {
      expect(toHousingStatusId(status)).toBe(expected);
    });

    it('covers all status IDs', () => {
      const mapped = HOUSING_STATUS_VALUES.map(toHousingStatusId);
      expect(mapped).toEqual([...HOUSING_STATUS_IDS]);
    });
  });
});
