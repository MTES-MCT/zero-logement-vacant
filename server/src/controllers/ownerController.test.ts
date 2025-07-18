import { faker } from '@faker-js/faker/locale/fr';

import {
  AddressDTO,
  AddressKinds,
  HousingOwnerPayloadDTO,
  OwnerDTO,
  OwnerRank,
  OwnerUpdatePayload
} from '@zerologementvacant/models';
import { genAddressDTO } from '@zerologementvacant/models/fixtures';
import { constants } from 'http2';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { createServer } from '~/infra/server';
import { HousingApi } from '~/models/HousingApi';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { OwnerApi } from '~/models/OwnerApi';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  EventRecordDBO,
  Events,
  EVENTS_TABLE,
  HOUSING_OWNER_EVENTS_TABLE,
  OWNER_EVENTS_TABLE
} from '~/repositories/eventRepository';
import {
  formatHousingOwnerApi,
  formatHousingOwnersApi,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  genAddressApi,
  genEstablishmentApi,
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi,
  genUserApi,
  oneOf
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Owner API', () => {
  const { app } = createServer();

  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('GET /owners/housing/{id}', () => {
    const testRoute = (housingId: string) => `/api/owners/housing/${housingId}`;

    const housing = genHousingApi(oneOf(establishment.geoCodes));
    const owners: OwnerApi[] = Array.from({ length: 3 }, () => genOwnerApi());

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housing));
      await Owners().insert(owners.map(formatOwnerApi));
      await HousingOwners().insert(formatHousingOwnersApi(housing, owners));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).get(testRoute(housing.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should return the owner list for a housing', async () => {
      const { body, status } = await request(app)
        .get(testRoute(housing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toSatisfyAll<OwnerApi>((owner) => {
        return owners.map((owner) => owner.id).includes(owner.id);
      });
    });
  });

  describe('PUT /owners/{id}', () => {
    const testRoute = (id: string) => `/api/owners/${id}`;

    let owner: OwnerApi;

    beforeEach(async () => {
      owner = genOwnerApi();
      await Owners().insert(formatOwnerApi(owner));
    });

    it('should reject if the owner is missing', async () => {
      const payload: OwnerUpdatePayload = {
        ...owner,
        banAddress: genAddressDTO(owner.id, AddressKinds.Owner),
        phone: '+33 6 12 34 56 78'
      };

      const { status } = await request(app)
        .put(testRoute(uuidv4()))
        .send(payload)
        .set('Content-Type', 'application/json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should update an owner', async () => {
      const payload: OwnerUpdatePayload = {
        ...owner,
        birthDate: new Date('2000-01-01')
          .toJSON()
          .substring(0, 'yyyy-mm-dd'.length),
        phone: '+33 6 12 34 56 78'
      };

      const { body, status } = await request(app)
        .put(testRoute(owner.id))
        .send(payload)
        .set('Content-Type', 'application/json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<Partial<OwnerDTO>>({
        id: owner.id,
        fullName: payload.fullName,
        birthDate: payload.birthDate,
        email: payload.email,
        phone: payload.phone,
        kindDetail: owner.kindDetail
      });
    });

    it('should update their BAN address', async () => {
      const payload: OwnerUpdatePayload = {
        ...owner,
        banAddress: genAddressApi(owner.id, AddressKinds.Owner)
      };

      const { body, status } = await request(app)
        .put(testRoute(owner.id))
        .send(payload)
        .set('Content-Type', 'application/json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.banAddress).toMatchObject<Partial<AddressDTO>>({
        refId: owner.id,
        addressKind: AddressKinds.Owner,
        label: payload.banAddress?.label,
        houseNumber: payload.banAddress?.houseNumber,
        street: payload.banAddress?.street,
        postalCode: payload.banAddress?.postalCode,
        city: payload.banAddress?.city,
        latitude: payload.banAddress?.latitude,
        longitude: payload.banAddress?.longitude,
        score: payload.banAddress?.score,
        banId: payload.banAddress?.banId
      });
    });

    it('should create an event if the owner has changed', async () => {
      const original = genOwnerApi();
      await Owners().insert(formatOwnerApi(original));

      const payload = {
        fullName: 'Jean Dupont',
        birthDate: faker.date.birthdate().toJSON(),
        phone: faker.phone.number(),
        email: faker.internet.email(),
        banAddress: genAddressDTO(owner.id, AddressKinds.Owner),
        additionalAddress: 'Les Cabannes'
      } satisfies OwnerUpdatePayload;

      const { status } = await request(app)
        .put(testRoute(original.id))
        .send(payload)
        .set('Content-Type', 'application/json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const event = await Events()
        .join(OWNER_EVENTS_TABLE, 'event_id', 'id')
        .where({
          owner_id: original.id,
          type: 'owner:updated'
        })
        .first();
      expect(event).toMatchObject<Partial<EventRecordDBO<'owner:updated'>>>({
        type: 'owner:updated',
        next_old: {
          name: original.fullName,
          birthdate:
            original.birthDate?.substring(0, 'yyyy-mm-dd'.length) ?? null,
          phone: original.phone,
          email: original.email,
          address: original.banAddress?.label ?? null,
          additionalAddress: original.additionalAddress
        },
        next_new: {
          name: payload.fullName,
          birthdate: payload.birthDate.substring(0, 'yyyy-mm-dd'.length),
          phone: payload.phone,
          email: payload.email,
          address: payload.banAddress.label,
          additionalAddress: payload.additionalAddress
        },
        created_by: user.id
      });
    });
  });

  describe('PUT /owners/housing/{id}', () => {
    const testRoute = (id: string) => `/api/housing/${id}/owners`;

    let housing: HousingApi;
    let owners: ReadonlyArray<OwnerApi>;
    let housingOwners: ReadonlyArray<HousingOwnerApi>;

    beforeEach(async () => {
      housing = genHousingApi(
        faker.helpers.arrayElement(establishment.geoCodes)
      );
      await Housing().insert(formatHousingRecordApi(housing));
      owners = Array.from({ length: 4 }, genOwnerApi);
      await Owners().insert(owners.map(formatOwnerApi));
      housingOwners = owners.map((owner, i) => {
        return {
          ...genHousingOwnerApi(housing, owner),
          rank: (i + 1) as OwnerRank
        };
      });
      await HousingOwners().insert(housingOwners.map(formatHousingOwnerApi));
    });

    function createHousingOwnerPayload(
      owner: OwnerApi,
      rank: OwnerRank
    ): HousingOwnerPayloadDTO {
      return {
        id: owner.id,
        rank: rank,
        locprop: null,
        idprocpte: null,
        idprodroit: null,
        propertyRight: null
      };
    }

    it('should reject if the housing is missing', async () => {
      const payload: HousingOwnerPayloadDTO[] = owners.map((owner, i) => {
        return createHousingOwnerPayload(owner, (i + 1) as OwnerRank);
      });

      const { status } = await request(app)
        .put(testRoute(uuidv4()))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should reject if one of the owners is missing', async () => {
      const payload: HousingOwnerPayloadDTO[] = owners
        .map((owner, i) => {
          return createHousingOwnerPayload(owner, (i + 1) as OwnerRank);
        })
        .concat(
          createHousingOwnerPayload(
            genOwnerApi(),
            (owners.length + 1) as OwnerRank
          )
        );

      const { status } = await request(app)
        .put(testRoute(housing.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    describe('If the housing owners have changed', () => {
      it('should replace housing owners', async () => {
        const payload = housingOwners.toReversed().map((housingOwner, i) => {
          return { ...housingOwner, rank: i + 1 };
        });

        const { body, status } = await request(app)
          .put(testRoute(housing.id))
          .send(payload)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body).toIncludeAllPartialMembers(
          payload.map((housingOwner) => {
            return {
              id: housingOwner.id,
              rank: housingOwner.rank
            };
          })
        );
      });

      it('should create an event when a housing owner is attached', async () => {
        const owner = genOwnerApi();
        await Owners().insert(formatOwnerApi(owner));
        const payload = housingOwners.concat({
          ...genHousingOwnerApi(housing, owner),
          rank: -2
        });

        await request(app)
          .put(testRoute(housing.id))
          .send(payload)
          .use(tokenProvider(user));

        const event = await Events()
          .select(`${EVENTS_TABLE}.*`)
          .join(
            HOUSING_OWNER_EVENTS_TABLE,
            `${HOUSING_OWNER_EVENTS_TABLE}.event_id`,
            `${EVENTS_TABLE}.id`
          )
          .where({
            housing_geo_code: housing.geoCode,
            housing_id: housing.id,
            owner_id: owner.id,
            type: 'housing:owner-attached'
          })
          .first();
        expect(event).toMatchObject<
          Partial<EventRecordDBO<'housing:owner-attached'>>
        >({
          type: 'housing:owner-attached',
          next_old: null,
          next_new: {
            name: owner.fullName,
            rank: -2
          },
          created_by: user.id
        });
      });

      it('should create an event when a housing owner is detached', async () => {
        const owner = housingOwners[housingOwners.length - 1];
        const payload = housingOwners.slice(0, -1);

        await request(app)
          .put(testRoute(housing.id))
          .send(payload)
          .use(tokenProvider(user));

        const event = await Events()
          .select(`${EVENTS_TABLE}.*`)
          .join(
            HOUSING_OWNER_EVENTS_TABLE,
            `${HOUSING_OWNER_EVENTS_TABLE}.event_id`,
            `${EVENTS_TABLE}.id`
          )
          .where({
            housing_geo_code: housing.geoCode,
            housing_id: housing.id,
            owner_id: owner.id,
            type: 'housing:owner-detached'
          })
          .first();
        expect(event).toMatchObject<
          Partial<EventRecordDBO<'housing:owner-detached'>>
        >({
          type: 'housing:owner-detached',
          next_old: {
            name: owner.fullName,
            rank: owner.rank
          },
          next_new: null,
          created_by: user.id
        });
      });

      it('should create an event when a housing owner’s rank is changed', async () => {
        const payload = housingOwners.toReversed().map((housingOwner, i) => {
          return { ...housingOwner, rank: i + 1 };
        });

        await request(app)
          .put(testRoute(housing.id))
          .send(payload)
          .use(tokenProvider(user));

        const events = await Events()
          .select(`${EVENTS_TABLE}.*`)
          .join(
            HOUSING_OWNER_EVENTS_TABLE,
            `${HOUSING_OWNER_EVENTS_TABLE}.event_id`,
            `${EVENTS_TABLE}.id`
          )
          .where({
            housing_geo_code: housing.geoCode,
            housing_id: housing.id,
            type: 'housing:owner-updated'
          });

        housingOwners.forEach((_, i) => {
          expect(events).toPartiallyContain<
            Partial<EventRecordDBO<'housing:owner-updated'>>
          >({
            type: 'housing:owner-updated',
            next_old: {
              name: housingOwners[i].fullName,
              rank: housingOwners[i].rank
            },
            next_new: {
              name: payload[payload.length - i - 1].fullName,
              rank: payload[payload.length - i - 1].rank as OwnerRank
            }
          });
        });
      });
    });

    it('should return 304 Not modified otherwise', async () => {
      const payload = housingOwners;

      const { status } = await request(app)
        .put(testRoute(housing.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_MODIFIED);
    });
  });
});
