import { genHousing } from '../../test/fixtures';
import { getSource, type Housing } from '../Housing';

describe('Housing', () => {
  describe('getSource', () => {
    it.each`
      dataFileYears                           | source                  | expected
      ${['lovac-2019']}                       | ${'lovac'}              | ${'LOVAC (2019)'}
      ${['lovac-2020', 'lovac-2021']}         | ${'lovac'}              | ${'LOVAC (2020, 2021)'}
      ${['ff-2020', 'ff-2021', 'lovac-2021']} | ${'lovac'}              | ${'Fichiers fonciers (2020, 2021), LOVAC (2021)'}
      ${[]}                                   | ${'datafoncier-manual'} | ${'Fichiers fonciers'}
      ${[]}                                   | ${'datafoncier-import'} | ${'Fichiers fonciers'}
    `(
      `should format $dataFileYears and $source to $expected`,
      ({ dataFileYears, source, expected }) => {
        const housing: Housing = { ...genHousing(), dataFileYears, source };

        const actual = getSource(housing);

        expect(actual).toBe(expected);
      }
    );
  });
});
