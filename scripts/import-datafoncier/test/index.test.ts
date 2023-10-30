import highland from 'highland';

import {
  genDatafoncierHousing,
  genDatafoncierOwner,
} from '../../../server/test/testFixtures';
import { DatafoncierOwners } from '../datafoncierOwnersRepository';
import { DatafoncierHouses } from '../datafoncierHousingRepository';
import ownerImporter from '../ownerImporter';
import housingImporter from '../housingImporter';
import housingOwnersImporter from '../housingOwnersImporter';
import { logger } from '../../../server/utils/logger';
import { Owners } from '../../../server/repositories/ownerRepository';
import db from '../../../server/repositories/db';

describe('Import datafoncier', () => {
  const owners = new Array(10).fill(0).map(genDatafoncierOwner);
  const houses = new Array(10).fill(0).map(genDatafoncierHousing);

  beforeEach(async () => {
    await DatafoncierOwners().insert(owners);
    await DatafoncierHouses().insert(houses);
  });

  function run(done: () => void) {
    highland([ownerImporter(), housingImporter()])
      .flatten()
      .done(() => {
        housingOwnersImporter().done(() => {
          logger.debug('Done.');
          done();
          return db.destroy();
        });
      });
  }

  it('should import owners', (done) => {
    run(() => {
      Owners()
        .select('*')
        .then((actualOwners) => {
          expect(actualOwners).toBeArrayOfSize(owners.length);
        })
        .then(done)
        .catch(done);
    });
  });
});
