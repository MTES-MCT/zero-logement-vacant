import ownerRepository, {
  formatOwnerApi,
  Owners,
  ownerTable,
} from '../ownerRepository';
import {
  genDatafoncierOwner,
  genOwnerApi,
  genOwnerMatch,
} from '../../test/testFixtures';
import db from '../db';
import { OwnerApi } from '../../models/OwnerApi';
import { DatafoncierOwners } from '../datafoncierOwnersRepository';
import { OwnerMatches } from '../ownerMatchRepository';

describe('Owner repository', () => {
  describe('find', () => {
    it('should find owners by idpersonne', async () => {
      const owners = new Array(6).fill(0).map(() => genOwnerApi());
      const datafoncierOwners = owners.map(() => genDatafoncierOwner());
      const matches = owners.map((owner, i) =>
        genOwnerMatch(datafoncierOwners[i], owner)
      );
      await Owners().insert(owners.map(formatOwnerApi));
      await DatafoncierOwners().insert(datafoncierOwners);
      await OwnerMatches().insert(matches);

      const actual = await ownerRepository.find({
        filters: {
          idpersonne: datafoncierOwners.map((owner) => owner.idpersonne),
        },
      });

      expect(actual).toBeArrayOfSize(owners.length);
    });
  });

  describe('findOne', () => {
    it('should find a owner without birth date', async () => {
      const owner: OwnerApi = {
        ...genOwnerApi(),
        birthDate: undefined,
      };
      await db(ownerTable).insert(formatOwnerApi(owner));

      const actual = await ownerRepository.findOne({
        fullName: owner.fullName,
        rawAddress: owner.rawAddress,
      });

      expect(actual).toStrictEqual({
        ...owner,
        administrator: null,
        birthDate: undefined,
        banAddress: undefined,
      });
    });

    it('should find a owner with birth date', async () => {
      const owner: OwnerApi = genOwnerApi();
      await db(ownerTable).insert(formatOwnerApi(owner));

      const actual = await ownerRepository.findOne({
        fullName: owner.fullName,
        rawAddress: owner.rawAddress,
        birthDate: owner.birthDate ? new Date(owner.birthDate) : undefined,
      });

      expect(actual).toStrictEqual({
        ...owner,
        administrator: null,
        birthDate: owner.birthDate ? new Date(owner.birthDate) : null,
        banAddress: undefined,
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
          fullName: 'Jean Dupont',
        }));
      await Owners().insert(owners.map(formatOwnerApi));

      const actual = await ownerRepository
        .stream({
          groupBy: ['full_name'],
        })
        .collect()
        .toPromise(Promise);

      expect(actual).toSatisfyAll<OwnerApi>((owner) => {
        return !actual
          .filter((o) => o.id !== owner.id)
          .map((o) => o.fullName)
          .includes(owner.fullName);
      });
    });
  });
});
