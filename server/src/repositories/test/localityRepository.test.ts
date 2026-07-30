import { genGeoCode } from '@zerologementvacant/models/fixtures';

import { kysely } from '~/infra/database/kysely';
import { factories } from '~/test/factories';
import { genLocalityApi } from '~/test/testFixtures';

import localityRepository, { toLocalityInsert } from '../localityRepository';

describe('Locality repository', () => {
  describe('find', () => {
    describe('geoCodes filter', () => {
      const locality1 = genLocalityApi();
      const locality2 = genLocalityApi();

      beforeAll(async () => {
        await factories.establishment.create();
        await kysely
          .insertInto('localities')
          .values([toLocalityInsert(locality1), toLocalityInsert(locality2)])
          .execute();
      });

      it('should return no localities when geoCodes is empty', async () => {
        const result = await localityRepository.find({
          filters: { geoCodes: [] }
        });

        expect(result).toBeArrayOfSize(0);
      });

      it('should return only localities matching geoCodes', async () => {
        const result = await localityRepository.find({
          filters: { geoCodes: [locality1.geoCode] }
        });

        const geoCodes = result.map((locality) => locality.geoCode);
        expect(geoCodes).toContain(locality1.geoCode);
        expect(geoCodes).not.toContain(locality2.geoCode);
      });

      it('should return all localities when geoCodes is undefined', async () => {
        const result = await localityRepository.find({ filters: {} });

        const geoCodes = result.map((locality) => locality.geoCode);
        expect(geoCodes).toContain(locality1.geoCode);
        expect(geoCodes).toContain(locality2.geoCode);
      });
    });

    describe('establishmentId filter', () => {
      it('should return only localities within the establishment geoCodes', async () => {
        const locality1 = genLocalityApi();
        const locality2 = genLocalityApi();
        await kysely
          .insertInto('localities')
          .values([toLocalityInsert(locality1), toLocalityInsert(locality2)])
          .execute();
        const establishment = await factories.establishment.create({
          geoCodes: [locality1.geoCode]
        });

        const result = await localityRepository.find({
          filters: { establishmentId: establishment.id }
        });

        const geoCodes = result.map((locality) => locality.geoCode);
        expect(geoCodes).toContain(locality1.geoCode);
        expect(geoCodes).not.toContain(locality2.geoCode);
      });
    });
  });

  describe('get', () => {
    it('should return the locality matching the geoCode', async () => {
      const locality = genLocalityApi();
      await kysely
        .insertInto('localities')
        .values(toLocalityInsert(locality))
        .execute();

      const actual = await localityRepository.get(locality.geoCode);

      // genLocalityApi() omits `taxRate` entirely; toLocalityInsert passes an
      // explicit `undefined` through, which pg binds as NULL on insert — so
      // the round-tripped value has an explicit `taxRate: null`, not an
      // absent key. Verified empirically against the real DB.
      expect(actual).toStrictEqual({ ...locality, taxRate: null });
    });

    it('should return null if no locality matches the geoCode', async () => {
      const actual = await localityRepository.get(genGeoCode());

      expect(actual).toBeNull();
    });
  });

  describe('update', () => {
    it('should update the tax kind and tax rate', async () => {
      const locality = genLocalityApi();
      await kysely
        .insertInto('localities')
        .values(toLocalityInsert(locality))
        .execute();

      const actual = await localityRepository.update({
        ...locality,
        taxKind: 'TLV',
        taxRate: 5
      });

      expect(actual).toMatchObject({
        geoCode: locality.geoCode,
        taxKind: 'TLV',
        taxRate: 5
      });
      const stored = await kysely
        .selectFrom('localities')
        .selectAll('localities')
        .where('geoCode', '=', locality.geoCode)
        .executeTakeFirst();
      expect(stored).toMatchObject({ taxKind: 'TLV', taxRate: 5 });
    });

    it('should set the tax rate to null when taxRate is undefined', async () => {
      const locality = genLocalityApi();
      await kysely
        .insertInto('localities')
        .values(toLocalityInsert({ ...locality, taxKind: 'TLV', taxRate: 5 }))
        .execute();

      const actual = await localityRepository.update({
        ...locality,
        taxKind: 'None',
        taxRate: undefined
      });

      expect(actual.taxRate).toBeNull();
      const stored = await kysely
        .selectFrom('localities')
        .selectAll('localities')
        .where('geoCode', '=', locality.geoCode)
        .executeTakeFirst();
      expect(stored).toMatchObject({ taxRate: null });
    });
  });
});
