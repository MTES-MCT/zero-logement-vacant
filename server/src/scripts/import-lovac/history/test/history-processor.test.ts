import { normalize } from '~/scripts/import-lovac/history/history-processor';

describe('History processor', () => {
  describe('normalize', () => {
    it('should sort data file years', () => {
      const actual = normalize([
        'lovac-2020',
        'ff-2024',
        'lovac-2022',
        'lovac-2021'
      ]);

      expect(actual).toStrictEqual([
        'ff-2024',
        'lovac-2020',
        'lovac-2021',
        'lovac-2022'
      ]);
    });

    it('should filter "lovac-2024"', () => {
      const actual = normalize(['lovac-2021', 'lovac-2022', 'lovac-2024']);

      expect(actual).toStrictEqual(['lovac-2021', 'lovac-2022']);
    });

    it('should filter duplicates', () => {
      const actual = normalize(['lovac-2021', 'lovac-2022', 'lovac-2022']);

      expect(actual).toStrictEqual(['lovac-2021', 'lovac-2022']);
    });
  });
});
