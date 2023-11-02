import { v4 as uuidv4 } from 'uuid';
import { genDatafoncierOwner } from '../../../server/test/testFixtures';
import { processOwner } from '../ownerImporter';
import {
  formatOwnerApi,
  Owners,
} from '../../../server/repositories/ownerRepository';
import { OwnerMatches } from '../../../server/repositories/ownerMatchRepository';
import { OwnerApi } from '../../../server/models/OwnerApi';
import { toOwnerApi } from '../../shared';

describe('Import owners', () => {
  describe('processOwner', () => {
    const datafoncierOwner = genDatafoncierOwner();

    describe('If there is no link between Datafoncier and ZLV owners', () => {
      describe('If the DF owner cannot be matched with a ZLV owner', () => {
        it('should create a new owner', async () => {
          await processOwner(datafoncierOwner);

          const actual = await Owners()
            .where({ full_name: datafoncierOwner.ddenom })
            .first();
          expect(actual).toBeDefined();
        });

        it('should link the DF owner to the newly created owner', async () => {
          await processOwner(datafoncierOwner);

          const actual = await OwnerMatches()
            .where({ idpersonne: datafoncierOwner.idpersonne })
            .first();
          expect(actual).toHaveProperty('owner_id', expect.any(String));
        });
      });

      describe('Otherwise it can be matched to an existing owner', () => {
        const zlvOwner: OwnerApi = {
          ...toOwnerApi(datafoncierOwner),
          id: uuidv4(),
        };

        beforeEach(async () => {
          await Owners().insert(formatOwnerApi(zlvOwner));
        });

        it('should create the link', async () => {
          await processOwner(datafoncierOwner);

          const actual = await OwnerMatches()
            .where({
              idpersonne: datafoncierOwner.idpersonne,
              owner_id: zlvOwner.id,
            })
            .first();
          expect(actual).toBeDefined();
        });
      });
    });
  });
});
