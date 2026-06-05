import { faker } from '@faker-js/faker/locale/fr';
import { ReadableStream } from 'node:stream/web';

import {
  formatOwnerApi,
  Owners,
  OwnerRecordDBO
} from '~/repositories/ownerRepository';
import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';
import { createOwnerLoader } from '../source-owner-loader';
import { OwnerChange } from '../source-owner-transform';
import { genOwnerApi } from '~/test/testFixtures';

// LOVAC owners always have an idpersonne — generate with one to avoid
// null idpersonne clashing with ON CONFLICT (idpersonne) behavior in PostgreSQL
// (nulls are never equal in unique indexes, so conflicts on null idpersonne
// won't be caught and will fall through to a PK violation instead).
function genOwnerWithIdpersonne() {
  return formatOwnerApi({
    ...genOwnerApi(),
    idpersonne: faker.string.alphanumeric(11)
  });
}

describe('createOwnerLoader', () => {
  it('inserts new owners', async () => {
    const reporter = createNoopReporter();
    const owner = formatOwnerApi(genOwnerApi());
    const change: OwnerChange = { type: 'owner', kind: 'create', value: owner };

    await ReadableStream.from([change]).pipeTo(
      createOwnerLoader({ dryRun: false, reporter })
    );

    const actual = await Owners().where({ id: owner.id }).first();
    expect(actual).toBeDefined();
    expect(actual?.idpersonne).toBe(owner.idpersonne);
  });

  it('upserts existing owners', async () => {
    const reporter = createNoopReporter();
    const existing = genOwnerWithIdpersonne();
    await Owners().insert(existing);
    const updated: OwnerRecordDBO = {
      ...existing,
      full_name: 'CHANGED NAME',
      updated_at: new Date()
    };
    const change: OwnerChange = { type: 'owner', kind: 'update', value: updated };

    await ReadableStream.from([change]).pipeTo(
      createOwnerLoader({ dryRun: false, reporter })
    );

    const actual = await Owners().where({ id: existing.id }).first();
    expect(actual?.full_name).toBe('CHANGED NAME');
  });

  it('skips writes when dryRun is true', async () => {
    const reporter = createNoopReporter();
    const owner = formatOwnerApi(genOwnerApi());
    const change: OwnerChange = { type: 'owner', kind: 'create', value: owner };

    await ReadableStream.from([change]).pipeTo(
      createOwnerLoader({ dryRun: true, reporter })
    );

    const actual = await Owners().where({ id: owner.id }).first();
    expect(actual).toBeUndefined();
  });

  it('reports created and updated counts', async () => {
    const reporter = createNoopReporter();
    const createdSpy = vi.spyOn(reporter, 'created');
    const updatedSpy = vi.spyOn(reporter, 'updated');

    const newOwner = genOwnerWithIdpersonne();
    const existing = genOwnerWithIdpersonne();
    await Owners().insert(existing);
    const updated: OwnerRecordDBO = { ...existing, full_name: 'X', updated_at: new Date() };

    const changes: OwnerChange[] = [
      { type: 'owner', kind: 'create', value: newOwner },
      { type: 'owner', kind: 'update', value: updated }
    ];

    await ReadableStream.from(changes).pipeTo(
      createOwnerLoader({ dryRun: false, reporter })
    );

    expect(createdSpy).toHaveBeenCalledWith(1);
    expect(updatedSpy).toHaveBeenCalledWith(1);
  });
});
