import type { OwnerRank } from '@zerologementvacant/models';

import {
  computeOwnersAfterRankTransition,
  labelToRank,
  rankToLabel
} from '~/models/HousingOwnerRank';
import type { HousingOwner } from '~/models/Owner';
import { genHousingOwner, genOwner } from '~/test/fixtures';

describe('HousingOwnerRank', () => {
  describe('rankToLabel / labelToRank', () => {
    it('maps the do-not-contact rank to the "doNotContact" label', () => {
      expect(rankToLabel(-4)).toBe('doNotContact');
    });

    it('maps the "doNotContact" label to rank -4', () => {
      expect(labelToRank('doNotContact')).toBe(-4);
    });
  });

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

    describe('do-not-contact transitions', () => {
      it('should promote the next active owner when the primary becomes "doNotContact"', () => {
        const housingOwners = [
          createHousingOwner(1),
          createHousingOwner(2),
          createHousingOwner(3),
          createHousingOwner(-1)
        ];

        const actual = computeOwnersAfterRankTransition(housingOwners, {
          id: housingOwners[0].id,
          from: 'primary',
          to: 'doNotContact'
        });

        expect(actual).toStrictEqual([
          { ...housingOwners[1], rank: 1 },
          { ...housingOwners[2], rank: 2 },
          { ...housingOwners[0], rank: -4 },
          housingOwners[3]
        ]);
      });

      it('should rebuild active ranks when a secondary becomes "doNotContact"', () => {
        const housingOwners = [
          createHousingOwner(1),
          createHousingOwner(2),
          createHousingOwner(3),
          createHousingOwner(-1)
        ];

        const actual = computeOwnersAfterRankTransition(housingOwners, {
          id: housingOwners[1].id,
          from: 'secondary',
          to: 'doNotContact'
        });

        expect(actual).toStrictEqual([
          { ...housingOwners[0], rank: 1 },
          { ...housingOwners[2], rank: 2 },
          { ...housingOwners[1], rank: -4 },
          housingOwners[3]
        ]);
      });

      it('should promote a "doNotContact" owner to primary', () => {
        const housingOwners = [
          createHousingOwner(1),
          createHousingOwner(2),
          createHousingOwner(-4),
          createHousingOwner(-1)
        ];

        const actual = computeOwnersAfterRankTransition(housingOwners, {
          id: housingOwners[2].id,
          from: 'doNotContact',
          to: 'primary'
        });

        expect(actual).toStrictEqual([
          { ...housingOwners[2], rank: 1 },
          { ...housingOwners[0], rank: 2 },
          { ...housingOwners[1], rank: 3 },
          housingOwners[3]
        ]);
      });

      it('should move a "doNotContact" owner to secondary', () => {
        const housingOwners = [
          createHousingOwner(1),
          createHousingOwner(2),
          createHousingOwner(-4),
          createHousingOwner(-1)
        ];

        const actual = computeOwnersAfterRankTransition(housingOwners, {
          id: housingOwners[2].id,
          from: 'doNotContact',
          to: 'secondary'
        });

        expect(actual).toStrictEqual([
          housingOwners[0],
          housingOwners[1],
          { ...housingOwners[2], rank: 3 },
          housingOwners[3]
        ]);
      });

      it.each(['previous', 'incorrect', 'awaiting', 'deceased'] as const)(
        'should archive a "doNotContact" owner as "%s"',
        (to) => {
          const rankAfter: OwnerRank = labelToRank(to);

          const housingOwners = [
            createHousingOwner(1),
            createHousingOwner(-4),
            createHousingOwner(-1)
          ];

          const actual = computeOwnersAfterRankTransition(housingOwners, {
            id: housingOwners[1].id,
            from: 'doNotContact',
            to
          });

          expect(actual).toStrictEqual([
            housingOwners[0],
            housingOwners[2],
            { ...housingOwners[1], rank: rankAfter }
          ]);
        }
      );

      it.each(['previous', 'incorrect', 'awaiting', 'deceased'] as const)(
        'should mark an archived "%s" owner as "doNotContact"',
        (from) => {
          const rankBefore: OwnerRank = labelToRank(from);

          const housingOwners = [
            createHousingOwner(1),
            createHousingOwner(2),
            createHousingOwner(rankBefore),
            createHousingOwner(-1)
          ];

          const actual = computeOwnersAfterRankTransition(housingOwners, {
            id: housingOwners[2].id,
            from,
            to: 'doNotContact'
          });

          expect(actual).toStrictEqual([
            housingOwners[0],
            housingOwners[1],
            { ...housingOwners[2], rank: -4 },
            housingOwners[3]
          ]);
        }
      );

      it('should preserve existing "doNotContact" owners during an unrelated transition', () => {
        const housingOwners = [
          createHousingOwner(1),
          createHousingOwner(2),
          createHousingOwner(-4),
          createHousingOwner(-1)
        ];

        const actual = computeOwnersAfterRankTransition(housingOwners, {
          id: housingOwners[1].id,
          from: 'secondary',
          to: 'primary'
        });

        expect(actual).toStrictEqual([
          { ...housingOwners[1], rank: 1 },
          { ...housingOwners[0], rank: 2 },
          housingOwners[3],
          housingOwners[2]
        ]);
      });
    });
  });
});
