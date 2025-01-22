import { fc, test } from '@fast-check/jest';
import { id } from '../id';

describe('id', () => {
  test.prop<[string]>([fc.uuid({ version: 4 })])(
    'should validate inputs',
    (input) => {
      const validate = () => id.validateSync(input);

      expect(validate).not.toThrow();
    }
  );
});
