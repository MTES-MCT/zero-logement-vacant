import db from '~/infra/database';
import { OwnerApi } from '~/models/OwnerApi';
import { genOwnerApi } from '~/test/testFixtures';
import ownerRepository, {
  formatOwnerApi,
  Owners,
  ownerTable
} from '../ownerRepository';
import { collect } from '@zerologementvacant/utils/node';
import { faker } from '@faker-js/faker';

describe('Owner repository', () => {
  describe('find', () => {
    it('should search by full name', async () => {
      const owners = [
        { ...genOwnerApi(), fullName: 'Jean Valjean' },
        { ...genOwnerApi(), fullName: 'Jean Dupont' },
        { ...genOwnerApi(), fullName: 'Pierre Jean' },
        { ...genOwnerApi(), fullName: 'Kyan khojandi' }
      ];
      await Owners().insert(owners.map(formatOwnerApi));

      const actual = await ownerRepository.find({
        search: 'Jea'
      });

      expect(actual.length).toBeGreaterThanOrEqual(3);
      expect(actual).not.toPartiallyContain({ fullName: 'Kyan khojandi' });
    });

    describe('Filter by idpersonne', () => {
      it('should keep owners who have an idpersonne defined', async () => {
        const owners: ReadonlyArray<OwnerApi> = [
          { ...genOwnerApi(), idpersonne: faker.string.alphanumeric(10) },
          { ...genOwnerApi(), idpersonne: null },
          { ...genOwnerApi(), idpersonne: faker.string.alphanumeric(10) }
        ];
        await Owners().insert(owners.map(formatOwnerApi));

        const actual = await ownerRepository.find({
          filters: {
            idpersonne: true
          }
        });

        expect(actual).toSatisfyAll((owner) => !!owner.idpersonne);
      });

      it('should filter by idpersonne', async () => {
        const owners = faker.helpers.multiple(() => genOwnerApi());
        await Owners().insert(owners.map(formatOwnerApi));

        const actual = await ownerRepository.find({
          filters: {
            idpersonne: owners.map((owner) => owner.idpersonne as string)
          }
        });

        expect(actual).toBeArrayOfSize(owners.length);
      });
    });

    describe('Includes', () => {
      it('should include the BAN address', async () => {
        const actual = await ownerRepository.find({
          includes: ['banAddress']
        });

        expect(actual).toSatisfyAll<OwnerApi>(
          (owner) => owner.banAddress !== undefined
        );
      });
    });

    describe('Pagination', () => {
      it('should paginate by default', async () => {
        const owners = faker.helpers.multiple(() => genOwnerApi(), {
          count: 51
        });
        await Owners().insert(owners.map(formatOwnerApi));

        const actual = await ownerRepository.find();

        expect(actual.length).toBeLessThanOrEqual(50);
      });

      it('should disable pagination', async () => {
        const owners = faker.helpers.multiple(() => genOwnerApi(), {
          count: 51
        });
        await Owners().insert(owners.map(formatOwnerApi));

        const actual = await ownerRepository.find({
          pagination: { paginate: false }
        });

        expect(actual.length).toBeGreaterThanOrEqual(51);
      });

      it('should paginate explicitely', async () => {
        const owners = faker.helpers.multiple(() => genOwnerApi(), {
          count: 21
        });
        await Owners().insert(owners.map(formatOwnerApi));

        const actual = await ownerRepository.find({
          pagination: {
            paginate: true,
            page: 2,
            perPage: 10
          }
        });

        expect(actual.length).toBe(10);
      });
    });
  });

  describe('findOne', () => {
    it('should find a owner without birth date', async () => {
      const owner: OwnerApi = {
        ...genOwnerApi(),
        birthDate: null
      };
      await db(ownerTable).insert(formatOwnerApi(owner));

      const actual = await ownerRepository.findOne({
        fullName: owner.fullName,
        rawAddress: owner.rawAddress
      });

      expect(actual).toMatchObject<Partial<OwnerApi>>({
        id: owner.id,
        fullName: owner.fullName,
        rawAddress: owner.rawAddress
      });
    });

    it('should find a owner with birth date', async () => {
      const owner: OwnerApi = genOwnerApi();
      await db(ownerTable).insert(formatOwnerApi(owner));

      const actual = await ownerRepository.findOne({
        fullName: owner.fullName,
        rawAddress: owner.rawAddress,
        birthDate: owner.birthDate ? new Date(owner.birthDate) : undefined
      });

      expect(actual).toMatchObject<Partial<OwnerApi>>({
        id: owner.id,
        fullName: owner.fullName,
        rawAddress: owner.rawAddress,
        birthDate: owner.birthDate?.substring(0, 'yyyy-mm-dd'.length) ?? null
      });
    });
  });

  describe('count', () => {
    it('should count all owners', async () => {
      const owners = faker.helpers.multiple(() => genOwnerApi(), {
        count: 15
      });
      await Owners().insert(owners.map(formatOwnerApi));

      const actual = await ownerRepository.count();

      expect(actual).toBeGreaterThanOrEqual(owners.length);
    });

    it('should count owners matching search', async () => {
      const owners = [
        { ...genOwnerApi(), fullName: 'Jean Valjean' },
        { ...genOwnerApi(), fullName: 'Jean Dupont' },
        { ...genOwnerApi(), fullName: 'Pierre Jean' },
        { ...genOwnerApi(), fullName: 'Kyan khojandi' }
      ];
      await Owners().insert(owners.map(formatOwnerApi));

      const actual = await ownerRepository.count({
        search: 'Jea'
      });

      expect(actual).toBeGreaterThanOrEqual(3);
    });

    it('should count owners with idpersonne defined', async () => {
      const owners: ReadonlyArray<OwnerApi> = [
        { ...genOwnerApi(), idpersonne: faker.string.alphanumeric(10) },
        { ...genOwnerApi(), idpersonne: null },
        { ...genOwnerApi(), idpersonne: faker.string.alphanumeric(10) }
      ];
      await Owners().insert(owners.map(formatOwnerApi));

      const actual = await ownerRepository.count({
        filters: {
          idpersonne: true
        }
      });

      expect(actual).toBeGreaterThanOrEqual(2);
    });

    it('should count owners by idpersonne', async () => {
      const owners = faker.helpers.multiple(() => genOwnerApi(), {
        count: 5
      });
      await Owners().insert(owners.map(formatOwnerApi));

      const actual = await ownerRepository.count({
        filters: {
          idpersonne: owners.map((owner) => owner.idpersonne as string)
        }
      });

      expect(actual).toBe(5);
    });
  });

  describe('stream', () => {
    it('should group by full name', async () => {
      const owners = new Array(4)
        .fill('0')
        .map(() => genOwnerApi())
        .map<OwnerApi>((owner) => ({
          ...owner,
          fullName: 'Jean Dupont'
        }));
      await Owners().insert(owners.map(formatOwnerApi));

      const actual = await collect(
        ownerRepository.stream({
          groupBy: ['full_name']
        })
      );

      expect(actual.length).toBeGreaterThan(0);
      expect(actual).toSatisfyAll<OwnerApi>((owner) => {
        return !actual
          .filter((owner: OwnerApi) => owner.id !== owner.id)
          .map((owner: OwnerApi) => owner.fullName)
          .includes(owner.fullName);
      });
    });
  });
});
