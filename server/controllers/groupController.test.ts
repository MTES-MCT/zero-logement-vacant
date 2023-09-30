import { constants } from 'http2';
import request from 'supertest';
import { createServer } from '../server';
import { withAccessToken } from '../test/testUtils';
import { User1, User2 } from '../../database/seeds/test/003-users';

import { GroupApi } from '../models/GroupApi';
import { genGroupApi, genHousingApi, genOwnerApi } from '../test/testFixtures';
import {
  Establishment1,
  Establishment2,
} from '../../database/seeds/test/001-establishments';
import { formatGroupApi, Groups } from '../repositories/groupRepository';
import fp from 'lodash/fp';
import { GroupDTO, GroupPayload } from '../../shared/models/GroupDTO';
import {
  formatHousingRecordApi,
  Housing,
  OwnersHousing,
} from '../repositories/housingRepository';
import { toUserDTO } from '../models/UserApi';
import {
  formatOwnerApi,
  HousingOwnerDBO,
  Owners,
} from '../repositories/ownerRepository';

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
    const payload: GroupPayload = {
      title: 'Logements prioritaires',
      description: 'Logements les plus énergivores',
      housingIds: housingList.map((housing) => housing.id),
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
      });
    });
  });

  describe('update', () => {
    const testRoute = (id: string) => `/api/groups/${id}`;
    const owner = genOwnerApi();
    const housingList = [
      genHousingApi(Establishment1.geoCodes[0]),
      genHousingApi(Establishment1.geoCodes[0]),
      genHousingApi(Establishment1.geoCodes[0]),
      genHousingApi(Establishment2.geoCodes[0]),
    ];
    const group = genGroupApi(User1, Establishment1);
    const anotherGroup = genGroupApi(User2, Establishment2);

    const payload: GroupPayload = {
      title: 'Logement prioritaires',
      description: 'Logements les plus énergivores',
      housingIds: housingList.map((housing) => housing.id),
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

    it('should update a group with all the housing belonging to the given establishment', async () => {
      const establishmentHousingList = housingList.filter((housing) =>
        Establishment1.geoCodes.includes(housing.geoCode)
      );

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
        housingCount: establishmentHousingList.length,
        ownerCount: 1,
        createdAt: expect.toBeDateString(),
        createdBy: toUserDTO(User1),
      });
    });
  });

  describe('remove', () => {
    const testRoute = (id: string): string => `/api/groups/${id}`;
    const group: GroupApi = genGroupApi(User1, Establishment1);
    const anotherGroup: GroupApi = genGroupApi(User2, Establishment2);

    beforeEach(async () => {
      await Groups().insert(formatGroupApi(group));
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

    it("should remove the housing group for the authenticated user's establishment", async () => {
      const { status } = await withAccessToken(
        request(app).delete(testRoute(group.id))
      );

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
    });
  });
});
