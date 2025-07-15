import { toString } from '../Mutation';

describe('Mutation', () => {
  describe('toString', () => {
    it('should display the mutation date only if the mutation type is "null"', () => {
      const actual = toString({
        type: null,
        date: new Date('2023-01-01')
      });

      expect(actual).toInclude('01/01/2023');
      expect(actual).not.toInclude('Vente');
      expect(actual).not.toInclude('Donation');
    });

    it('should start with "Vente" if the mutation is a "sale"', () => {
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

      expect(actual).toInclude('30/01/2023');
    });

    it('should include the amount if the transaction is a "sale"', () => {
      const date = new Date('2023-01-01');
      const amount = 100;

      const actual = toString({
        type: 'sale',
        date,
        amount
      });

      // Jest and Intl.NumberFormat seem to behave differently when it comes to
      // formatting currency. We cannot test the exact format with '€' because
      // it depends on the Intl.NumberFormat API, which seems different
      // in jest and in the browser.
      expect(actual).toInclude(`Montant : ${amount}`);
    });
  });
});
