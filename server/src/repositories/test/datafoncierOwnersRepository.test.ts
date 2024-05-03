import createDatafoncierOwnersRepository, {
  DatafoncierOwners,
} from '../datafoncierOwnersRepository';
import {
  genDatafoncierHousing,
  genDatafoncierOwner,
} from '~/test/testFixtures';
import { DatafoncierOwner, toOwnerApi } from '~/scripts/shared';
import { OwnerMatchDBO, OwnerMatches } from '../ownerMatchRepository';
import { formatOwnerApi, Owners } from '../ownerRepository';

describe('Datafoncier owners repository', () => {
  const repository = createDatafoncierOwnersRepository();

  describe('find', () => {
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
      const actual = await repository.find({
        filters: {
          idprocpte: datafoncierHousing.idprocpte,
        },
      });

      expect(actual).toBeArrayOfSize(datafoncierOwners.length);
    });
  });
});
