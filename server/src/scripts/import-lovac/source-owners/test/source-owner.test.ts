import { fc, test } from '@fast-check/vitest';

import {
  mapEntity,
  sourceOwnerSchema
} from '~/scripts/import-lovac/source-owners/source-owner';

describe('SourceOwner', () => {
  describe('sourceOwnerSchema', () => {
    test.prop({
      idpersonne: fc.stringMatching(/\S+/),
      full_name: fc.stringMatching(/\S+/),
      dgfip_address: fc.option(fc.stringMatching(/\S+/)),
      ownership_type: fc.stringMatching(/\S+/),
      birth_date: fc.option(fc.date({ noInvalidDate: true })),
      siren: fc.option(fc.stringMatching(/\S+/)),
      entity: fc.option(fc.stringMatching(/^[0-9]/))
    })('should validate a source owner', (sourceOwner) => {
      const validate = () => sourceOwnerSchema.validateSync(sourceOwner);

      expect(validate).not.toThrow();
      const actual = validate();
      expect(actual.entity).toBe(
        sourceOwner.entity ? mapEntity(sourceOwner.entity[0]) : null
      );
    });
  });

  it('should parse birth date from number to date', () => {
    const actual = sourceOwnerSchema.validateSync({
      birth_date: -698716800,
      idpersonne: 'idpersonne',
      full_name: 'full_name',
      dgfip_address: null,
      ownership_type: 'ownership_type',
      siren: null,
      entity: null
    });

    expect(actual.birth_date?.toJSON()).toBe('1947-11-11T00:00:00.000Z');
  });

  it('should parse birth date from string to date', () => {
    const actual = sourceOwnerSchema.validateSync({
      birth_date: '1947-11-11',
      idpersonne: 'idpersonne',
      full_name: 'full_name',
      dgfip_address: null,
      ownership_type: 'ownership_type',
      siren: null,
      entity: null
    });

    expect(actual.birth_date?.toJSON()).toBe('1947-11-11T00:00:00.000Z');
  });
});
