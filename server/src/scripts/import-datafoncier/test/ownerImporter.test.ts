import { v4 as uuidv4 } from 'uuid';
import { genDatafoncierOwner } from '~/test/testFixtures';
import { processOwner } from '../ownerImporter';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import { OwnerApi } from '~/models/OwnerApi';
import { toOwnerApi } from '../../shared';

describe('Import owners', () => {
  describe('processOwner', () => {
    const datafoncierOwner = genDatafoncierOwner();

    describe('If there is no link between Datafoncier and ZLV owners', () => {
      describe('If the DF owner cannot be matched with a ZLV owner', () => {
        it('should create a new owner', async () => {
          const actual = await processOwner(datafoncierOwner);

          expect(actual.owner).toBeDefined();
          expect(actual.owner?.fullName).toBe(datafoncierOwner.ddenom);
        });

        it('should link the DF owner to the newly created owner', async () => {
          const actual = await processOwner(datafoncierOwner);

          expect(actual.match).toBeDefined();
          expect(actual.match?.idpersonne).toBe(datafoncierOwner.idpersonne);
          expect(actual.match?.owner_id).toBeString();
        });
      });

      describe('Otherwise it can be matched to an existing owner', () => {
        const zlvOwner: OwnerApi = {
          ...toOwnerApi(datafoncierOwner),
          id: uuidv4()
        };

        beforeEach(async () => {
          await Owners().insert(formatOwnerApi(zlvOwner));
        });

        it('should create the link', async () => {
          const actual = await processOwner(datafoncierOwner);

          expect(actual.match).toStrictEqual({
            idpersonne: datafoncierOwner.idpersonne,
            owner_id: zlvOwner.id
          });
        });
      });
    });
  });
});
