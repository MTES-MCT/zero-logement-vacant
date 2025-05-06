import { toString } from '../Mutation';

describe('Mutation', () => {
  describe('toString', () => {
    it('should start by "Vente" if the mutation is a "sale"', () => {
      const actual = toString({
        type: 'sale',
        date: new Date(),
        amount: null
      });

      expect(actual).toStartWith('Vente');
    });

    it('should start with "Donation" if the mutation is a "donation"', () => {
      const actual = toString({
        type: 'donation',
        date: new Date()
      });

      expect(actual).toStartWith('Donation');
    });

    it('should include the mutation date', () => {
      const date = new Date('2023-01-30');

      const actual = toString({
        type: 'sale',
        date,
        amount: null
      });

      expect(actual).toContain('30/01/2023');
    });

    it('should include the amount if the transaction is a "sale"', () => {
      const date = new Date('2023-01-01');
      const amount = 100;

      const actual = toString({
        type: 'sale',
        date,
        amount
      });

      expect(actual).toContain(`(Montant : ${amount} €)`);
    });
  });
});
