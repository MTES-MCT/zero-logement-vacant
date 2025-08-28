import db from '~/infra/database';
import { OwnerApi } from '~/models/OwnerApi';
import { genOwnerApi } from '~/test/testFixtures';
import ownerRepository, {
  formatOwnerApi,
  Owners,
  ownerTable
} from '../ownerRepository';
import { collect } from '@zerologementvacant/utils/node';

describe('Owner repository', () => {
  describe('find', () => {
    it('should find owners by idpersonne', async () => {
      const owners = Array.from({ length: 6 }, () => genOwnerApi());
      await Owners().insert(owners.map(formatOwnerApi));

      const actual = await ownerRepository.find({
        filters: {
          idpersonne: owners.map((owner) => owner.idpersonne as string)
        }
      });

      expect(actual).toBeArrayOfSize(owners.length);
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
