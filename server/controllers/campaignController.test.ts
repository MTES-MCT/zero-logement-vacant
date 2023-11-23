import { CampaignsHousing, campaignsHousingTable } from '../repositories/campaignHousingRepository';
import db from '../repositories/db';
import { campaignsTable } from '../repositories/campaignRepository';
import request from 'supertest';
import { withAccessToken } from '../test/testUtils';
import { constants } from 'http2';
import { Establishment1 } from '../../database/seeds/test/001-establishments';
import { Housing0, Housing1, Housing2 } from '../../database/seeds/test/005-housing';
import { Campaign1 } from '../../database/seeds/test/006-campaigns';
import { campaignEventsTable, HousingEvents } from '../repositories/eventRepository';
import { CampaignApi, CampaignSteps } from '../models/CampaignApi';
import { HousingStatusApi } from '../models/HousingStatusApi';
import { formatISO } from 'date-fns';
import { formatHousingRecordApi, Housing, housingTable } from '../repositories/housingRepository';
import randomstring from 'randomstring';
import { v4 as uuidv4 } from 'uuid';
import { createServer } from '../server';
import { formatGroupApi, formatGroupHousingApi, Groups, GroupsHousing } from '../repositories/groupRepository';
import { genGroupApi, genHousingApi, genNumber } from '../test/testFixtures';
import { User1 } from '../../database/seeds/test/003-users';
import { formatOwnerApi, Owners } from '../repositories/ownerRepository';
import { formatOwnerHousingApi, HousingOwners } from '../repositories/housingOwnerRepository';
import { isDefined } from '../../shared';
import { wait } from '@hapi/hoek';

const { app } = createServer();

describe('Campaign controller', () => {
  describe('getCampaignBundle', () => {
    const testRoute = (campaignId: string) => `/api/campaigns/${campaignId}`;

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .get(testRoute(Campaign1.id))
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid campaign id', async () => {
      await withAccessToken(request(app).get(testRoute('id'))).expect(
        constants.HTTP_STATUS_BAD_REQUEST
      );
    });

    it('should return an error when there is no campaign with the required id', async () => {
      await withAccessToken(request(app).get(testRoute(uuidv4()))).expect(
        constants.HTTP_STATUS_NOT_FOUND
      );
    });

    it('should return the campaign', async () => {
      const res = await withAccessToken(
        request(app).get(testRoute(Campaign1.id))
      ).expect(constants.HTTP_STATUS_OK);

      expect(res.body).toMatchObject(
        expect.objectContaining({
          id: Campaign1.id,
          filters: expect.objectContaining(Campaign1.filters),
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
            id: Campaign1.id,
          }),
        ])
      );
    });
  });

  describe('createCampaign', () => {
    const testRoute = '/api/campaigns';

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .post(testRoute)
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should create a new campaign', async () => {
      const campaignTitle = randomstring.generate();
      const res = await withAccessToken(request(app).post(testRoute))
        .send({
          draftCampaign: {
            filters: {},
            title: campaignTitle,
          },
          housingIds: [Housing1.id, Housing2.id],
          allHousing: false,
        })
        .expect(constants.HTTP_STATUS_CREATED);

      expect(res.body).toMatchObject(
        expect.objectContaining({
          title: campaignTitle,
        })
      );

      await db(campaignsTable)
        .where('establishment_id', Establishment1.id)
        .then((result) => {
          expect(result).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                title: campaignTitle,
              }),
            ])
          );
        });

      await db(campaignsHousingTable)
        .join(campaignsTable, 'campaign_id', 'id')
        .where('establishment_id', Establishment1.id)
        .andWhere('title', campaignTitle)
        .then((result) => {
          expect(result).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ housing_id: Housing1.id }),
              expect.objectContaining({ housing_id: Housing2.id }),
            ])
          );
        });
    });
  });

  describe('createCampaignFromGroup', () => {
    const testRoute = (id: string) => `/api/campaigns/groups/${id}`;

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
      await wait(1000);
      const housingIds = groupHousing.map((housing) => housing.id);
      const housingEvents = await HousingEvents().whereIn(
        'housing_id',
        housingIds
      );
      expect(housingEvents).toBeArrayOfSize(groupHousing.length);
    });
  });

  describe('update campaign', () => {
    const testRoute = (campaignId: string) => `/api/campaigns/${campaignId}`;

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .put(testRoute(Campaign1.id))
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid campaign id', async () => {
      await withAccessToken(
        request(app)
          .put(testRoute(randomstring.generate()))
          .send({ stepUpdate: { step: CampaignSteps.OwnersValidation } })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);

      await withAccessToken(
        request(app)
          .put(testRoute(uuidv4()))
          .send({ stepUpdate: { step: CampaignSteps.OwnersValidation } })
      ).expect(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should received a valid request', async () => {
      const badRequestTest = async (payload?: Record<string, unknown>) => {
        await withAccessToken(
          request(app)
            .put(testRoute(Campaign1.id))
            .send(payload)
            .expect(constants.HTTP_STATUS_BAD_REQUEST)
        );
      };

      await badRequestTest({
        titleUpdate: {},
      });
      await badRequestTest({
        titleUpdate: {
          title: genNumber(),
        },
      });
      await badRequestTest({
        stepUpdate: {},
      });
      await badRequestTest({
        stepUpdate: {
          step: 15,
        },
      });
      await badRequestTest({
        stepUpdate: {
          step: CampaignSteps.Sending,
        },
      });
      await badRequestTest({
        stepUpdate: {
          step: CampaignSteps.Sending,
          sendingDate: randomstring.generate(),
        },
      });
    });

    it('should update the campaign title', async () => {
      const newTitle = randomstring.generate();
      await withAccessToken(
        request(app)
          .put(testRoute(Campaign1.id))
          .send({
            titleUpdate: {
              title: newTitle,
            },
          })
      ).expect(constants.HTTP_STATUS_OK);

      await db(campaignsTable)
        .where('id', Campaign1.id)
        .first()
        .then((result) =>
          expect(result).toMatchObject(
            expect.objectContaining({
              id: Campaign1.id,
              title: newTitle,
            })
          )
        );
    });

    it('should update the campaign when validating step OwnersValidation', async () => {
      await withAccessToken(
        request(app)
          .put(testRoute(Campaign1.id))
          .send({
            stepUpdate: {
              step: CampaignSteps.OwnersValidation,
            },
          })
      ).expect(constants.HTTP_STATUS_OK);

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
      await withAccessToken(
        request(app)
          .put(testRoute(Campaign1.id))
          .send({
            stepUpdate: {
              step: CampaignSteps.Export,
            },
          })
      ).expect(constants.HTTP_STATUS_OK);

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

      await withAccessToken(
        request(app)
          .put(testRoute(Campaign1.id))
          .send({
            stepUpdate: {
              step: CampaignSteps.Sending,
              sendingDate: formatISO(new Date()),
            },
          })
      ).expect(constants.HTTP_STATUS_OK);

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
      await withAccessToken(
        request(app)
          .put(testRoute(Campaign1.id))
          .send({
            stepUpdate: {
              step: CampaignSteps.Confirmation,
            },
          })
      ).expect(constants.HTTP_STATUS_OK);

      const actual = await db(campaignsTable).where('id', Campaign1.id).first();
      expect(actual).toMatchObject({
        id: Campaign1.id,
        confirmed_at: expect.any(Date),
      });
    });
  });

  describe('deleteCampaign', () => {
    const testRoute = (campaignId: any) => `/api/campaigns/${campaignId}`;

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .delete(testRoute(Campaign1.id))
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid campaign id', async () => {
      await withAccessToken(request(app).delete(testRoute('id'))).expect(
        constants.HTTP_STATUS_BAD_REQUEST
      );
    });

    it('should delete linked events and campaign housing', async () => {
      await withAccessToken(
        request(app).delete(testRoute(Campaign1.id))
      ).expect(constants.HTTP_STATUS_NO_CONTENT);

      await db(campaignsTable)
        .where('establishment_id', Establishment1.id)
        .andWhere('id', Campaign1.id)
        .then((result) => {
          expect(result).toEqual([]);
        });

      await db(campaignsHousingTable)
        .join(campaignsTable, 'campaign_id', 'id')
        .where('establishment_id', Establishment1.id)
        .andWhere('id', Campaign1.id)
        .then((result) => {
          expect(result).toEqual([]);
        });

      await db(campaignEventsTable)
        .join(campaignsTable, 'campaign_id', `${campaignsTable}.id`)
        .where('establishment_id', Establishment1.id)
        .andWhere('id', Campaign1.id)
        .then((result) => {
          expect(result).toEqual([]);
        });
    });

    it('should set status never contacted for waiting housing without anymore campaigns', async () => {
      await withAccessToken(
        request(app).delete(testRoute(Campaign1.id))
      ).expect(constants.HTTP_STATUS_NO_CONTENT);

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
  });
});
