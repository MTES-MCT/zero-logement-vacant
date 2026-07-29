import { fc, test } from '@fast-check/vitest';
import { HOUSING_POINT_FIELDS } from '@zerologementvacant/models';

import { housingListQuery } from '../housing-list-query';

describe('Housing list query', () => {
  test.prop({
    fields: fc.array(fc.constantFrom(...HOUSING_POINT_FIELDS))
  })('should validate a fields projection', (query) => {
    const validate = () => housingListQuery.validateSync(query);

    expect(validate).not.toThrow();
  });

  it('should validate empty inputs', () => {
    const actual = housingListQuery.validateSync({});

    expect(actual).toStrictEqual({});
  });

  it('should parse a comma-separated fields string into an array', () => {
    const actual = housingListQuery.validateSync({
      fields: HOUSING_POINT_FIELDS.join(',')
    });

    expect(actual.fields).toStrictEqual([...HOUSING_POINT_FIELDS]);
  });

  it('should reject unknown fields', () => {
    const validate = () =>
      housingListQuery.validateSync({ fields: 'id,unknownField' });

    expect(validate).toThrow();
  });
});
