import {
  genCampaignApi,
  genGroupApi,
  genGroupHousingEventApi,
  genHousingApi,
  genHousingEventApi,
  genHousingNoteApi,
} from '../../../server/test/testFixtures';
import { Establishment1 } from '../../../database/seeds/test/001-establishments';
import { User1 } from '../../../database/seeds/test/003-users';
import merger, { cleanup } from '../merger';
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
import {
  Events,
  formatEventApi,
  formatGroupHousingEventApi,
  formatHousingEventApi,
  GroupHousingEvents,
  HousingEvents,
} from '../../../server/repositories/eventRepository';
import {
  formatGroupApi,
  formatGroupHousingApi,
  Groups,
  GroupsHousing,
} from '../../../server/repositories/groupRepository';
import highland from 'highland';
import { HousingApi } from '../../../server/models/HousingApi';

describe('Merger', () => {
  describe('merge', () => {
    function createHousing(data: Partial<HousingApi>): HousingApi {
      return { ...genHousingApi(), ...data };
    }

    it('should merge the data years', async () => {
      const housingList: HousingApi[] = [
        createHousing({ dataYears: [2022, 2021] }),
        createHousing({ dataYears: [2022, 2023] }),
      ];
      const stream = highland<HousingApi[]>([housingList]);

      const actual = await stream.through(merger.merge()).toPromise(Promise);

      expect(actual).toHaveProperty('dataYears', [2023, 2022, 2021]);
    });

    it('should merge the mutation date', async () => {
      const housingList: HousingApi[] = [
        createHousing({
          dataYears: [2022],
          mutationDate: new Date('2021-01-01'),
        }),
        createHousing({
          dataYears: [2022],
          mutationDate: null,
        }),
        createHousing({
          dataYears: [2022],
          mutationDate: new Date('2022-01-01'),
        }),
      ];
      const stream = highland<HousingApi[]>([housingList]);

      const actual = await stream.through(merger.merge()).toPromise(Promise);

      expect(actual).toHaveProperty('mutationDate', new Date('2022-01-01'));
    });
  });

  describe('cleanup', () => {
    it('should transfer campaigns to the merged housing', async () => {
      const housingList = new Array(3).fill('0').map(() => genHousingApi());
      const [merged] = housingList;
      await Housing().insert(housingList.map(formatHousingRecordApi));
      const campaigns = new Array(3)
        .fill('0')
        .map(() => genCampaignApi(Establishment1.id, User1.id));
      await Campaigns().insert(campaigns.map(formatCampaignApi));
      const campaignsHousing: CampaignHousingDBO[] = campaigns
        .flatMap((campaign) =>
          formatCampaignHousingApi(campaign, housingList.slice(1))
        )
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

    it('should transfer events to the merged housing', async () => {
      const housingList = new Array(3).fill('0').map(() => genHousingApi());
      const [merged] = housingList;
      await Housing().insert(housingList.map(formatHousingRecordApi));
      const events = housingList.map((housing) =>
        genHousingEventApi(housing, User1)
      );
      await Events().insert(events.map(formatEventApi));
      await HousingEvents().insert(events.map(formatHousingEventApi));

      await cleanup(merged, housingList);

      const actual = await HousingEvents().where({
        housing_geo_code: merged.geoCode,
        housing_id: merged.id,
      });
      expect(actual).toBeArrayOfSize(events.length);
    });

    it('should transfer notes to the merged housing', async () => {
      const housingList = new Array(3).fill('0').map(() => genHousingApi());
      const [merged] = housingList;
      await Housing().insert(housingList.map(formatHousingRecordApi));
      const notes = housingList.map((housing) =>
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

    it('should transfer groups to the merged housing', async () => {
      const housingList = new Array(3).fill('0').map(() => genHousingApi());
      const [merged] = housingList;
      await Housing().insert(housingList.map(formatHousingRecordApi));
      const groups = housingList.map(() => genGroupApi(User1, Establishment1));
      await Groups().insert(groups.map(formatGroupApi));
      await GroupsHousing().insert(
        groups.flatMap((group) => formatGroupHousingApi(group, housingList))
      );

      await cleanup(merged, housingList);

      const actual = await GroupsHousing().where({
        housing_geo_code: merged.geoCode,
        housing_id: merged.id,
      });
      expect(actual).toBeArrayOfSize(groups.length);
    });

    it('should transfer group events to the merged housing', async () => {
      const housingList = new Array(3).fill('0').map(() => genHousingApi());
      const [merged] = housingList;
      await Housing().insert(housingList.map(formatHousingRecordApi));
      const groups = housingList.map(() => genGroupApi(User1, Establishment1));
      await Groups().insert(groups.map(formatGroupApi));
      const events = housingList.flatMap((housing) => {
        return groups.map((group) =>
          genGroupHousingEventApi(housing, group, User1)
        );
      });
      await Events().insert(events.map(formatEventApi));
      await GroupHousingEvents().insert(events.map(formatGroupHousingEventApi));

      await cleanup(merged, housingList);

      const actual = await GroupHousingEvents().where({
        housing_geo_code: merged.geoCode,
        housing_id: merged.id,
      });
      expect(actual).toBeArrayOfSize(events.length);
    });
  });
});
