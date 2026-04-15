import { v5 as uuidv5 } from 'uuid';
import { describe, expect, it } from 'vitest';
import { formatOwnerApi } from '~/repositories/ownerRepository';
import { LOVAC_NAMESPACE } from '~/scripts/import-lovac/infra';
import { genSourceOwner } from '~/scripts/import-lovac/infra/fixtures';
import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';
import {
  createOwnerTransform,
  OwnerChange
} from '~/scripts/import-lovac/source-owners/source-owner-transform';
import { genOwnerApi } from '~/test/testFixtures';

describe('createOwnerTransform', () => {
  const reporter = createNoopReporter<any>();

  it('should produce a create change when the owner does not exist', () => {
    const source = genSourceOwner();
    const transform = createOwnerTransform({ reporter, abortEarly: false });

    const change = transform({ source, existing: null });

    expect(change).toMatchObject<OwnerChange>({
      type: 'owner',
      kind: 'create',
      value: expect.objectContaining({
        idpersonne: source.idpersonne,
        fullName: source.full_name,
        dataSource: 'lovac'
      })
    });
    expect(change.value.id).toBeDefined();
  });

  it('should produce an update change when the owner exists', () => {
    const source = genSourceOwner();
    const existing = formatOwnerApi({ ...genOwnerApi(), idpersonne: source.idpersonne });
    const transform = createOwnerTransform({ reporter, abortEarly: false });

    const change = transform({ source, existing });

    expect(change).toMatchObject<OwnerChange>({
      type: 'owner',
      kind: 'update',
      value: expect.objectContaining({
        id: existing.id,
        idpersonne: source.idpersonne,
        fullName: source.full_name
      })
    });
  });

  it('should preserve existing email and phone on update', () => {
    const source = genSourceOwner();
    const existing = formatOwnerApi(
      { ...genOwnerApi(), idpersonne: source.idpersonne, email: 'keep@example.com', phone: '0600000000' }
    );
    const transform = createOwnerTransform({ reporter, abortEarly: false });

    const change = transform({ source, existing });

    expect(change.value.email).toBe('keep@example.com');
    expect(change.value.phone).toBe('0600000000');
  });

  it('should prefer source siren over existing on update', () => {
    const source = genSourceOwner();
    source.siren = '123456789';
    const existing = formatOwnerApi(
      { ...genOwnerApi(), idpersonne: source.idpersonne, siren: '999999999' }
    );
    const transform = createOwnerTransform({ reporter, abortEarly: false });

    const change = transform({ source, existing });

    expect(change.value.siren).toBe('123456789');
  });

  it('should stamp dataSource with the provided year on create', () => {
    const source = genSourceOwner();
    const transform = createOwnerTransform({ reporter, abortEarly: false, year: 'lovac-2026' });

    const change = transform({ source, existing: null });

    expect(change.value.dataSource).toBe('lovac-2026');
  });

  it('should produce a deterministic ID on create (same idpersonne → same id)', () => {
    const source = genSourceOwner();
    const transform = createOwnerTransform({ reporter, abortEarly: false });

    const change1 = transform({ source, existing: null });
    const change2 = transform({ source, existing: null });

    expect(change1.value.id).toBe(change2.value.id);
    expect(change1.value.id).toBe(uuidv5(source.idpersonne, LOVAC_NAMESPACE));
  });
});
