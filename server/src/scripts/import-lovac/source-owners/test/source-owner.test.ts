import { fc, test } from '@fast-check/jest';

import {
  SourceOwner,
  sourceOwnerSchema
} from '~/scripts/import-lovac/source-owners/source-owner';

describe('SourceOwner', () => {
  describe('sourceOwnerSchema', () => {
    test.prop<SourceOwner>({
      idpersonne: fc.string({ minLength: 1 }),
      full_name: fc.string({ minLength: 1 }),
      dgfip_address: fc.string({ minLength: 1 }),
      data_source: fc.string({ minLength: 1 }),
      kind_class: fc.string({ minLength: 1 }),
      birth_date: fc.option(fc.date()),
      administrator: fc.option(fc.string({ minLength: 1 })),
      siren: fc.option(fc.string({ minLength: 1 })),
      ban_address: fc.option(fc.string({ minLength: 1 }))
    })('should validate a source owner', (sourceOwner) => {
      const actual = sourceOwnerSchema.validateSync(sourceOwner);

      expect(actual).toStrictEqual(sourceOwner);
    });
  });
});
