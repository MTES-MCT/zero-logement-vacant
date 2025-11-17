import type { OwnerRank } from '@zerologementvacant/models';
import { genHousingOwner, genOwner } from '~/test/fixtures';

import {
  computeOwnersAfterRankTransition,
  labelToRank
} from '~/models/HousingOwnerRank';
import type { HousingOwner } from '~/models/Owner';

describe('HousingOwnerRank', () => {
  describe('computeOwnersAfterRankTransition', () => {
    const createHousingOwner = (rank: OwnerRank): HousingOwner => ({
      ...genHousingOwner(genOwner()),
      rank
    });

    it('should promote an owner from "secondary" to "primary"', () => {
      const housingOwners = [
        createHousingOwner(2),
        createHousingOwner(3),
        createHousingOwner(4),
        createHousingOwner(0),
        createHousingOwner(-1),
        createHousingOwner(-2)
      ];

      const actual = computeOwnersAfterRankTransition(housingOwners, {
        id: housingOwners[0].id,
        from: 'secondary',
        to: 'primary'
      });

      expect(actual).toStrictEqual([
        { ...housingOwners[0], rank: 1 },
        { ...housingOwners[1], rank: 2 },
        { ...housingOwners[2], rank: 3 },
        housingOwners[3],
        housingOwners[4],
        housingOwners[5]
      ]);
    });

    it('should demote an owner from "primary" to "secondary"', () => {
      const housingOwners = [
        createHousingOwner(1),
        createHousingOwner(2),
        createHousingOwner(3),
        createHousingOwner(0),
        createHousingOwner(-1),
        createHousingOwner(-2)
      ];

      const actual = computeOwnersAfterRankTransition(housingOwners, {
        id: housingOwners[0].id,
        from: 'primary',
        to: 'secondary'
      });

      expect(actual).toStrictEqual([
        { ...housingOwners[0], rank: 2 },
        { ...housingOwners[1], rank: 3 },
        { ...housingOwners[2], rank: 4 },
        housingOwners[3],
        housingOwners[4],
        housingOwners[5]
      ]);
    });

    it.each(['previous', 'incorrect', 'awaiting', 'deceased'] as const)(
      'should promote an owner from "%s" to "primary"',
      (from) => {
        const rankBefore: OwnerRank = labelToRank(from);

        const housingOwners = [
          createHousingOwner(1),
          createHousingOwner(2),
          createHousingOwner(rankBefore),
          createHousingOwner(-1),
          createHousingOwner(-2)
        ];

        const actual = computeOwnersAfterRankTransition(housingOwners, {
          id: housingOwners[2].id,
          from: from,
          to: 'primary'
        });

        expect(actual).toStrictEqual([
          { ...housingOwners[2], rank: 1 },
          { ...housingOwners[0], rank: 2 },
          { ...housingOwners[1], rank: 3 },
          housingOwners[3],
          housingOwners[4]
        ]);
      }
    );

    it.each(['previous', 'incorrect', 'awaiting', 'deceased'] as const)(
      'should promote an owner from "%s" to "secondary"',
      (from) => {
        const rankBefore: OwnerRank = labelToRank(from);

        const housingOwners = [
          createHousingOwner(1),
          createHousingOwner(2),
          createHousingOwner(3),
          createHousingOwner(rankBefore),
          createHousingOwner(-1),
          createHousingOwner(-2)
        ];

        const actual = computeOwnersAfterRankTransition(housingOwners, {
          id: housingOwners[3].id,
          from: from,
          to: 'secondary'
        });

        expect(actual).toStrictEqual([
          housingOwners[0],
          housingOwners[1],
          housingOwners[2],
          { ...housingOwners[3], rank: 4 },
          housingOwners[4],
          housingOwners[5]
        ]);
      }
    );

    it.each(['previous', 'incorrect', 'awaiting', 'deceased'] as const)(
      'should demote a primary owner to "%s"',
      (to) => {
        const rankAfter: OwnerRank = labelToRank(to);

        const housingOwners = [
          createHousingOwner(1),
          createHousingOwner(2),
          createHousingOwner(3),
          createHousingOwner(-1),
          createHousingOwner(-2)
        ];

        const actual = computeOwnersAfterRankTransition(housingOwners, {
          id: housingOwners[0].id,
          from: 'primary',
          to: to
        });

        expect(actual).toStrictEqual([
          { ...housingOwners[1], rank: 1 },
          { ...housingOwners[2], rank: 2 },
          housingOwners[3],
          housingOwners[4],
          { ...housingOwners[0], rank: rankAfter }
        ]);
      }
    );

    it.each(['previous', 'incorrect', 'awaiting', 'deceased'] as const)(
      'should demote a secondary owner to "%s"',
      (to) => {
        const rankAfter: OwnerRank = labelToRank(to);

        const housingOwners = [
          createHousingOwner(1),
          createHousingOwner(2),
          createHousingOwner(3),
          createHousingOwner(-1),
          createHousingOwner(-2)
        ];

        const actual = computeOwnersAfterRankTransition(housingOwners, {
          id: housingOwners[1].id,
          from: 'secondary',
          to: to
        });

        expect(actual).toStrictEqual([
          housingOwners[0],
          { ...housingOwners[2], rank: 2 },
          housingOwners[3],
          housingOwners[4],
          { ...housingOwners[1], rank: rankAfter }
        ]);
      }
    );

    it('should transition between inactive states', () => {
      const housingOwners = [
        createHousingOwner(1),
        createHousingOwner(2),
        createHousingOwner(0),
        createHousingOwner(-1),
        createHousingOwner(-2)
      ];

      const actual = computeOwnersAfterRankTransition(housingOwners, {
        id: housingOwners[2].id,
        from: 'previous',
        to: 'deceased'
      });

      expect(actual).toStrictEqual([
        housingOwners[0],
        housingOwners[1],
        { ...housingOwners[2], rank: labelToRank('deceased') },
        housingOwners[3],
        housingOwners[4]
      ]);
    });

    it('should swap primary owner with secondary owner', () => {
      const housingOwners = [
        createHousingOwner(1),
        createHousingOwner(2),
        createHousingOwner(3),
        createHousingOwner(4),
        createHousingOwner(-1)
      ];

      const actual = computeOwnersAfterRankTransition(housingOwners, {
        id: housingOwners[2].id,
        from: 'secondary',
        to: 'primary'
      });

      expect(actual).toStrictEqual([
        { ...housingOwners[2], rank: 1 },
        { ...housingOwners[0], rank: 2 },
        { ...housingOwners[1], rank: 3 },
        housingOwners[3],
        housingOwners[4]
      ]);
    });

    it('should return unchanged owners when selected owner is not found', () => {
      const housingOwners = [
        createHousingOwner(1),
        createHousingOwner(2),
        createHousingOwner(3)
      ];

      const actual = computeOwnersAfterRankTransition(housingOwners, {
        id: 'non-existent-id',
        from: 'secondary',
        to: 'primary'
      });

      expect(actual).toStrictEqual(housingOwners);
    });
  });
});
