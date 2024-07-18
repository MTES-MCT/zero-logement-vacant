import ownerMatchRepository, { OwnerMatches } from '../ownerMatchRepository';
import randomstring from 'randomstring';
import {
  genDatafoncierOwner,
  genOwnerApi,
  genOwnerMatch
} from '../../test/testFixtures';
import { formatOwnerApi, Owners } from '../ownerRepository';

describe('Owner match repository', () => {
  describe('findOne', () => {
    it('should return null if the match is missing', async () => {
      const actual = await ownerMatchRepository.findOne({
        idpersonne: randomstring.generate(8),
      });

      expect(actual).toBeDefined();
    });

    it('should return the match if it exists', async () => {
      const datafoncierOwner = genDatafoncierOwner();
      const owner = genOwnerApi();
      const ownerMatch = genOwnerMatch(datafoncierOwner, owner);
      await Owners().insert(formatOwnerApi(owner));
      await OwnerMatches().insert(ownerMatch);

      const actual = await ownerMatchRepository.findOne({
        idpersonne: datafoncierOwner.idpersonne,
      });

      expect(actual).toStrictEqual(ownerMatch);
    });
  });
});
