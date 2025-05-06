import { fromHousing, Mutation } from '../Mutation';

describe('Mutation', () => {
  describe('fromHousing', () => {
    it('should be a "donation" if the last mutation is more recent than the last transaction', () => {
      const actual = fromHousing({
        lastMutationDate: '2023-01-01',
        lastTransactionDate: '2022-12-31',
        lastTransactionValue: null
      });

      expect(actual).toStrictEqual<Mutation>({
        type: 'donation',
        date: new Date('2023-01-01')
      });
    });

    it('should be a "donation" if the last transaction date is empty', () => {
      const actual = fromHousing({
        lastMutationDate: '2023-01-01',
        lastTransactionDate: null,
        lastTransactionValue: null
      });

      expect(actual).toStrictEqual<Mutation>({
        type: 'donation',
        date: new Date('2023-01-01')
      });
    });

    it('should be a "sale" if the last transaction is the same as the last mutation', () => {
      const actual = fromHousing({
        lastMutationDate: '2023-01-01',
        lastTransactionDate: '2023-01-01',
        lastTransactionValue: 100
      });

      expect(actual).toStrictEqual<Mutation>({
        type: 'sale',
        date: new Date('2023-01-01'),
        amount: 100
      });
    });

    it('should be a "sale" if the last transaction is more recent than the last mutation', () => {
      const actual = fromHousing({
        lastMutationDate: '2023-01-01',
        lastTransactionDate: '2023-01-02',
        lastTransactionValue: 100
      });

      expect(actual).toStrictEqual<Mutation>({
        type: 'sale',
        date: new Date('2023-01-02'),
        amount: 100
      });
    });

    it('should be a "sale" if the last mutation is empty and the last transaction is specified', () => {
      const actual = fromHousing({
        lastMutationDate: null,
        lastTransactionDate: '2023-01-01',
        lastTransactionValue: null
      });

      expect(actual).toStrictEqual<Mutation>({
        type: 'sale',
        date: new Date('2023-01-01'),
        amount: null
      });
    });

    it('should have an empty "amount" if the last transaction value is empty', () => {
      const actual = fromHousing({
        lastMutationDate: '2023-01-01',
        lastTransactionDate: '2023-01-02',
        lastTransactionValue: null
      });

      expect(actual).toStrictEqual<Mutation>({
        type: 'sale',
        date: new Date('2023-01-02'),
        amount: null
      });
    });

    it('should return null otherwise', () => {
      const actual = fromHousing({
        lastMutationDate: null,
        lastTransactionDate: null,
        lastTransactionValue: null
      });

      expect(actual).toBeNull();
    });
  });
});
