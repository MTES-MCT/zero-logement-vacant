import randomstring from 'randomstring';

import { processHousingOwners } from '../housingOwnersImporter';
import {
  genDatafoncierHousing,
  genDatafoncierOwner,
} from '../../../server/test/testFixtures';
import {
  OwnerMatchDBO,
  OwnerMatches,
} from '../../../server/repositories/ownerMatchRepository';
import {
  formatOwnerApi,
  Owners,
} from '../../../server/repositories/ownerRepository';
import {
  formatHousingRecordApi,
  Housing,
} from '../../../server/repositories/housingRepository';
import {
  DatafoncierHousing,
  toHousingRecordApi,
  toOwnerApi,
} from '../../shared';
import {
  formatHousingOwnersApi,
  HousingOwners,
} from '../../../server/repositories/housingOwnerRepository';
import { DatafoncierOwners } from '../datafoncierOwnersRepository';
import fp from 'lodash/fp';

describe('Housing owners importer', () => {
  describe('processHousingOwners', () => {
    const idprocpte = randomstring.generate({ length: 11 });

    const dfOwners = new Array(6)
      .fill('0')
      .map(genDatafoncierOwner)
      .map((owner) => ({ ...owner, idprocpte }));
    const ownersApi = dfOwners.map(toOwnerApi);

    const dfHousing: DatafoncierHousing = {
      ...genDatafoncierHousing(),
      idprocpte,
    };
    const housingApi = toHousingRecordApi(dfHousing);

    it('should reject if the housing is missing', async () => {
      await expect(processHousingOwners(dfHousing)).toReject();
    });

    describe('If housing owners were not imported yet', () => {
      beforeEach(async () => {
        await DatafoncierOwners().insert(dfOwners);
        await Housing().insert(formatHousingRecordApi(housingApi));
        await Owners().insert(ownersApi.map(formatOwnerApi));
        const matches = dfOwners.map<OwnerMatchDBO>((owner, i) => ({
          owner_id: ownersApi[i].id,
          idpersonne: owner.idpersonne,
        }));
        await OwnerMatches().insert(matches);
      });

      it('should attach housing to its owners', async () => {
        await processHousingOwners(dfHousing);

        const actual = await HousingOwners().where({
          housing_geo_code: housingApi.geoCode,
          housing_id: housingApi.id,
        });
        expect(actual).toBeArrayOfSize(ownersApi.length);
      });
    });

    describe('If some housing owners were already imported', () => {
      beforeEach(async () => {
        await DatafoncierOwners().insert(dfOwners);
        await Housing().insert(formatHousingRecordApi(housingApi));
        await Owners().insert(ownersApi.map(formatOwnerApi));
        const matches = dfOwners.map<OwnerMatchDBO>((owner, i) => ({
          owner_id: ownersApi[i].id,
          idpersonne: owner.idpersonne,
        }));
        await OwnerMatches().insert(matches);
      });

      it('should reject if housing owners are different or in a different order', async () => {
        await HousingOwners().insert(
          formatHousingOwnersApi(housingApi, fp.shuffle(ownersApi))
        );

        /**
         * A - B
         * B - C
         * C - A
         */

        const actual = processHousingOwners(dfHousing);

        await expect(actual).toReject();
      });
    });
  });
});
