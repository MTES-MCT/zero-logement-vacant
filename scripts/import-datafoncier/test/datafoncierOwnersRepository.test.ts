import createDatafoncierOwnersRepository, {
  DatafoncierOwners,
} from '../datafoncierOwnersRepository';
import {
  genDatafoncierHousing,
  genDatafoncierOwner,
} from '../../../server/test/testFixtures';
import { DatafoncierOwner, toOwnerApi } from '../../shared';
import {
  OwnerMatchDBO,
  OwnerMatches,
} from '../../../server/repositories/ownerMatchRepository';
import {
  formatOwnerApi,
  Owners,
} from '../../../server/repositories/ownerRepository';

describe('Datafoncier owners repository', () => {
  const repository = createDatafoncierOwnersRepository();

  describe('findOwners', () => {
    const datafoncierHousing = genDatafoncierHousing();
    const datafoncierOwners: DatafoncierOwner[] = new Array(6)
      .fill('0')
      .map(() => ({
        ...genDatafoncierOwner(),
        idprocpte: datafoncierHousing.idprocpte,
      }));

    beforeEach(async () => {
      await DatafoncierOwners().insert(datafoncierOwners);
      const owners = datafoncierOwners.map(toOwnerApi);
      await Owners().insert(owners.map(formatOwnerApi));
      const matches: OwnerMatchDBO[] = datafoncierOwners.map((owner, i) => ({
        owner_id: owners[i].id,
        idpersonne: owner.idpersonne,
      }));
      await OwnerMatches().insert(matches);
    });

    it('should return the owners of a housing', async () => {
      const actual = await repository.findOwners(datafoncierHousing);

      expect(actual).toBeArrayOfSize(datafoncierOwners.length);
      expect(actual).toBeSortedBy('rank');
    });
  });
});
