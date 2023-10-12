import { constants } from 'http2';
import request from 'supertest';
import { createServer } from '../server';
import { withAccessToken } from '../test/testUtils';
import { User1, User2 } from '../../database/seeds/test/003-users';

import { GroupApi } from '../models/GroupApi';
import {
  genCampaignApi,
  genGroupApi,
  genHousingApi,
  genOwnerApi,
  oneOf,
} from '../test/testFixtures';
import {
  Establishment1,
  Establishment2,
} from '../../database/seeds/test/001-establishments';
import {
  formatGroupApi,
  formatGroupHousingApi,
  Groups,
  GroupsHousing,
} from '../repositories/groupRepository';
import fp from 'lodash/fp';
import { GroupDTO, GroupPayloadDTO } from '../../shared/models/GroupDTO';
import {
  formatHousingRecordApi,
  Housing,
} from '../repositories/housingRepository';
import { toUserDTO } from '../models/UserApi';
import {
  formatOwnerApi,
  HousingOwnerDBO,
  Owners,
  OwnersHousing,
} from '../repositories/ownerRepository';
import { HousingStatusApi } from '../models/HousingStatusApi';
import {
  Events,
  eventsTable,
  GroupHousingEvents,
  groupHousingEventsTable,
  parseEventApi,
} from '../repositories/eventRepository';
import { EventApi } from '../models/EventApi';
import { HousingApi } from '../models/HousingApi';
import { Owner1 } from '../../database/seeds/test/004-owner';
import campaignRepository, {
  Campaigns,
} from '../repositories/campaignRepository';
import { CampaignApi } from '../models/CampaignApi';

describe('Group controller', () => {
  const { app } = createServer();

  describe('list', () => {
    const testRoute = '/api/groups';
    const groups = [
      genGroupApi(User1, Establishment1),
      genGroupApi(User1, Establishment1),
      genGroupApi(User2, Establishment2),
    ];

    beforeEach(async () => {
      await Groups().insert(groups.map(formatGroupApi));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).get(testRoute);
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it("should list housing groups in the authenticated user's establishment", async () => {
      const establishmentGroups = groups.filter(
        (group) => group.establishmentId === Establishment1.id
      );

      const { body, status } = await withAccessToken(
        request(app).get(testRoute)
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toBeArrayOfSize(establishmentGroups.length);
      const groupIds = establishmentGroups.map(fp.pick(['id']));
      expect(body).toIncludeAllPartialMembers(groupIds);
    });
  });

  describe('show', () => {
    const testRoute = (id: string): string => `/api/groups/${id}`;
    const group = genGroupApi(User1, Establishment1);
    const anotherGroup = genGroupApi(User2, Establishment2);

    beforeEach(async () => {
      await Groups().insert(formatGroupApi(group));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).get(testRoute(group.id));
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it("should be hidden for a user outside of the group's establishment", async () => {
      const { status } = await withAccessToken(
        request(app).get(testRoute(anotherGroup.id))
      );

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it("should return a housing group in the authenticated user's establishment", async () => {
      const { body, status } = await withAccessToken(
        request(app).get(testRoute(group.id))
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        id: group.id,
      });
    });
  });

  describe('create', () => {
    const testRoute = '/api/groups';
    const owner = genOwnerApi();
    const housingList = [
      genHousingApi(Establishment1.geoCodes[0]),
      genHousingApi(Establishment1.geoCodes[0]),
      genHousingApi(Establishment2.geoCodes[0]),
    ];
    const payload: GroupPayloadDTO = {
      title: 'Logements prioritaires',
      description: 'Logements les plus énergivores',
      housing: {
        all: false,
        ids: housingList.map((housing) => housing.id),
        filters: {},
      },
    };

    beforeEach(async () => {
      await Owners().insert(formatOwnerApi(owner));
      await Housing().insert(housingList.map(formatHousingRecordApi));
      const ownersHousing = housingList.map<HousingOwnerDBO>((housing) => ({
        owner_id: owner.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode,
        rank: 1,
      }));
      await OwnersHousing().insert(ownersHousing);
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).post(testRoute).send(payload).set({
        'Content-Type': 'application/json',
      });
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should create a group with all the housing belonging to the given establishment', async () => {
      const { body, status } = await withAccessToken(
        request(app).post(testRoute).send(payload).set({
          'Content-Type': 'application/json',
        })
      );

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toStrictEqual<GroupDTO>({
        id: expect.any(String),
        title: payload.title,
        description: payload.description,
        housingCount: 2,
        ownerCount: 1,
        createdAt: expect.toBeDateString(),
        createdBy: toUserDTO(User1),
        archivedAt: null,
      });
    });

    it('should create a group with all the housing corresponding to the given criteria', async () => {
      const { body, status } = await withAccessToken(
        request(app)
          .post(testRoute)
          .send({
            ...payload,
            housing: {
              all: true,
              ids: [],
              filters: {
                status: HousingStatusApi.FirstContact,
              },
            },
          } as GroupPayloadDTO)
          .set({
            'Content-Type': 'application/json',
          })
      );

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const filteredHousingList = housingList.filter(
        (housing) => housing.status === HousingStatusApi.FirstContact
      );
      const filteredOwners = fp.uniqBy(
        'id',
        filteredHousingList.map((housing) => housing.owner)
      );
      expect(body).toStrictEqual<GroupDTO>({
        id: expect.any(String),
        title: payload.title,
        description: payload.description,
        housingCount: filteredHousingList.length,
        ownerCount: filteredOwners.length,
        createdAt: expect.toBeDateString(),
        createdBy: toUserDTO(User1),
        archivedAt: null,
      });
    });

    it('should create events related to the group and its housing', async () => {
      const { body, status } = await withAccessToken(
        request(app).post(testRoute).send(payload).set({
          'Content-Type': 'application/json',
        })
      );

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const establishmentHousingList = housingList.filter((housing) =>
        Establishment1.geoCodes.includes(housing.geoCode)
      );
      const events = await Events()
        .join(
          groupHousingEventsTable,
          `${groupHousingEventsTable}.event_id`,
          `${eventsTable}.id`
        )
        .where('group_id', body.id)
        .then((events) => events.map(parseEventApi) as EventApi<GroupApi>[]);
      expect(events).toBeArrayOfSize(establishmentHousingList.length);
      expect(events).toIncludeAllPartialMembers(
        establishmentHousingList.map(() => ({
          name: 'Ajout dans un groupe',
          kind: 'Create',
          category: 'Group',
          section: 'Ajout d’un logement dans un groupe',
          conflict: false,
          createdBy: User1.id,
        }))
      );
    });
  });

  describe('update', () => {
    const testRoute = (id: string) => `/api/groups/${id}`;
    const group = genGroupApi(User1, Establishment1);
    const anotherGroup = genGroupApi(User2, Establishment2);

    const payload: Pick<GroupPayloadDTO, 'title' | 'description'> = {
      title: 'Logement prioritaires',
      description: 'Logements les plus énergivores',
    };

    beforeEach(async () => {
      await Groups().insert(formatGroupApi(group));
      await Groups().insert(formatGroupApi(anotherGroup));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app)
        .put(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json',
        });
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it("should be hidden for a user outside of the group's establishment", async () => {
      const { status } = await withAccessToken(
        request(app).put(testRoute(group.id)).send(payload).set({
          'Content-Type': 'application/json',
        }),
        User2
      );
      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should be hidden if the group has been archived', async () => {
      await Groups().where('id', group.id).update({ archived_at: new Date() });

      const { status } = await withAccessToken(
        request(app).put(testRoute(group.id)).send(payload).set({
          'Content-Type': 'application/json',
        })
      );

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should update a group', async () => {
      const { body, status } = await withAccessToken(
        request(app).put(testRoute(group.id)).send(payload).set({
          'Content-Type': 'application/json',
        })
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual<GroupDTO>({
        id: group.id,
        title: payload.title,
        description: payload.description,
        housingCount: group.housingCount,
        ownerCount: group.ownerCount,
        createdAt: expect.toBeDateString(),
        createdBy: toUserDTO(User1),
        archivedAt: group.archivedAt?.toJSON() ?? null,
      });
    });
  });

  describe('addHousing', () => {
    const testRoute = (id: string) => `/api/groups/${id}/housing`;
    const owner = genOwnerApi();
    const housingList = [
      genHousingApi(Establishment1.geoCodes[0]),
      genHousingApi(Establishment1.geoCodes[0]),
      genHousingApi(Establishment1.geoCodes[0]),
      genHousingApi(Establishment2.geoCodes[0]),
    ];
    const establishmentHousingList = housingList.filter((housing) =>
      Establishment1.geoCodes.includes(housing.geoCode)
    );
    const group = genGroupApi(User1, Establishment1);

    const payload: GroupPayloadDTO['housing'] = {
      all: false,
      ids: housingList.map((housing) => housing.id),
      filters: {},
    };

    beforeEach(async () => {
      await Owners().insert(formatOwnerApi(owner));
      await Housing().insert(housingList.map(formatHousingRecordApi));
      const ownersHousing = housingList.map<HousingOwnerDBO>((housing) => ({
        owner_id: owner.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode,
        rank: 1,
      }));
      await OwnersHousing().insert(ownersHousing);
      await Groups().insert(formatGroupApi(group));
      await GroupsHousing().insert(
        formatGroupHousingApi(group, establishmentHousingList)
      );
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app)
        .post(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json',
        });
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it("should be hidden for a user outside of the group's establishment", async () => {
      const { status } = await withAccessToken(
        request(app).post(testRoute(group.id)).send(payload).set({
          'Content-Type': 'application/json',
        }),
        User2
      );
      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should be hidden if the group has been archived', async () => {
      await Groups().where('id', group.id).update({ archived_at: new Date() });

      const { status } = await withAccessToken(
        request(app).post(testRoute(group.id)).send(payload).set({
          'Content-Type': 'application/json',
        })
      );

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should add the housing corresponding to the given criteria to the group', async () => {
      const housing = genHousingApi(oneOf(Establishment1.geoCodes));
      await Housing().insert(formatHousingRecordApi(housing));
      await OwnersHousing().insert({
        owner_id: owner.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode,
        rank: 1,
      });

      const { body, status } = await withAccessToken(
        request(app)
          .post(testRoute(group.id))
          .send({
            all: false,
            ids: [housing.id],
            filters: {},
          } as GroupPayloadDTO['housing'])
          .set({
            'Content-Type': 'application/json',
          })
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual<GroupDTO>({
        id: group.id,
        title: group.title,
        description: group.description,
        housingCount: establishmentHousingList.length + 1,
        ownerCount: 1,
        createdAt: expect.toBeDateString(),
        createdBy: toUserDTO(User1),
        archivedAt: group.archivedAt?.toJSON() ?? null,
      });
    });

    it('should create events when some housing get added', async () => {
      const housing = genHousingApi(oneOf(Establishment1.geoCodes));
      await Housing().insert(formatHousingRecordApi(housing));
      await OwnersHousing().insert({
        owner_id: owner.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode,
        rank: 1,
      });

      const { body, status } = await withAccessToken(
        request(app)
          .post(testRoute(group.id))
          .send({
            all: false,
            ids: [housing.id],
            filters: {},
          } as GroupPayloadDTO['housing'])
          .set({
            'Content-Type': 'application/json',
          })
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const events = await Events()
        .join(
          groupHousingEventsTable,
          `${groupHousingEventsTable}.event_id`,
          `${eventsTable}.id`
        )
        .where('group_id', body.id);
      expect(events).toBeArrayOfSize(1);
      expect(events).toIncludeAllPartialMembers([
        {
          name: 'Ajout dans un groupe',
          kind: 'Create',
          category: 'Group',
          section: 'Ajout d’un logement dans un groupe',
          conflict: false,
          created_by: User1.id,
        },
      ]);
    });
  });

  describe('removeHousing', () => {
    const testRoute = (id: string) => `/api/groups/${id}/housing`;
    const owner = genOwnerApi();
    const housingList = [
      genHousingApi(Establishment1.geoCodes[0]),
      genHousingApi(Establishment1.geoCodes[0]),
      genHousingApi(Establishment1.geoCodes[0]),
      genHousingApi(Establishment2.geoCodes[0]),
    ];
    const establishmentHousingList = housingList.filter((housing) =>
      Establishment1.geoCodes.includes(housing.geoCode)
    );
    const group = genGroupApi(User1, Establishment1);

    const payload: GroupPayloadDTO['housing'] = {
      all: false,
      ids: housingList.slice(2, 3).map((housing) => housing.id),
      filters: {},
    };

    beforeEach(async () => {
      await Owners().insert(formatOwnerApi(owner));
      await Housing().insert(housingList.map(formatHousingRecordApi));
      const ownersHousing = housingList.map<HousingOwnerDBO>((housing) => ({
        owner_id: owner.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode,
        rank: 1,
      }));
      await OwnersHousing().insert(ownersHousing);
      await Groups().insert(formatGroupApi(group));
      await GroupsHousing().insert(
        formatGroupHousingApi(group, establishmentHousingList)
      );
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app)
        .delete(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json',
        });
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it("should be hidden for a user outside of the group's establishment", async () => {
      const { status } = await withAccessToken(
        request(app).delete(testRoute(group.id)).send(payload).set({
          'Content-Type': 'application/json',
        }),
        User2
      );
      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should be hidden if the group has been archived', async () => {
      await Groups().where('id', group.id).update({ archived_at: new Date() });

      const { status } = await withAccessToken(
        request(app).post(testRoute(group.id)).send(payload).set({
          'Content-Type': 'application/json',
        })
      );

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should remove the housing corresponding to the given criteria to the group', async () => {
      const { body, status } = await withAccessToken(
        request(app)
          .delete(testRoute(group.id))
          .send({
            all: false,
            ids: [establishmentHousingList[0].id],
            filters: {},
          } as GroupPayloadDTO['housing'])
          .set({
            'Content-Type': 'application/json',
          })
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual<GroupDTO>({
        id: group.id,
        title: group.title,
        description: group.description,
        housingCount: establishmentHousingList.length - 1,
        ownerCount: 1,
        createdAt: expect.toBeDateString(),
        createdBy: toUserDTO(User1),
        archivedAt: group.archivedAt?.toJSON() ?? null,
      });
    });

    it('should create events when some housing get removed', async () => {
      const { body, status } = await withAccessToken(
        request(app).delete(testRoute(group.id)).send(payload).set({
          'Content-Type': 'application/json',
        })
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const events = await Events()
        .join(
          groupHousingEventsTable,
          `${groupHousingEventsTable}.event_id`,
          `${eventsTable}.id`
        )
        .where('group_id', body.id);
      expect(events).toBeArrayOfSize(payload.ids.length);
      expect(events).toIncludeAllPartialMembers(
        payload.ids.map((housingId) => ({
          name: 'Retrait d’un groupe',
          kind: 'Delete',
          category: 'Group',
          section: 'Retrait du logement d’un groupe',
          conflict: false,
          created_by: User1.id,
          housing_id: housingId,
        }))
      );
    });
  });

  describe('remove', () => {
    const testRoute = (id: string): string => `/api/groups/${id}`;
    const group: GroupApi = genGroupApi(User1, Establishment1);
    const anotherGroup: GroupApi = genGroupApi(User2, Establishment2);
    const housingList: HousingApi[] = new Array(3)
      .fill('0')
      .map(() => genHousingApi(oneOf(Establishment1.geoCodes)));

    beforeEach(async () => {
      await Groups().insert(formatGroupApi(group));
      await Housing().insert(housingList.map(formatHousingRecordApi));
      await GroupsHousing().insert(formatGroupHousingApi(group, housingList));
      const ownersHousing = housingList.map<HousingOwnerDBO>((housing) => ({
        owner_id: Owner1.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode,
        rank: 1,
      }));
      await OwnersHousing().insert(ownersHousing);
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).delete(testRoute(group.id));
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be hidden for a user outside of the establishment', async () => {
      const { status } = await withAccessToken(
        request(app).delete(testRoute(anotherGroup.id))
      );

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    describe('If a campaign was created from the group', () => {
      const campaign: CampaignApi = {
        ...genCampaignApi(Establishment1.id, 0, 0, User1.id),
        groupId: group.id,
      };

      beforeEach(async () => {
        await Campaigns().insert(
          campaignRepository.formatCampaignApi(campaign)
        );
      });

      it('should archive the group', async () => {
        const { body, status } = await withAccessToken(
          request(app).delete(testRoute(group.id))
        );

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body).toMatchObject({
          archivedAt: expect.any(String),
        });
      });

      it('should create events when the group is archived', async () => {
        const before = await GroupHousingEvents().whereNull('group_id');
        expect(before).toBeArrayOfSize(0);

        const { status } = await withAccessToken(
          request(app).delete(testRoute(group.id))
        );

        expect(status).toBe(constants.HTTP_STATUS_OK);
        const after = await GroupHousingEvents()
          .whereNull('group_id')
          .join(
            eventsTable,
            `${eventsTable}.id`,
            `${groupHousingEventsTable}.event_id`
          );
        expect(after).toBeArrayOfSize(housingList.length);
        expect(after).toSatisfyAll(
          (event) => event.section === 'Archivage d’un groupe'
        );
      });
    });

    it('should remove a group', async () => {
      const { status } = await withAccessToken(
        request(app).delete(testRoute(group.id))
      );

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
    });

    it('should create events when a group is removed', async () => {
      // TODO
    });
  });
});
