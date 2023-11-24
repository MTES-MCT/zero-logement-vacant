import { v4 as uuidv4 } from 'uuid';
import { genDatafoncierOwner } from '../../../server/test/testFixtures';
import { ownerImporter, processOwner } from '../ownerImporter';
import {
  formatOwnerApi,
  Owners,
} from '../../../server/repositories/ownerRepository';
import { OwnerMatches } from '../../../server/repositories/ownerMatchRepository';
import { OwnerApi } from '../../../server/models/OwnerApi';
import { DatafoncierOwner, toOwnerApi } from '../../shared';
import { OwnerEvents } from '../../../server/repositories/eventRepository';
import { HousingOwners } from '../../../server/repositories/housingOwnerRepository';
import highland from 'highland';
import { startTimer } from '../../shared/elapsed';
import { logger } from '../../../server/utils/logger';

describe('Import owners', () => {
  describe('Benchmark', () => {
    beforeEach(async () => {
      await Promise.all([
        HousingOwners().delete(),
        OwnerEvents().delete(),
        OwnerMatches().delete(),
      ]);
      await Owners().delete();
    });

    it('should process a large amount of data', (done) => {
      function* createGenerator(n: number) {
        let i = 0;
        while (i < n) {
          yield genDatafoncierOwner();
          i++;
        }
      }

      const iterations = 5_000;
      const generator = createGenerator(iterations);
      const stream = highland<DatafoncierOwner>(generator);
      startTimer((stopTimer) => {
        stream.through(ownerImporter).done(() => {
          const elapsed = stopTimer();
          logger.info(`Done in ${elapsed}.`);
          done();
        });
      });
      // It should succeed within 2 minutes
    }, 120_000 /* A specific timeout */);
  });

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
          id: uuidv4(),
        };

        beforeEach(async () => {
          await Owners().insert(formatOwnerApi(zlvOwner));
        });

        it('should create the link', async () => {
          const actual = await processOwner(datafoncierOwner);

          expect(actual.match).toStrictEqual({
            idpersonne: datafoncierOwner.idpersonne,
            owner_id: zlvOwner.id,
          });
        });
      });
    });
  });
});
