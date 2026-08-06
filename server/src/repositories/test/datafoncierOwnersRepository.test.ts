import type { DatafoncierOwner } from '@zerologementvacant/models';
import {
  genDatafoncierOwners,
  genIdprocpte
} from '@zerologementvacant/models/fixtures';
import { sql } from 'kysely';

import { kysely } from '~/infra/database/kysely';
import createDatafoncierOwnersRepository from '~/repositories/datafoncierOwnersRepository';

// Kysely raw insert for df_owners_nat_2024: the codegen key `dfOwnersNat2024`
// doesn't round-trip through CamelCasePlugin to the real table name (same
// digit-boundary limitation as df_housing_nat_2024 — see
// datafoncierHousingRepository.test.ts), and insertInto() only accepts a
// literal table key — so build the statement with a literal table reference.
// Unlike df_housing_nat_2024, this table has no PostGIS geometry columns, so
// a plain column/value insert suffices (no ST_GeomFromGeoJson needed).
async function insertOne(datafoncierOwner: DatafoncierOwner): Promise<void> {
  const columns = Object.keys(datafoncierOwner) as Array<
    keyof DatafoncierOwner
  >;
  const columnRefs = columns.map((column) => sql.ref(column));
  const values = columns.map((column) => sql`${datafoncierOwner[column]}`);
  await sql`
    insert into df_owners_nat_2024 (${sql.join(columnRefs)})
    values (${sql.join(values)})
  `.execute(kysely);
}

// Accepts a single owner or an array, mirroring the Knex accessor's
// `.insert()` call shape so every call site below converts 1:1.
async function insertDatafoncierOwner(
  datafoncierOwner: DatafoncierOwner | ReadonlyArray<DatafoncierOwner>
): Promise<void> {
  const owners = Array.isArray(datafoncierOwner)
    ? datafoncierOwner
    : [datafoncierOwner];
  await Promise.all(owners.map(insertOne));
}

describe('DatafoncierOwnersRepository', () => {
  const repository = createDatafoncierOwnersRepository();

  describe('findDatafoncierOwners', () => {
    it('should return owners matching the idprocpte filter', async () => {
      const idprocpte = genIdprocpte();
      const owners = genDatafoncierOwners(idprocpte, 3);
      const otherOwners = genDatafoncierOwners(genIdprocpte(), 2);
      await insertDatafoncierOwner([...owners, ...otherOwners]);

      const actual = await repository.findDatafoncierOwners({
        filters: { idprocpte }
      });

      expect(actual).toSatisfyAll((owner) => owner.idprocpte === idprocpte);
      expect(actual).toBeArrayOfSize(owners.length);
      // Full-object comparison for at least one row — guards against
      // camelCase/snake_case key drift across every column, not just the
      // ones explicitly asserted elsewhere in this file.
      const expectedOwner = owners.find(
        (owner) => owner.idpersonne === actual[0].idpersonne
      );
      expect(actual[0]).toEqual(expectedOwner);
    });

    it('should return an empty array if no owner matches the idprocpte filter', async () => {
      const actual = await repository.findDatafoncierOwners({
        filters: { idprocpte: genIdprocpte() }
      });

      expect(actual).toBeArrayOfSize(0);
    });

    it('should return all owners when called without filters', async () => {
      const idprocpte = genIdprocpte();
      const owners = genDatafoncierOwners(idprocpte, 2);
      await insertDatafoncierOwner(owners);

      const actual = await repository.findDatafoncierOwners();

      const idpersonnes = actual.map((owner) => owner.idpersonne);
      owners.forEach((owner) => {
        expect(idpersonnes).toContain(owner.idpersonne);
      });
    });

    it('should order results by dnulp', async () => {
      const idprocpte = genIdprocpte();
      const owners = genDatafoncierOwners(idprocpte, 4);
      await insertDatafoncierOwner(owners);

      const actual = await repository.findDatafoncierOwners({
        filters: { idprocpte }
      });

      const dnulps = actual.map((owner) => owner.dnulp);
      expect(dnulps).toStrictEqual([...dnulps].sort());
    });

    it('should deduplicate owners sharing the same idpersonne', async () => {
      const idprocpte = genIdprocpte();
      const [first, second] = genDatafoncierOwners(idprocpte, 2);
      const duplicate = { ...second, idpersonne: first.idpersonne };
      await insertDatafoncierOwner([first, duplicate]);

      const actual = await repository.findDatafoncierOwners({
        filters: { idprocpte }
      });

      expect(actual).toBeArrayOfSize(1);
      expect(actual[0].idpersonne).toBe(first.idpersonne);
    });
  });

  describe('count', () => {
    it('should count distinct owners whose ccogrm is null or in [0, 7, 8]', async () => {
      const idprocpte = genIdprocpte();
      const [matchingNull, matchingZero, nonMatching] = genDatafoncierOwners(
        idprocpte,
        3
      );
      await insertDatafoncierOwner([
        { ...matchingNull, ccogrm: null },
        { ...matchingZero, ccogrm: '0' },
        { ...nonMatching, ccogrm: '5' }
      ]);

      const actual = await repository.count();

      expect(actual).toBeGreaterThanOrEqual(2);
    });

    it('should count each idpersonne once even if it appears on multiple rows', async () => {
      const idprocpte = genIdprocpte();
      const [first, second] = genDatafoncierOwners(idprocpte, 2);
      const duplicate = {
        ...second,
        idpersonne: first.idpersonne,
        ccogrm: null
      };
      await insertDatafoncierOwner([{ ...first, ccogrm: null }, duplicate]);

      const before = await repository.count();
      const idprocpte2 = genIdprocpte();
      const [third] = genDatafoncierOwners(idprocpte2, 1);
      await insertDatafoncierOwner({ ...third, ccogrm: '0' });
      const after = await repository.count();

      expect(after).toBe(before + 1);
    });
  });
});
