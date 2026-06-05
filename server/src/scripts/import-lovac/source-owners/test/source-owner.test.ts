import { fc, test } from '@fast-check/vitest';
import { OWNER_KIND_LABEL_VALUES } from '@zerologementvacant/models';

import {
  mapEntity,
  sourceOwnerSchema
} from '~/scripts/import-lovac/source-owners/source-owner';

describe('SourceOwner', () => {
  describe('sourceOwnerSchema', () => {
    test.prop({
      owner_uid: fc.uuid(),
      idpersonne: fc.option(fc.stringMatching(/\S+/)),
      full_name: fc.stringMatching(/\S+/),
      username: fc.option(fc.stringMatching(/\S+/)),
      address_dgfip: fc.option(fc.stringMatching(/\S+/)),
      ownership_type: fc.option(fc.constantFrom(...OWNER_KIND_LABEL_VALUES)),
      birth_date: fc.option(fc.date({ noInvalidDate: true })),
      siren: fc.option(fc.stringMatching(/\S+/)),
      entity: fc.option(fc.stringMatching(/^[0-9]/))
    })('should validate a source owner', (sourceOwner) => {
      const validate = () => sourceOwnerSchema.parse(sourceOwner);

      expect(validate).not.toThrow();
      const actual = validate();
      expect(actual.entity).toBe(
        sourceOwner.entity ? mapEntity(sourceOwner.entity[0]) : null
      );
    });
  });

  it('should parse birth date from number to date', () => {
    const actual = sourceOwnerSchema.parse({
      owner_uid: '550e8400-e29b-41d4-a716-446655440000',
      birth_date: -698716800,
      idpersonne: 'idpersonne',
      full_name: 'full_name',
      username: null,
      address_dgfip: null,
      ownership_type: 'Particulier',
      siren: null,
      entity: null
    });

    expect(actual.birth_date?.toJSON()).toBe('1947-11-11T00:00:00.000Z');
  });

  it.skip('should parse birth date from string to date', () => {
    const actual = sourceOwnerSchema.parse({
      owner_uid: '550e8400-e29b-41d4-a716-446655440000',
      birth_date: '1947-11-11',
      idpersonne: 'idpersonne',
      full_name: 'full_name',
      username: null,
      address_dgfip: null,
      ownership_type: 'Particulier',
      siren: null,
      entity: null
    });

    expect(actual.birth_date?.toJSON()).toBe('1947-11-11T00:00:00.000Z');
  });
});
