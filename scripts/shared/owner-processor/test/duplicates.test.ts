import {
  MATCH_THRESHOLD,
  needsManualReview,
  REVIEW_THRESHOLD,
} from '../duplicates';
import { genOwnerApi } from '../../../../server/test/testFixtures';
import { OwnerApi } from '../../../../server/models/OwnerApi';
import { ScoredOwner } from '../../models/Comparison';

describe('Duplicates', () => {
  describe('needsManualReview', () => {
    it("should need review if one of the duplicates' score is above the review threshold but under the match threshold", () => {
      const source = genOwnerApi();
      const duplicates: ScoredOwner[] = [
        {
          score: REVIEW_THRESHOLD + 0.001,
          value: genOwnerApi(),
        },
        {
          score: MATCH_THRESHOLD,
          value: genOwnerApi(),
        },
      ];

      const actual = needsManualReview(source, duplicates);

      expect(actual).toBeTrue();
    });

    describe('If no duplicate is on the review threshold', () => {
      it('should need review if birth dates do not match', () => {
        const source: OwnerApi = {
          ...genOwnerApi(),
          birthDate: new Date('2000-01-01'),
        };
        const duplicates: ScoredOwner[] = [
          {
            score: MATCH_THRESHOLD,
            value: { ...genOwnerApi(), birthDate: new Date('1999-02-03') },
          },
          {
            score: MATCH_THRESHOLD,
            value: { ...genOwnerApi(), birthDate: undefined },
          },
        ];

        const actual = needsManualReview(source, duplicates);

        expect(actual).toBeTrue();
      });

      it('should not need review if at most one birth date is filled', () => {
        const source: OwnerApi = { ...genOwnerApi(), birthDate: undefined };
        const duplicates: ScoredOwner[] = [
          {
            score: MATCH_THRESHOLD,
            value: { ...genOwnerApi(), birthDate: new Date('2000-01-01') },
          },
          {
            score: MATCH_THRESHOLD,
            value: { ...genOwnerApi(), birthDate: undefined },
          },
        ];

        const actual = needsManualReview(source, duplicates);

        expect(actual).toBeFalse();
      });
    });
  });
});
