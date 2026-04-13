import {
  ACTIVE_OWNER_RANKS,
  INACTIVE_OWNER_RANKS,
  isActiveOwnerRank,
  isAwaitingOwnerRank,
  isDeceasedOwnerRank,
  isInactiveOwnerRank,
  isIncorrectOwnerRank,
  isPreviousOwnerRank,
  isPrimaryOwner,
  isSecondaryOwner
} from '../HousingOwnerDTO';

describe('HousingOwnerDTO', () => {
  describe('isActiveOwnerRank', () => {
    it.each(ACTIVE_OWNER_RANKS)('returns true for active rank %i', (rank) => {
      expect(isActiveOwnerRank(rank)).toBe(true);
    });

    it.each(INACTIVE_OWNER_RANKS)('returns false for inactive rank %i', (rank) => {
      expect(isActiveOwnerRank(rank)).toBe(false);
    });
  });

  describe('isPreviousOwnerRank', () => {
    it('returns true for rank 0', () => {
      expect(isPreviousOwnerRank(0)).toBe(true);
    });

    it.each([-3, -2, -1, 1, 2])('returns false for rank %i', (rank) => {
      expect(isPreviousOwnerRank(rank)).toBe(false);
    });
  });

  describe('isIncorrectOwnerRank', () => {
    it('returns true for rank -1', () => {
      expect(isIncorrectOwnerRank(-1)).toBe(true);
    });

    it.each([-3, -2, 0, 1, 2])('returns false for rank %i', (rank) => {
      expect(isIncorrectOwnerRank(rank)).toBe(false);
    });
  });

  describe('isAwaitingOwnerRank', () => {
    it('returns true for rank -2', () => {
      expect(isAwaitingOwnerRank(-2)).toBe(true);
    });

    it.each([-3, -1, 0, 1, 2])('returns false for rank %i', (rank) => {
      expect(isAwaitingOwnerRank(rank)).toBe(false);
    });
  });

  describe('isDeceasedOwnerRank', () => {
    it('returns true for rank -3', () => {
      expect(isDeceasedOwnerRank(-3)).toBe(true);
    });

    it.each([-2, -1, 0, 1, 2])('returns false for rank %i', (rank) => {
      expect(isDeceasedOwnerRank(rank)).toBe(false);
    });
  });

  describe('isInactiveOwnerRank', () => {
    it.each([-3, -2, -1, 0])('returns true for inactive rank %i', (rank) => {
      expect(isInactiveOwnerRank(rank)).toBe(true);
    });

    it.each(ACTIVE_OWNER_RANKS)('returns false for active rank %i', (rank) => {
      expect(isInactiveOwnerRank(rank)).toBe(false);
    });
  });

  describe('isPrimaryOwner', () => {
    it('returns true when rank is 1', () => {
      expect(isPrimaryOwner({ rank: 1 })).toBe(true);
    });

    it.each([-3, -2, -1, 0, 2, 3, 6])('returns false when rank is %i', (rank) => {
      expect(isPrimaryOwner({ rank: rank as any })).toBe(false);
    });
  });

  describe('isSecondaryOwner', () => {
    it.each([2, 3, 4, 5, 6])('returns true when rank is %i', (rank) => {
      expect(isSecondaryOwner({ rank: rank as any })).toBe(true);
    });

    it.each([-3, -2, -1, 0, 1])('returns false when rank is %i', (rank) => {
      expect(isSecondaryOwner({ rank: rank as any })).toBe(false);
    });
  });
});
