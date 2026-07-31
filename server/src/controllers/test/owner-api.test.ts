import { constants } from 'http2';

import { faker } from '@faker-js/faker/locale/fr';
import { fc, test } from '@fast-check/vitest';
import {
  AddressDTO,
  AddressKinds,
  HousingOwnerPayloadDTO,
  OwnerDTO,
  OwnerRank,
  OwnerUpdatePayload
} from '@zerologementvacant/models';
import { genAddressDTO } from '@zerologementvacant/models/fixtures';
import type { Selectable } from 'kysely';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { createServer } from '~/infra/server';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { HousingApi } from '~/models/HousingApi';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { OwnerApi } from '~/models/OwnerApi';
import { UserApi } from '~/models/UserApi';
import { factories } from '~/test/factories';
import {
  genAddressApi,
  genHousingOwnerApi,
  genOwnerApi
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Owner API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  let establishment: EstablishmentApi;
  let user: UserApi;

  beforeAll(async () => {
    establishment = await factories.establishment.create();
    user = await factories.user.create({ establishmentId: establishment.id });
  });

  describe('GET /owners', () => {
    const testRoute = '/owners';

    it('should be forbidden for unauthenticated users', async () => {
      const { status } = await request(url).get(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    describe('As an authenticated user', () => {
      beforeAll(async () => {
        await Promise.all([
          factories.owner.create({
            fullName: 'Jean Valjean',
            idpersonne: faker.string.alphanumeric(10)
          }),
          factories.owner.create({
            fullName: 'Jean Dupont',
            idpersonne: faker.string.alphanumeric(10)
          }),
          factories.owner.create({
            fullName: 'Pierre Martin',
            idpersonne: faker.string.alphanumeric(10)
          }),
          factories.owner.create({ fullName: 'Marie Curie', idpersonne: null })
        ]);
      });

      test.prop<{ search?: string; page?: number; perPage?: number }>({
        search: fc.option(fc.stringMatching(/^[a-zA-Z0-9]+$/), {
          nil: undefined
        }),
        page: fc.option(fc.integer({ min: 1 }), { nil: undefined }),
        perPage: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined })
      })('should validate inputs', async (query) => {
        const { status } = await request(url)
          .get(testRoute)
          .query(query)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_PARTIAL_CONTENT);
      });

      it('should return owners with idpersonne only', async () => {
        const { body, status } = await request(url)
          .get(testRoute)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_PARTIAL_CONTENT);
        expect(body).toSatisfyAll<OwnerDTO>(
          (owner) => owner.idpersonne !== undefined && owner.idpersonne !== null
        );
      });

      it('should include BAN addresses', async () => {
        const { body, status } = await request(url)
          .get(testRoute)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_PARTIAL_CONTENT);
        expect(body).toSatisfyAll<OwnerDTO>((owner) => 'banAddress' in owner);
      });

      it('should filter by search parameter', async () => {
        const { body, status } = await request(url)
          .get(testRoute)
          .query({ search: 'Jean' })
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_PARTIAL_CONTENT);
        expect(body.length).toBeGreaterThanOrEqual(2);
        expect(body).toSatisfyAll<OwnerDTO>((owner) =>
          owner.fullName.toLowerCase().includes('jean')
        );
      });

      it('should return correct Content-Range headers', async () => {
        const { headers, status } = await request(url)
          .get(testRoute)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_PARTIAL_CONTENT);
        expect(headers['accept-ranges']).toBe('owners');
        expect(headers['content-range']).toMatch(/^owners \d+-\d+\/\d+$/);
      });

      it('should paginate results', async () => {
        const { body, headers, status } = await request(url)
          .get(testRoute)
          .query({ page: 1, perPage: 2 })
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_PARTIAL_CONTENT);
        expect(body.length).toBeLessThanOrEqual(2);
        expect(headers['content-range']).toMatch(/^owners 0-1\/\d+$/);
      });

      it('should handle pagination on second page', async () => {
        const { headers, status } = await request(url)
          .get(testRoute)
          .query({ page: 2, perPage: 2 })
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_PARTIAL_CONTENT);
        expect(headers['content-range']).toMatch(/^owners \d+-\d+\/\d+$/);
      });

      it('should handle empty search results', async () => {
        const { body, status } = await request(url)
          .get(testRoute)
          .query({ search: faker.string.alphanumeric(50) })
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_PARTIAL_CONTENT);
        expect(body).toEqual([]);
      });

      it('should combine search and pagination', async () => {
        const { body, status } = await request(url)
          .get(testRoute)
          .query({ search: 'Jean', page: 1, perPage: 1 })
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_PARTIAL_CONTENT);
        expect(body.length).toBeLessThanOrEqual(1);
        if (body.length > 0) {
          expect(body[0].fullName.toLowerCase()).toContain('jean');
        }
      });
    });
  });

  describe('GET /housings/{id}/owners', () => {
    const testRoute = (id: string) => `/housings/${id}/owners`;

    let housing: HousingApi;
    let owners: ReadonlyArray<OwnerApi>;

    beforeAll(async () => {
      housing = await factories.housing.create({
        geoCode: faker.helpers.arrayElement(establishment.geoCodes)
      });
      owners = await factories.owner.createList(3);
      await Promise.all(
        owners.map((owner, index) =>
          factories
            .housingOwner({ housing, owner })
            .create({ rank: (index + 1) as OwnerRank })
        )
      );
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).get(testRoute(housing.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should return the owner list for a housing', async () => {
      const { body, status } = await request(url)
        .get(testRoute(housing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toSatisfyAll<OwnerApi>((owner) => {
        return owners.map((owner) => owner.id).includes(owner.id);
      });
    });
  });

  describe('POST /owners/creation — validation', () => {
    const testRoute = '/owners/creation';

    it('should return 400 when body.fullName is missing', async () => {
      const { status, body } = await request(url)
        .post(testRoute)
        .send({})
        .set('Content-Type', 'application/json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      expect(body).toMatchObject({ name: 'ValidationError' });
      expect(body.message).toMatch(/fullName/i);
    });

    it('should return 400 when body.email is malformed', async () => {
      const { status, body } = await request(url)
        .post(testRoute)
        .send({ fullName: 'Jane Doe', email: 'not-an-email' })
        .set('Content-Type', 'application/json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      expect(body).toMatchObject({ name: 'ValidationError' });
    });

    it('should return 400 when body.banAddress is present but missing banId', async () => {
      const { status, body } = await request(url)
        .post(testRoute)
        .send({
          fullName: 'Jane Doe',
          banAddress: {
            label: '1 rue des Lilas',
            postalCode: '75001',
            city: 'Paris'
          }
        })
        .set('Content-Type', 'application/json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      expect(body).toMatchObject({ name: 'ValidationError' });
      expect(body.message).toMatch(/identifiant BAN/i);
    });

    it('should accept an empty-string email (treated as absent)', async () => {
      const { status } = await request(url)
        .post(testRoute)
        .send({ fullName: 'Jane Doe', email: '' })
        .set('Content-Type', 'application/json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
    });
  });

  describe('PUT /owners/{id}', () => {
    const testRoute = (id: string) => `/owners/${id}`;

    let owner: OwnerApi;

    beforeEach(async () => {
      owner = await factories.owner.create();
    });

    it('should reject if the owner is missing', async () => {
      const payload: OwnerUpdatePayload = {
        ...owner,
        banAddress: genAddressDTO(),
        phone: '+33 6 12 34 56 78'
      };

      const { status } = await request(url)
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

      const { body, status } = await request(url)
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
        phone: payload.phone
      });
    });

    it('should update their BAN address', async () => {
      const payload: OwnerUpdatePayload = {
        ...owner,
        banAddress: genAddressApi(owner.id, AddressKinds.Owner)
      };

      const { body, status } = await request(url)
        .put(testRoute(owner.id))
        .send(payload)
        .set('Content-Type', 'application/json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.banAddress).toMatchObject<Partial<AddressDTO>>({
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

    it('should set the do not contact flag', async () => {
      const payload: OwnerUpdatePayload = {
        ...owner,
        doNotContact: true
      };

      const { body, status } = await request(url)
        .put(testRoute(owner.id))
        .send(payload)
        .set('Content-Type', 'application/json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<Partial<OwnerDTO>>({
        id: owner.id,
        doNotContact: true
      });
      const actual = await kysely
        .selectFrom('owners')
        .selectAll()
        .where('id', '=', owner.id)
        .executeTakeFirst();
      expect(actual).toMatchObject({ doNotContact: true });
    });

    describe('validation', () => {
      const validId = uuidv4();

      it('should return 400 when :id is not a UUID', async () => {
        const { status, body } = await request(url)
          .put(testRoute('not-a-uuid'))
          .send({ fullName: 'Jane Doe', doNotContact: false })
          .set('Content-Type', 'application/json')
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(body).toMatchObject({ name: 'ValidationError' });
        expect(body.message).toMatch(/id/i);
      });

      it('should return 400 when body.fullName is missing', async () => {
        const { status, body } = await request(url)
          .put(testRoute(validId))
          .send({})
          .set('Content-Type', 'application/json')
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(body).toMatchObject({ name: 'ValidationError' });
      });

      it('should return 400 when body.banAddress is incomplete (missing label)', async () => {
        const { status, body } = await request(url)
          .put(testRoute(validId))
          .send({
            fullName: 'Jane Doe',
            doNotContact: false,
            banAddress: {
              banId: 'ban-123',
              postalCode: '75001',
              city: 'Paris'
            }
          })
          .set('Content-Type', 'application/json')
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(body).toMatchObject({ name: 'ValidationError' });
        expect(body.message).toMatch(/libellé/i);
      });
    });

    it('should create an event if the owner has changed', async () => {
      const original = await factories.owner.create({ banAddress: null });

      const payload = {
        fullName: 'Jean Dupont',
        birthDate: faker.date.birthdate().toJSON(),
        phone: faker.phone.number(),
        email: faker.internet.email(),
        banAddress: genAddressDTO(),
        additionalAddress: 'Les Cabannes',
        // Unchanged: send the existing value so it stays out of the event diff.
        doNotContact: original.doNotContact
      } satisfies OwnerUpdatePayload;

      const { status } = await request(url)
        .put(testRoute(original.id))
        .send(payload)
        .set('Content-Type', 'application/json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const event = await kysely
        .selectFrom('events')
        .innerJoin('ownerEvents', 'ownerEvents.eventId', 'events.id')
        .selectAll('events')
        .where('ownerEvents.ownerId', '=', original.id)
        .where('events.type', '=', 'owner:updated')
        .executeTakeFirst();
      expect(event).toMatchObject<Partial<Selectable<DB['events']>>>({
        type: 'owner:updated',
        nextOld: {
          name: original.fullName,
          birthdate:
            original.birthDate?.substring(0, 'yyyy-mm-dd'.length) ?? null,
          phone: original.phone,
          email: original.email,
          address: null,
          additionalAddress: original.additionalAddress
        },
        nextNew: {
          name: payload.fullName,
          birthdate: payload.birthDate.substring(0, 'yyyy-mm-dd'.length),
          phone: payload.phone,
          email: payload.email,
          address: payload.banAddress.label,
          additionalAddress: payload.additionalAddress
        },
        createdBy: user.id
      });
    });

    it('should create an event when the do not contact flag changes', async () => {
      const original = await factories.owner.create({
        banAddress: null,
        doNotContact: false
      });

      // Only the "do not contact" flag changes: every other field is identical.
      const payload = {
        fullName: original.fullName,
        birthDate: original.birthDate,
        phone: original.phone,
        email: original.email,
        banAddress: null,
        additionalAddress: original.additionalAddress,
        doNotContact: true
      } satisfies OwnerUpdatePayload;

      const { status } = await request(url)
        .put(testRoute(original.id))
        .send(payload)
        .set('Content-Type', 'application/json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const event = await kysely
        .selectFrom('events')
        .innerJoin('ownerEvents', 'ownerEvents.eventId', 'events.id')
        .selectAll('events')
        .where('ownerEvents.ownerId', '=', original.id)
        .where('events.type', '=', 'owner:updated')
        .executeTakeFirst();
      expect(event).toMatchObject<Partial<Selectable<DB['events']>>>({
        type: 'owner:updated',
        nextOld: {
          name: original.fullName,
          doNotContact: false
        },
        nextNew: {
          name: original.fullName,
          doNotContact: true
        },
        createdBy: user.id
      });
    });
  });

  describe('PUT /owners/housing/{id}', () => {
    const testRoute = (id: string) => `/housing/${id}/owners`;

    let housing: HousingApi;
    let owners: ReadonlyArray<OwnerApi>;
    let housingOwners: ReadonlyArray<HousingOwnerApi>;

    beforeEach(async () => {
      housing = await factories.housing.create({
        geoCode: faker.helpers.arrayElement(establishment.geoCodes)
      });
      owners = await factories.owner.createList(4);
      housingOwners = await Promise.all(
        owners.map((owner, index) =>
          factories
            .housingOwner({ housing, owner })
            .create({ rank: (index + 1) as OwnerRank })
        )
      );
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

      const { status } = await request(url)
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

      const { status } = await request(url)
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

        const { body, status } = await request(url)
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
        const owner = await factories.owner.create();
        const payload = housingOwners.concat({
          ...genHousingOwnerApi(housing, owner),
          rank: -2
        });

        await request(url)
          .put(testRoute(housing.id))
          .send(payload)
          .use(tokenProvider(user));

        const event = await kysely
          .selectFrom('events')
          .innerJoin(
            'housingOwnerEvents',
            'housingOwnerEvents.eventId',
            'events.id'
          )
          .selectAll('events')
          .where('housingOwnerEvents.housingGeoCode', '=', housing.geoCode)
          .where('housingOwnerEvents.housingId', '=', housing.id)
          .where('housingOwnerEvents.ownerId', '=', owner.id)
          .where('events.type', '=', 'housing:owner-attached')
          .executeTakeFirst();
        expect(event).toMatchObject<Partial<Selectable<DB['events']>>>({
          type: 'housing:owner-attached',
          nextOld: null,
          nextNew: {
            name: owner.fullName,
            rank: -2
          },
          createdBy: user.id
        });
      });

      it('should create an event when a housing owner is detached', async () => {
        const owner = housingOwners[housingOwners.length - 1];
        const payload = housingOwners.slice(0, -1);

        await request(url)
          .put(testRoute(housing.id))
          .send(payload)
          .use(tokenProvider(user));

        const event = await kysely
          .selectFrom('events')
          .innerJoin(
            'housingOwnerEvents',
            'housingOwnerEvents.eventId',
            'events.id'
          )
          .selectAll('events')
          .where('housingOwnerEvents.housingGeoCode', '=', housing.geoCode)
          .where('housingOwnerEvents.housingId', '=', housing.id)
          .where('housingOwnerEvents.ownerId', '=', owner.id)
          .where('events.type', '=', 'housing:owner-detached')
          .executeTakeFirst();
        expect(event).toMatchObject<Partial<Selectable<DB['events']>>>({
          type: 'housing:owner-detached',
          nextOld: {
            name: owner.fullName,
            rank: owner.rank
          },
          nextNew: null,
          createdBy: user.id
        });
      });

      it('should create an event when a housing owner’s rank is changed', async () => {
        const payload = housingOwners.toReversed().map((housingOwner, i) => {
          return { ...housingOwner, rank: i + 1 };
        });

        await request(url)
          .put(testRoute(housing.id))
          .send(payload)
          .use(tokenProvider(user));

        const events = await kysely
          .selectFrom('events')
          .innerJoin(
            'housingOwnerEvents',
            'housingOwnerEvents.eventId',
            'events.id'
          )
          .selectAll('events')
          .where('housingOwnerEvents.housingGeoCode', '=', housing.geoCode)
          .where('housingOwnerEvents.housingId', '=', housing.id)
          .where('events.type', '=', 'housing:owner-updated')
          .execute();

        housingOwners.forEach((_, i) => {
          expect(events).toPartiallyContain<Partial<Selectable<DB['events']>>>({
            type: 'housing:owner-updated',
            nextOld: {
              name: housingOwners[i].fullName,
              rank: housingOwners[i].rank
            },
            nextNew: {
              name: payload[payload.length - i - 1].fullName,
              rank: payload[payload.length - i - 1].rank as OwnerRank
            }
          });
        });
      });
    });

    it('should return 304 Not modified otherwise', async () => {
      const payload = housingOwners;

      const { status } = await request(url)
        .put(testRoute(housing.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_MODIFIED);
    });
  });
});
