import { needsManualReview, suggest } from '../duplicates';
import { genOwnerApi } from '../../../server/test/testFixtures';
import { OwnerApi } from '../../../server/models/OwnerApi';
import { ScoredOwner } from '../comparison';

describe('Duplicates', () => {
  describe('needsManualReview', () => {
    const createOwner = (birthDate: Date): OwnerApi => ({
      ...genOwnerApi(),
      birthDate,
    });

    it('should return true if the score is above threshold and the birth dates match', () => {
      const source = createOwner(new Date('2000-01-01'));
      const best = createOwner(new Date('2000-01-01'));

      const actual = needsManualReview(source, { score: 0.8, value: best });

      expect(actual).toBeTrue();
    });

    // This tests a bug where a housing would have duplicate owners with very close birth dates
    it('should return true if the score is above threshold and the birth dates differ by one day', () => {
      const source = createOwner(new Date('2000-01-01'));
      const best = createOwner(new Date('2000-01-02'));

      const actual = needsManualReview(source, { score: 0.8, value: best });

      expect(actual).toBeTrue();
    });

    // This tests a bug where a housing would have duplicate owners with very close birth dates
    it('should return true if the score is above threshold and the birth dates differ by one year', () => {
      const source = createOwner(new Date('1931-05-08T23:00:00.000Z'));
      const best = createOwner(new Date('1932-05-08T23:00:00.000Z'));

      const actual = needsManualReview(source, { score: 0.8, value: best });

      expect(actual).toBeTrue();
    });
  });

  describe('suggest', () => {
    const createOwner = (address: string[]): OwnerApi => ({
      ...genOwnerApi(),
      birthDate: undefined,
      rawAddress: address,
    });

    it('should suggest the best match or the source whoever has a birth date', () => {
      const source: OwnerApi = { ...genOwnerApi(), birthDate: undefined };
      const scores: ScoredOwner[] = [
        {
          score: 0.8,
          value: genOwnerApi(),
        },
        {
          score: 0.7,
          value: genOwnerApi(),
        },
        {
          score: 0.9,
          value: {
            ...genOwnerApi(),
            birthDate: new Date(),
          },
        },
      ];

      const actual = suggest(source, scores);

      expect(actual).toStrictEqual(scores[2].value);
    });

    it('should suggest the owner with the most complete address otherwise', () => {
      const source: OwnerApi = createOwner([
        '123 RUE DE LA NON-EXISTENCE',
        '64500 ST JEAN DE LUZ',
      ]);
      const scores: ScoredOwner[] = [
        {
          score: 0.404,
          value: createOwner(['404 MAUVAIS MATCH', '64500 ST JEAN DE LUZ']),
        },
        {
          score: 0.9,
          value: createOwner([
            '123 RUE DE LA NON-EXISTENCE',
            'SAINT JEAN DE LUZ',
            '64500 ST JEAN DE LUZ',
          ]),
        },
      ];

      const actual = suggest(source, scores);

      expect(actual).toStrictEqual(scores[1].value);
    });
  });
});
