import { HousingDTO } from '../HousingDTO';
import { fromHousing, Mutation } from '../Mutation';

describe('Mutation', () => {
  describe('fromHousing', () => {
    describe('when lastMutationType is null', () => {
      it('should return null', () => {
        const housing: Pick<
          HousingDTO,
          | 'lastMutationType'
          | 'lastMutationDate'
          | 'lastTransactionDate'
          | 'lastTransactionValue'
        > = {
          lastMutationType: null,
          lastMutationDate: '2023-06-15',
          lastTransactionDate: '2023-06-15',
          lastTransactionValue: 250000
        };

        const actual = fromHousing(housing);

        expect(actual).toStrictEqual<Mutation>({
          type: null,
          date: new Date('2023-06-15')
        });
      });
    });

    describe('when lastMutationType is "sale"', () => {
      it('should return a Sale mutation when lastTransactionDate is provided', () => {
        const housing: Pick<
          HousingDTO,
          | 'lastMutationType'
          | 'lastMutationDate'
          | 'lastTransactionDate'
          | 'lastTransactionValue'
        > = {
          lastMutationType: 'sale',
          lastMutationDate: '2023-06-15',
          lastTransactionDate: '2023-06-20',
          lastTransactionValue: 250000
        };

        const actual = fromHousing(housing);

        expect(actual).toStrictEqual({
          type: 'sale',
          date: new Date('2023-06-20'),
          amount: 250000
        });
      });

      it('should return a Sale mutation with null amount when lastTransactionValue is null', () => {
        const housing: Pick<
          HousingDTO,
          | 'lastMutationType'
          | 'lastMutationDate'
          | 'lastTransactionDate'
          | 'lastTransactionValue'
        > = {
          lastMutationType: 'sale',
          lastMutationDate: '2023-06-15',
          lastTransactionDate: '2023-06-20',
          lastTransactionValue: null
        };

        const actual = fromHousing(housing);

        expect(actual).toStrictEqual({
          type: 'sale',
          date: new Date('2023-06-20'),
          amount: null
        });
      });

      it('should return null when lastTransactionDate is null', () => {
        const housing: Pick<
          HousingDTO,
          | 'lastMutationType'
          | 'lastMutationDate'
          | 'lastTransactionDate'
          | 'lastTransactionValue'
        > = {
          lastMutationType: 'sale',
          lastMutationDate: '2023-06-15',
          lastTransactionDate: null,
          lastTransactionValue: 250000
        };

        const actual = fromHousing(housing);

        expect(actual).toBeNull();
      });
    });

    describe('when lastMutationType is "donation"', () => {
      it('should return a Donation mutation when lastMutationDate is provided', () => {
        const housing: Pick<
          HousingDTO,
          | 'lastMutationType'
          | 'lastMutationDate'
          | 'lastTransactionDate'
          | 'lastTransactionValue'
        > = {
          lastMutationType: 'donation',
          lastMutationDate: '2023-06-15',
          lastTransactionDate: '2023-06-20',
          lastTransactionValue: 250000
        };

        const actual = fromHousing(housing);

        expect(actual).toStrictEqual({
          type: 'donation',
          date: new Date('2023-06-15')
        });
      });

      it('should return null when lastMutationDate is null', () => {
        const housing: Pick<
          HousingDTO,
          | 'lastMutationType'
          | 'lastMutationDate'
          | 'lastTransactionDate'
          | 'lastTransactionValue'
        > = {
          lastMutationType: 'donation',
          lastMutationDate: null,
          lastTransactionDate: '2023-06-20',
          lastTransactionValue: 250000
        };

        const actual = fromHousing(housing);

        expect(actual).toBeNull();
      });
    });

    describe('edge cases', () => {
      it('should handle empty string dates as null', () => {
        const housing: Pick<
          HousingDTO,
          | 'lastMutationType'
          | 'lastMutationDate'
          | 'lastTransactionDate'
          | 'lastTransactionValue'
        > = {
          lastMutationType: 'sale',
          lastMutationDate: '',
          lastTransactionDate: '',
          lastTransactionValue: 250000
        };

        const actual = fromHousing(housing);

        expect(actual).toBeNull();
      });

      it('should handle ISO date strings correctly', () => {
        const housing: Pick<
          HousingDTO,
          | 'lastMutationType'
          | 'lastMutationDate'
          | 'lastTransactionDate'
          | 'lastTransactionValue'
        > = {
          lastMutationType: 'sale',
          lastMutationDate: '2023-06-15T10:30:00.000Z',
          lastTransactionDate: '2023-06-20T14:45:30.000Z',
          lastTransactionValue: 250000
        };

        const actual = fromHousing(housing);

        expect(actual).toStrictEqual({
          type: 'sale',
          date: new Date('2023-06-20T14:45:30.000Z'),
          amount: 250000
        });
      });

      it('should handle zero transaction value', () => {
        const housing: Pick<
          HousingDTO,
          | 'lastMutationType'
          | 'lastMutationDate'
          | 'lastTransactionDate'
          | 'lastTransactionValue'
        > = {
          lastMutationType: 'sale',
          lastMutationDate: '2023-06-15',
          lastTransactionDate: '2023-06-20',
          lastTransactionValue: 0
        };

        const actual = fromHousing(housing);

        expect(actual).toStrictEqual({
          type: 'sale',
          date: new Date('2023-06-20'),
          amount: 0
        });
      });
    });
  });
});
