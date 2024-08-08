import { fc, test } from '@fast-check/jest';

import {
  SourceOwner,
  sourceOwnerSchema
} from '~/scripts/import-lovac/source-owners/source-owner';
import { genSourceOwner } from '~/scripts/import-lovac/infra/fixtures';

describe('SourceOwner', () => {
  describe('sourceOwnerSchema', () => {
    test.prop<SourceOwner>({
      idpersonne: fc.string({ minLength: 1 }),
      full_name: fc.string({ minLength: 1 }),
      dgfip_address: fc.string({ minLength: 1 }),
      ownership_type: fc.string({ minLength: 1 }),
      birth_date: fc.option(fc.date()),
      siren: fc.option(fc.string({ minLength: 1 }))
    })('should validate a source owner', (sourceOwner) => {
      const actual = sourceOwnerSchema.validateSync(sourceOwner);

      expect(actual).toStrictEqual(sourceOwner);
    });
  });

  it('should parse birth date from number to date', () => {
    const sourceOwner = genSourceOwner();

    const actual = sourceOwnerSchema.validateSync({
      ...sourceOwner,
      birth_date: -698716800
    });

    expect(actual.birth_date?.toJSON()).toBe('1947-11-11T00:00:00.000Z');
  });

  it('should parse birth date from string to date', () => {
    const sourceOwner = genSourceOwner();

    const actual = sourceOwnerSchema.validateSync({
      ...sourceOwner,
      birth_date: '1947-11-11'
    });

    expect(actual.birth_date?.toJSON()).toBe('1947-11-11T00:00:00.000Z');
  });
});
