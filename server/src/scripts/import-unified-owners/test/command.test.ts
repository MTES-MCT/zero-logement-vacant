import { faker } from '@faker-js/faker/locale/fr';
import { beforeAll } from '@jest/globals';
import { AWAITING_OWNER_RANK } from '@zerologementvacant/models';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { OwnerApi } from '~/models/OwnerApi';
import {
  DepartmentalOwnerDBO,
  DepartmentalOwners
} from '~/repositories/departmentalOwnersRepository';
import {
  formatHousingOwnerApi,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';

import createImportUnifiedOwnersCommand from '~/scripts/import-unified-owners/command';
import {
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi
} from '~/test/testFixtures';

describe('Unified owners command', () => {
  describe('When a national owner is awaiting and a departmental owner is active', () => {
    const housing = genHousingApi();
    const nationalOwner: OwnerApi = {
      ...genOwnerApi(),
      idpersonne: undefined
    };
    const existingDepartmentalOwner: OwnerApi = {
      ...genOwnerApi(),
      idpersonne: faker.string.alphanumeric(8)
    };
    const EXISTING_DEPARTMENTAL_OWNER_RANK = 1;
    const housingOwners: ReadonlyArray<HousingOwnerApi> = [
      {
        ...genHousingOwnerApi(housing, existingDepartmentalOwner),
        rank: EXISTING_DEPARTMENTAL_OWNER_RANK
      },
      {
        ...genHousingOwnerApi(housing, nationalOwner),
        rank: AWAITING_OWNER_RANK
      }
    ];
    const match: DepartmentalOwnerDBO = {
      owner_id: nationalOwner.id,
      owner_idpersonne: existingDepartmentalOwner.idpersonne as string
    };

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housing));
      await Owners().insert(
        [nationalOwner, existingDepartmentalOwner].map(formatOwnerApi)
      );
      await DepartmentalOwners().insert(match);
      await HousingOwners().insert(housingOwners.map(formatHousingOwnerApi));

      const command = createImportUnifiedOwnersCommand();
      await command();
    });

    it('should remove the departmental housing owner', async () => {
      const actual = await HousingOwners()
        .where({ owner_id: existingDepartmentalOwner.id })
        .first();

      expect(actual).not.toBeDefined();
    });

    it('should replace the national housing owner by the previous departmental housing owner’s rank', async () => {
      const actual = await HousingOwners()
        .where({ owner_id: nationalOwner.id })
        .first();

      expect(actual!.rank).toBe(EXISTING_DEPARTMENTAL_OWNER_RANK);
    });
  });
});
