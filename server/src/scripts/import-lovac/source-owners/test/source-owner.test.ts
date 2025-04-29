import { fc, test } from '@fast-check/jest';

import {
  mapEntity,
  sourceOwnerSchema
} from '~/scripts/import-lovac/source-owners/source-owner';

describe('SourceOwner', () => {
  describe('sourceOwnerSchema', () => {
    test.prop({
      idpersonne: fc.string({ minLength: 1 }),
      full_name: fc.string({ minLength: 1 }),
      dgfip_address: fc.option(fc.string({ minLength: 1 })),
      ownership_type: fc.string({ minLength: 1 }),
      birth_date: fc.option(fc.date()),
      siren: fc.option(fc.string({ minLength: 1 })),
      entity: fc.option(fc.stringMatching(/^[0-9]/))
    })('should validate a source owner', (sourceOwner) => {
      const actual = sourceOwnerSchema.validateSync(sourceOwner);

      expect(actual).toStrictEqual({
        ...sourceOwner,
        entity: sourceOwner.entity ? mapEntity(sourceOwner.entity[0]) : null
      });
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
