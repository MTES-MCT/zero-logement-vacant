import {
  genCampaignApi,
  genHousingApi,
  genHousingNoteApi,
} from '../../../server/test/testFixtures';
import { Establishment1 } from '../../../database/seeds/test/001-establishments';
import { User1 } from '../../../database/seeds/test/003-users';
import { cleanup } from '../merger';
import {
  Campaigns,
  formatCampaignApi,
} from '../../../server/repositories/campaignRepository';
import {
  CampaignHousingDBO,
  CampaignsHousing,
  formatCampaignHousingApi,
} from '../../../server/repositories/campaignHousingRepository';
import {
  formatHousingRecordApi,
  Housing,
} from '../../../server/repositories/housingRepository';
import {
  formatHousingNoteApi,
  formatNoteApi,
  HousingNotes,
  Notes,
} from '../../../server/repositories/noteRepository';

describe('Merger', () => {
  describe('cleanup', () => {
    it('should transfer campaigns to the merged housing', async () => {
      const [merged, ...housingList] = new Array(3)
        .fill('0')
        .map(() => genHousingApi());
      await Housing().insert(
        [merged, ...housingList].map(formatHousingRecordApi)
      );
      const campaigns = new Array(3)
        .fill('0')
        .map(() => genCampaignApi(Establishment1.id, User1.id));
      await Campaigns().insert(campaigns.map(formatCampaignApi));
      const campaignsHousing: CampaignHousingDBO[] = campaigns
        .flatMap((campaign) => formatCampaignHousingApi(campaign, housingList))
        .concat({
          campaign_id: campaigns[0].id,
          housing_geo_code: merged.geoCode,
          housing_id: merged.id,
        });
      await CampaignsHousing().insert(campaignsHousing);

      await cleanup(merged, housingList);

      const actual = await CampaignsHousing().where({
        housing_geo_code: merged.geoCode,
        housing_id: merged.id,
      });
      expect(actual).toBeArrayOfSize(campaigns.length);
    });

    it('should transfer notes to the merged housing', async () => {
      const [merged, ...housingList] = new Array(3)
        .fill('0')
        .map(() => genHousingApi());
      await Housing().insert(
        [merged, ...housingList].map(formatHousingRecordApi)
      );
      const notes = [merged, ...housingList].map((housing) =>
        genHousingNoteApi(User1, housing)
      );
      await Notes().insert(notes.map(formatNoteApi));
      await HousingNotes().insert(notes.map(formatHousingNoteApi));

      await cleanup(merged, housingList);

      const actual = await HousingNotes().where({
        housing_geo_code: merged.geoCode,
        housing_id: merged.id,
      });
      expect(actual).toBeArrayOfSize(notes.length);
    });
  });
});
