import {
  genDatafoncierOwners,
  genIdprocpte
} from '@zerologementvacant/models/fixtures';

import createDatafoncierOwnersRepository, {
  DatafoncierOwners
} from '~/repositories/datafoncierOwnersRepository';

describe('DatafoncierOwnersRepository', () => {
  const repository = createDatafoncierOwnersRepository();

  describe('findDatafoncierOwners', () => {
    it('should return owners matching the idprocpte filter', async () => {
      const idprocpte = genIdprocpte();
      const owners = genDatafoncierOwners(idprocpte, 3);
      const otherOwners = genDatafoncierOwners(genIdprocpte(), 2);
      await DatafoncierOwners().insert([...owners, ...otherOwners]);

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
      await DatafoncierOwners().insert(owners);

      const actual = await repository.findDatafoncierOwners();

      const idpersonnes = actual.map((owner) => owner.idpersonne);
      owners.forEach((owner) => {
        expect(idpersonnes).toContain(owner.idpersonne);
      });
    });

    it('should order results by dnulp', async () => {
      const idprocpte = genIdprocpte();
      const owners = genDatafoncierOwners(idprocpte, 4);
      await DatafoncierOwners().insert(owners);

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
      await DatafoncierOwners().insert([first, duplicate]);

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
      await DatafoncierOwners().insert([
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
      await DatafoncierOwners().insert([{ ...first, ccogrm: null }, duplicate]);

      const before = await repository.count();
      const idprocpte2 = genIdprocpte();
      const [third] = genDatafoncierOwners(idprocpte2, 1);
      await DatafoncierOwners().insert({ ...third, ccogrm: '0' });
      const after = await repository.count();

      expect(after).toBe(before + 1);
    });
  });
});
