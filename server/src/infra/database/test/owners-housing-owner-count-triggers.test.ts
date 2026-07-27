import { CampaignsHousing } from '~/repositories/campaignHousingRepository';
import { Campaigns } from '~/repositories/campaignRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  formatGroupApi,
  formatGroupHousingApi,
  Groups,
  GroupsHousing
} from '~/repositories/groupRepository';
import {
  formatHousingOwnerApi,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import { toUserDBO, Users } from '~/repositories/userRepository';
import { factories } from '~/test/factories';
import {
  genEstablishmentApi,
  genGroupApi,
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi,
  genUserApi
} from '~/test/testFixtures';

describe('owners_housing owner-count triggers', () => {
  it('ignores location-only updates and still handles primary-owner changes', async () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);
    const group = genGroupApi(user, establishment);
    const housing = genHousingApi();
    const owner = genOwnerApi();

    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));
    await Groups().insert(formatGroupApi(group));
    await Housing().insert(formatHousingRecordApi(housing));
    await GroupsHousing().insert(formatGroupHousingApi(group, [housing]));
    await Owners().insert(formatOwnerApi(owner));

    const campaign = await factories
      .campaign(establishment)
      .create({}, { associations: { createdBy: user } });
    await CampaignsHousing().insert({
      campaign_id: campaign.id,
      housing_id: housing.id,
      housing_geo_code: housing.geoCode
    });

    await HousingOwners().insert(
      formatHousingOwnerApi({ ...genHousingOwnerApi(housing, owner), rank: 1 })
    );
    await Campaigns().where({ id: campaign.id }).update({ owner_count: 41 });
    await Groups().where({ id: group.id }).update({ owner_count: 42 });

    const relation = {
      owner_id: owner.id,
      housing_id: housing.id,
      housing_geo_code: housing.geoCode
    };
    await HousingOwners().where(relation).update({
      locprop_distance_ban: 1_000,
      locprop_relative_ban: 2
    });

    expect(
      await Campaigns().where({ id: campaign.id }).first('owner_count')
    ).toStrictEqual({ owner_count: 41 });
    expect(
      await Groups().where({ id: group.id }).first('owner_count')
    ).toStrictEqual({ owner_count: 42 });

    await HousingOwners().where(relation).update({ rank: 2 });

    expect(
      await Campaigns().where({ id: campaign.id }).first('owner_count')
    ).toStrictEqual({ owner_count: 0 });
    expect(
      await Groups().where({ id: group.id }).first('owner_count')
    ).toStrictEqual({ owner_count: 0 });
  });
});
