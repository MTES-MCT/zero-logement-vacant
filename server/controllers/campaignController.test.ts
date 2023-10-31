import {
  CampaignsHousing,
  campaignsHousingTable,
} from '../repositories/campaignHousingRepository';
import db from '../repositories/db';
import { campaignsTable } from '../repositories/campaignRepository';
import request from 'supertest';
import { withAccessToken } from '../test/testUtils';
import { constants } from 'http2';
import { Establishment1 } from '../../database/seeds/test/001-establishments';
import {
  Housing0,
  Housing1,
  Housing2,
} from '../../database/seeds/test/005-housing';
import { Campaign1 } from '../../database/seeds/test/006-campaigns';
import {
  campaignEventsTable,
  HousingEvents,
} from '../repositories/eventRepository';
import {
  CampaignApi,
  CampaignKinds,
  CampaignSteps,
} from '../models/CampaignApi';
import { HousingStatusApi } from '../models/HousingStatusApi';
import { formatISO } from 'date-fns';
import {
  formatHousingRecordApi,
  Housing,
  housingTable,
} from '../repositories/housingRepository';
import randomstring from 'randomstring';
import { v4 as uuidv4 } from 'uuid';
import { createServer } from '../server';
import {
  formatGroupApi,
  formatGroupHousingApi,
  Groups,
  GroupsHousing,
} from '../repositories/groupRepository';
import { genGroupApi, genHousingApi } from '../test/testFixtures';
import { User1 } from '../../database/seeds/test/003-users';
import { formatOwnerApi, Owners } from '../repositories/ownerRepository';
import {
  formatOwnerHousingApi,
  HousingOwners,
} from '../repositories/housingOwnerRepository';
import { isDefined } from '../../shared';

const { app } = createServer();

describe('Campaign controller', () => {
  describe('getCampaignBundle', () => {
    const testRoute = (campaignNumber?: any, reminderNumber?: any) =>
      `/api/campaigns/bundles/number${
        campaignNumber
          ? '/' +
            campaignNumber +
            (reminderNumber !== undefined ? '/' + reminderNumber : '')
          : ''
      }`;

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .get(testRoute(Campaign1.campaignNumber, Campaign1.reminderNumber))
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid campaign number', async () => {
      await withAccessToken(request(app).get(testRoute('number'))).expect(
        constants.HTTP_STATUS_BAD_REQUEST
      );

      await withAccessToken(
        request(app).get(testRoute(Campaign1.campaignNumber, 'number'))
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should return an error when there is no campaign bundle with the required ids', async () => {
      await withAccessToken(request(app).get(testRoute(999))).expect(
        constants.HTTP_STATUS_NOT_FOUND
      );
    });

    it('should return the campaign bundle for the required ids', async () => {
      const res = await withAccessToken(
        request(app).get(
          testRoute(Campaign1.campaignNumber, Campaign1.reminderNumber)
        )
      ).expect(constants.HTTP_STATUS_OK);

      expect(res.body).toMatchObject(
        expect.objectContaining({
          campaignIds: [Campaign1.id],
          campaignNumber: Campaign1.campaignNumber,
          reminderNumber: Campaign1.reminderNumber,
          filters: expect.objectContaining(Campaign1.filters),
        })
      );
    });

    it('should return the global campaign bundle', async () => {
      const res = await withAccessToken(request(app).get(testRoute())).expect(
        constants.HTTP_STATUS_OK
      );

      expect(res.body).toMatchObject(
        expect.objectContaining({
          campaignIds: expect.arrayContaining([Campaign1.id]),
          housingCount: 2,
        })
      );
    });
  });

  describe('listCampaigns', () => {
    const testRoute = '/api/campaigns';

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .get(testRoute)
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should list campaigns', async () => {
      const res = await withAccessToken(request(app).get(testRoute)).expect(
        constants.HTTP_STATUS_OK
      );

      expect(res.body).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            campaignNumber: Campaign1.campaignNumber,
            reminderNumber: Campaign1.reminderNumber,
          }),
        ])
      );
    });
  });

  describe('listCampaignBundles', () => {
    const testRoute = '/api/campaigns/bundles';

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .get(testRoute)
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should list campaign bundles', async () => {
      const res = await withAccessToken(request(app).get(testRoute)).expect(
        constants.HTTP_STATUS_OK
      );

      expect(res.body).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            campaignIds: [Campaign1.id],
            campaignNumber: Campaign1.campaignNumber,
          }),
        ])
      );
    });
  });

  describe('createCampaign', () => {
    const testRoute = '/api/campaigns/creation';

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .post(testRoute)
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should create a new campaign', async () => {
      const res = await withAccessToken(request(app).post(testRoute))
        .send({
          draftCampaign: {
            reminderNumber: 0,
            filters: {},
          },
          housingIds: [Housing1.id, Housing2.id],
        })
        .expect(constants.HTTP_STATUS_OK);

      expect(res.body).toMatchObject(
        expect.objectContaining({
          reminderNumber: 0,
        })
      );

      await db(campaignsTable)
        .where('establishment_id', Establishment1.id)
        .andWhere('campaign_number', '2')
        .then((result) => {
          expect(result[0]).toEqual(
            expect.objectContaining({
              campaign_number: 2,
              reminder_number: 0,
            })
          );
        });

      await db(campaignsHousingTable)
        .join(campaignsTable, 'campaign_id', 'id')
        .where('establishment_id', Establishment1.id)
        .andWhere('campaign_number', 2)
        .then((result) => {
          expect(result).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ housing_id: Housing1.id }),
              expect.objectContaining({ housing_id: Housing2.id }),
            ])
          );
        });
    });

    it('should remove housing from default campaign', async () => {
      await withAccessToken(request(app).post(testRoute))
        .send({
          draftCampaign: {
            reminderNumber: 0,
            filters: {},
          },
          housingIds: [Housing0.id],
        })
        .expect(constants.HTTP_STATUS_OK);

      await db(campaignsHousingTable)
        .join(campaignsTable, 'campaign_id', 'id')
        .where('establishment_id', Establishment1.id)
        .andWhere('campaign_number', 0)
        .then((result) => {
          expect(result).toEqual(
            expect.not.arrayContaining([
              expect.objectContaining({ housing_id: Housing0.id }),
            ])
          );
        });
    });
  });

  describe('createCampaignFromGroup', () => {
    const testRoute = (id: string) => `/api/groups/${id}/campaigns`;

    const geoCode = Establishment1.geoCodes[0];
    const group = genGroupApi(User1, Establishment1);
    const groupHousing = [
      genHousingApi(geoCode),
      genHousingApi(geoCode),
      genHousingApi(geoCode),
    ];
    const owners = groupHousing
      .map((housing) => housing.owner)
      .filter(isDefined);

    beforeEach(async () => {
      await Groups().insert(formatGroupApi(group));
      await Housing().insert(groupHousing.map(formatHousingRecordApi));
      await Owners().insert(owners.map(formatOwnerApi));
      await HousingOwners().insert(groupHousing.map(formatOwnerHousingApi));
      await GroupsHousing().insert(formatGroupHousingApi(group, groupHousing));
    });

    it('should throw if the group is missing', async () => {
      const { status } = await withAccessToken(
        request(app)
          .post(testRoute(uuidv4()))
          .send({
            title: 'Campagne prioritaire',
          })
          .set({
            'Content-Type': 'application/json',
          })
      );

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should throw if the group has been archived', async () => {
      await Groups().where('id', group.id).update({ archived_at: new Date() });

      const { status } = await withAccessToken(
        request(app)
          .post(testRoute(group.id))
          .send({
            title: 'Campagne prioritaire',
          })
          .set({
            'Content-Type': 'application/json',
          })
      );

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should create the campaign', async () => {
      const { body, status } = await withAccessToken(
        request(app).post(testRoute(group.id)).send({
          title: 'Logements prioritaires',
          groupId: group.id,
        })
      );

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toStrictEqual<CampaignApi>({
        id: expect.any(String),
        groupId: group.id,
        title: 'Logements prioritaires',
        establishmentId: Establishment1.id,
        filters: {
          groupIds: [group.id],
        },
        createdAt: expect.toBeDateString(),
        createdBy: User1.id,
        campaignNumber: expect.any(Number),
        reminderNumber: 0,
        kind: CampaignKinds.Initial,
        validatedAt: expect.toBeDateString(),
      });
    });

    it("should add the group's housing to this campaign", async () => {
      const { body, status } = await withAccessToken(
        request(app).post(testRoute(group.id)).send({
          title: 'Logements prioritaires',
        })
      );

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const campaignHousing = await CampaignsHousing().where(
        'campaign_id',
        body.id
      );
      expect(campaignHousing).toIncludeAllPartialMembers(
        groupHousing.map((housing) => ({ housing_id: housing.id }))
      );
    });

    it('should create campaign events', async () => {
      const { status } = await withAccessToken(
        request(app).post(testRoute(group.id)).send({
          title: 'Logements prioritaires',
        })
      );

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const housingIds = groupHousing.map((housing) => housing.id);
      const housingEvents = await HousingEvents().whereIn(
        'housing_id',
        housingIds
      );
      expect(housingEvents).toBeArrayOfSize(groupHousing.length);
    });
  });

  describe('validateStep', () => {
    const testRoute = (campaignId: string) => `/api/campaigns/${campaignId}`;

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .put(testRoute(Campaign1.id))
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid campaign id', async () => {
      await withAccessToken(
        request(app).put(testRoute(randomstring.generate()))
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);

      await withAccessToken(
        request(app)
          .put(testRoute(uuidv4()))
          .send({ step: CampaignSteps.OwnersValidation })
      ).expect(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should received a valid step', async () => {
      await withAccessToken(
        request(app).put(testRoute(Campaign1.id)).send({})
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);

      await withAccessToken(
        request(app).put(testRoute(Campaign1.id)).send({ step: 15 })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should received a valid sending date on sending step', async () => {
      await withAccessToken(
        request(app)
          .put(testRoute(Campaign1.id))
          .send({ step: CampaignSteps.Sending })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should update the campaign when validating step OwnersValidation', async () => {
      const res = await withAccessToken(
        request(app)
          .put(testRoute(Campaign1.id))
          .send({ step: CampaignSteps.OwnersValidation })
      ).expect(constants.HTTP_STATUS_OK);

      expect(res.body).toMatchObject(
        expect.objectContaining({
          id: Campaign1.id,
          validatedAt: expect.anything(),
          exportedAt: null,
          sentAt: null,
        })
      );

      await db(campaignsTable)
        .where('id', Campaign1.id)
        .first()
        .then((result) =>
          expect(result).toMatchObject(
            expect.objectContaining({
              id: Campaign1.id,
              validated_at: expect.anything(),
              exported_at: null,
              sent_at: null,
            })
          )
        );
    });

    it('should update the campaign when validating step Export', async () => {
      const res = await withAccessToken(
        request(app)
          .put(testRoute(Campaign1.id))
          .send({ step: CampaignSteps.Export })
      ).expect(constants.HTTP_STATUS_OK);

      expect(res.body).toMatchObject(
        expect.objectContaining({
          id: Campaign1.id,
          exportedAt: expect.anything(),
          sentAt: null,
        })
      );

      await db(campaignsTable)
        .where('id', Campaign1.id)
        .first()
        .then((result) =>
          expect(result).toMatchObject(
            expect.objectContaining({
              id: Campaign1.id,
              exported_at: expect.anything(),
              sent_at: null,
            })
          )
        );
    });

    it('should update the campaign when validating step Sending and update housing status if needed', async () => {
      await db(campaignsHousingTable).insert([
        {
          campaign_id: Campaign1.id,
          housing_id: Housing0.id,
          housing_geo_code: Housing0.geoCode,
        },
        {
          campaign_id: Campaign1.id,
          housing_id: Housing2.id,
          housing_geo_code: Housing2.geoCode,
        },
      ]);
      await db(housingTable)
        .update({ status: HousingStatusApi.NeverContacted })
        .where('id', Housing1.id)
        .where('geo_code', Housing1.geoCode);
      await db(housingTable)
        .update({ status: HousingStatusApi.InProgress })
        .where('id', Housing2.id)
        .where('geo_code', Housing2.geoCode);

      const res = await withAccessToken(
        request(app)
          .put(testRoute(Campaign1.id))
          .send({
            step: CampaignSteps.Sending,
            sendingDate: formatISO(new Date()),
          })
      ).expect(constants.HTTP_STATUS_OK);

      expect(res.body).toMatchObject(
        expect.objectContaining({
          id: Campaign1.id,
          sentAt: expect.any(String),
          sendingDate: expect.any(String),
        })
      );

      await db(campaignsTable)
        .where('id', Campaign1.id)
        .first()
        .then((result) =>
          expect(result).toMatchObject(
            expect.objectContaining({
              id: Campaign1.id,
              sent_at: expect.anything(),
              sending_date: expect.anything(),
            })
          )
        );

      await db(housingTable)
        .where('id', Housing0.id)
        .first()
        .then((result) => expect(result.status).toBe(HousingStatusApi.Waiting));

      await db(housingTable)
        .where('id', Housing1.id)
        .first()
        .then((result) => expect(result.status).toBe(HousingStatusApi.Waiting));

      await db(housingTable)
        .where('id', Housing2.id)
        .first()
        .then((result) =>
          expect(result.status).toBe(HousingStatusApi.InProgress)
        );
    });

    it('should update the campaign when validating step Confirmation', async () => {
      const { body, status } = await withAccessToken(
        request(app)
          .put(testRoute(Campaign1.id))
          .send({ step: CampaignSteps.Confirmation })
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        id: Campaign1.id,
        confirmedAt: expect.any(String),
      });

      const actual = await db(campaignsTable).where('id', Campaign1.id).first();
      expect(actual).toMatchObject({
        id: Campaign1.id,
        confirmed_at: expect.any(Date),
      });
    });
  });

  describe('deleteCampaignBundle', () => {
    const testRoute = (campaignNumber?: any, reminderNumber?: any) =>
      `/api/campaigns/bundles/number${
        campaignNumber
          ? '/' +
            campaignNumber +
            (reminderNumber !== undefined ? '/' + reminderNumber : '')
          : ''
      }`;

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .delete(testRoute(Campaign1.campaignNumber, Campaign1.reminderNumber))
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid campaign number', async () => {
      await withAccessToken(request(app).delete(testRoute())).expect(
        constants.HTTP_STATUS_NOT_FOUND
      );

      await withAccessToken(request(app).delete(testRoute('number'))).expect(
        constants.HTTP_STATUS_BAD_REQUEST
      );

      await withAccessToken(
        request(app).delete(testRoute(Campaign1.campaignNumber, 'number'))
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should delete linked campaigns, events and campaign housing', async () => {
      await withAccessToken(
        request(app).delete(testRoute(Campaign1.campaignNumber))
      ).expect(constants.HTTP_STATUS_OK);

      await db(campaignsTable)
        .where('establishment_id', Establishment1.id)
        .andWhere('campaign_number', '1')
        .then((result) => {
          expect(result).toEqual([]);
        });

      await db(campaignsHousingTable)
        .join(campaignsTable, 'campaign_id', 'id')
        .where('establishment_id', Establishment1.id)
        .andWhere('campaign_number', '1')
        .then((result) => {
          expect(result).toEqual([]);
        });

      await db(campaignEventsTable)
        .join(campaignsTable, 'campaign_id', `${campaignsTable}.id`)
        .where('establishment_id', Establishment1.id)
        .andWhere('campaign_number', '1')
        .then((result) => {
          expect(result).toEqual([]);
        });
    });

    it('should set status never contacted for waiting housing without anymore campaigns', async () => {
      await withAccessToken(
        request(app).delete(testRoute(Campaign1.campaignNumber))
      ).expect(constants.HTTP_STATUS_OK);

      await db(housingTable)
        .where('id', Housing1.id)
        .first()
        .then((result) => {
          expect(result).toMatchObject(
            expect.objectContaining({
              id: Housing1.id,
              status: HousingStatusApi.NeverContacted,
              sub_status: null,
            })
          );
        });
    });

    it('should add in default campaigns non waiting housing without anymore campaigns', async () => {
      await db(housingTable)
        .update({ status: HousingStatusApi.InProgress })
        .where('id', Housing1.id);

      await withAccessToken(
        request(app).delete(testRoute(Campaign1.campaignNumber))
      ).expect(constants.HTTP_STATUS_OK);

      await db(housingTable)
        .where('id', Housing1.id)
        .first()
        .then((result) => {
          expect(result).toMatchObject(
            expect.objectContaining({
              id: Housing1.id,
              status: HousingStatusApi.InProgress,
            })
          );
        });

      await db(campaignsHousingTable)
        .join(campaignsTable, 'campaign_id', 'id')
        .where('establishment_id', Establishment1.id)
        .andWhere('campaign_number', '0')
        .andWhere('housing_id', Housing1.id)
        .first()
        .then((result) => {
          expect(result).toMatchObject(
            expect.objectContaining({ housing_id: Housing1.id })
          );
        });
    });
  });
});
