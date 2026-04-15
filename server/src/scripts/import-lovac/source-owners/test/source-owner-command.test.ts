import { faker } from '@faker-js/faker/locale/fr';
import { stringify as writeJSONL } from 'jsonlines';
import fs from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { Transform, Writable } from 'node:stream';
import { ReadableStream } from 'node:stream/web';

import {
  formatOwnerApi,
  OwnerRecordDBO,
  Owners
} from '~/repositories/ownerRepository';
import { mapEntity } from '~/scripts/import-lovac/source-owners/source-owner';
import { createSourceOwnerCommand } from '~/scripts/import-lovac/source-owners/source-owner-command';
import { genOwnerApi } from '~/test/testFixtures';

/**
 * Raw LOVAC owner as it appears in the JSONL file, before schema transformation.
 * entity is a single digit character (e.g. '0'-'9') or null, not the final enum value.
 */
interface RawSourceOwner {
  idpersonne: string;
  full_name: string;
  dgfip_address: string | null;
  ownership_type: string;
  birth_date: Date | null;
  siren: string | null;
  entity: string | null;
}

function genRawSourceOwner(idpersonne?: string): RawSourceOwner {
  const entityDigit = faker.helpers.arrayElement([
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    null
  ]);
  return {
    idpersonne: idpersonne ?? faker.string.alphanumeric(11),
    full_name: faker.person.fullName(),
    dgfip_address: faker.location.streetAddress(),
    ownership_type: 'Particulier',
    birth_date: faker.date.past(),
    siren: null,
    entity: entityDigit
  };
}

describe('Source owner command', () => {
  const command = createSourceOwnerCommand();
  const file = path.join(import.meta.dirname, 'owners.jsonl');

  // New owner: present in LOVAC, absent from DB
  const newRaw = genRawSourceOwner();

  // Existing owner: present in both LOVAC and DB — use same idpersonne
  const existingOwnerApi = {
    ...genOwnerApi(),
    idpersonne: faker.string.alphanumeric(11)
  };
  const existingRaw = genRawSourceOwner(existingOwnerApi.idpersonne);

  beforeAll(async () => {
    await Owners().insert(formatOwnerApi(existingOwnerApi));

    await write(file, [newRaw, existingRaw]);
    await command(file, {
      abortEarly: false,
      dryRun: false,
      from: 'file',
      year: 'lovac-2025'
    });
  });

  afterAll(async () => {
    await rm(file);
  });

  describe('New owner (present in LOVAC, absent from DB)', () => {
    it('should create the owner', async () => {
      const actual = await Owners()
        .where({ idpersonne: newRaw.idpersonne })
        .first();
      expect(actual).toBeDefined();
      expect(actual).toMatchObject<Partial<OwnerRecordDBO>>({
        idpersonne: newRaw.idpersonne,
        full_name: newRaw.full_name,
        address_dgfip: newRaw.dgfip_address ? [newRaw.dgfip_address] : null,
        kind_class: newRaw.ownership_type,
        data_source: 'lovac-2025',
        entity: newRaw.entity ? mapEntity(newRaw.entity[0]) : null
      });
    });
  });

  describe('Existing owner (present in LOVAC and in DB)', () => {
    it('should update the fields sourced from LOVAC', async () => {
      const actual = await Owners()
        .where({ idpersonne: existingRaw.idpersonne })
        .first();
      expect(actual).toBeDefined();
      expect(actual).toMatchObject<Partial<OwnerRecordDBO>>({
        id: existingOwnerApi.id,
        full_name: existingRaw.full_name,
        address_dgfip: existingRaw.dgfip_address
          ? [existingRaw.dgfip_address]
          : null,
        kind_class: existingRaw.ownership_type
      });
    });

    it('should preserve the fields not sourced from LOVAC', async () => {
      const actual = await Owners()
        .where({ idpersonne: existingRaw.idpersonne })
        .first();
      expect(actual).toMatchObject<Partial<OwnerRecordDBO>>({
        email: existingOwnerApi.email ?? null,
        phone: existingOwnerApi.phone ?? null,
        administrator: existingOwnerApi.administrator ?? null,
        additional_address: existingOwnerApi.additionalAddress ?? null,
        entity: existingOwnerApi.entity ?? null
      });
    });
  });
});

async function write(
  file: string,
  sourceOwners: ReadonlyArray<RawSourceOwner>
): Promise<void> {
  await new ReadableStream<RawSourceOwner>({
    start(controller) {
      sourceOwners.forEach((owner) => controller.enqueue(owner));
      controller.close();
    }
  })
    .pipeThrough(Transform.toWeb(writeJSONL()))
    .pipeTo(Writable.toWeb(fs.createWriteStream(file)));
}
