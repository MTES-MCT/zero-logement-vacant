import { DatafoncierHousing } from '@zerologementvacant/models';
import { HousingApi } from '~/models/HousingApi';
import { OwnerApi } from '~/models/OwnerApi';
import {
  HousingOwnerConflictRecordDBO,
  HousingOwnerConflicts
} from '~/repositories/conflict/housingOwnerConflictRepository';
import { DatafoncierHouses } from '~/repositories/datafoncierHousingRepository';
import { DatafoncierOwners } from '~/repositories/datafoncierOwnersRepository';
import {
  formatHousingOwnersApi,
  HousingOwnerDBO,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import {
  OwnerMatchDBO,
  OwnerMatches
} from '~/repositories/ownerMatchRepository';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import {
  genDatafoncierHousing,
  genDatafoncierOwner,
  genHousingApi,
  genOwnerApi
} from '~/test/testFixtures';
import { DatafoncierOwner } from '../../shared';
import { processHousing } from '../existingHousingOwnersImporter';

describe('Import housing owners from existing housing', () => {
  describe('processHousing', () => {
    let housing: HousingApi;
    let datafoncierHousing: DatafoncierHousing;
    let datafoncierOwners: DatafoncierOwner[];
    let owners: OwnerApi[];

    beforeEach(async () => {
      housing = genHousingApi();
      datafoncierHousing = {
        ...genDatafoncierHousing(),
        idlocal: housing.localId,
        ccthp: 'L',
        dteloctxt: 'APPARTEMENT'
      };
      datafoncierOwners = Array.from({ length: 6 }, () =>
        genDatafoncierOwner()
      ).map((owner, i) => ({
        ...owner,
        idprocpte: datafoncierHousing.idprocpte,
        dnulp: (i + 1).toString()
      }));
      owners = Array.from({ length: 6 }, () => genOwnerApi());

      await DatafoncierHouses().insert(datafoncierHousing);
      await DatafoncierOwners().insert(datafoncierOwners);
      await Housing().insert(formatHousingRecordApi(housing));
      await Owners().insert(owners.map(formatOwnerApi));
      const matches: OwnerMatchDBO[] = owners.map((owner, i) => ({
        owner_id: owner.id,
        idpersonne: datafoncierOwners[i].idpersonne
      }));
      await OwnerMatches().insert(matches);
    });

    it('should save datafoncier housing owners if the housing was just created', async () => {
      await processHousing(housing);

      const actualHousingOwners = await HousingOwners().where({
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      });
      const members = owners.map<HousingOwnerDBO>((owner, i) => ({
        housing_geo_code: housing.geoCode,
        housing_id: housing.id,
        owner_id: owner.id,
        rank: i + 1,
        start_date: expect.any(Date),
        end_date: null,
        origin: null,
        idprocpte: null,
        idprodroit: null,
        locprop_source: null
      }));
      expect(actualHousingOwners).toIncludeSameMembers(members);
    });

    it('should not create any conflict if housing owners are the same', async () => {
      await HousingOwners().insert(formatHousingOwnersApi(housing, owners));

      await processHousing(housing);

      const actual = await HousingOwnerConflicts().where({
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      });
      expect(actual).toBeArrayOfSize(0);
    });

    it('should create conflicts if housing owners are different', async () => {
      const slice = owners.slice(0, 3);
      await HousingOwners().insert(formatHousingOwnersApi(housing, slice));

      await processHousing(housing);

      const actual = await HousingOwnerConflicts().where({
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      });
      const members: HousingOwnerConflictRecordDBO[] = owners
        .slice(3, owners.length)
        .map((owner) => ({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id,
          conflict_id: expect.any(String),
          existing_owner_id: null,
          replacement_owner_id: owner.id
        }));
      expect(actual).toBeArrayOfSize(owners.length - slice.length);
      expect(actual).toIncludeSameMembers(members);
    });
  });
});
