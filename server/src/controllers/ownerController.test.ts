import { faker } from '@faker-js/faker/locale/fr';

import {
  AddressDTO,
  AddressKinds,
  HousingOwnerPayloadDTO,
  OwnerDTO,
  OwnerPayloadDTO
} from '@zerologementvacant/models';
import { addDays } from 'date-fns';
import { constants } from 'http2';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import db from '~/infra/database';
import { createServer } from '~/infra/server';
import { HousingApi } from '~/models/HousingApi';
import { HousingOwnerApi, OwnerRank } from '~/models/HousingOwnerApi';
import { OwnerApi } from '~/models/OwnerApi';
import {
  banAddressesTable,
  formatAddressApi
} from '~/repositories/banAddressesRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  EventRecordDBO,
  Events,
  eventsTable,
  housingEventsTable,
  OwnerEventDBO,
  ownerEventsTable
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
      const payload: OwnerPayloadDTO = {
        ...owner,
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
      const payload: OwnerPayloadDTO = {
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
        rawAddress: payload.rawAddress,
        fullName: payload.fullName,
        birthDate: payload.birthDate,
        email: payload.email,
        phone: payload.phone,
        kindDetail: owner.kindDetail
      });
    });

    it('should update their BAN address', async () => {
      const payload: OwnerPayloadDTO = {
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

    it('should create an event if the name or birth date has changed', async () => {
      const original = genOwnerApi();
      await Owners().insert(formatOwnerApi(original));
      const payload: OwnerPayloadDTO = {
        ...original,
        birthDate: addDays(original.birthDate ?? new Date(), 1)
          .toISOString()
          .substring(0, 10)
      };

      const { status } = await request(app)
        .put(testRoute(original.id))
        .send(payload)
        .set('Content-Type', 'application/json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const events = await Events()
        .join(
          ownerEventsTable,
          `${ownerEventsTable}.event_id`,
          `${eventsTable}.id`
        )
        .where({ owner_id: original.id });
      expect(events).toBeArrayOfSize(1);
      expect(events[0]).toMatchObject<
        Partial<EventRecordDBO<OwnerApi> & OwnerEventDBO>
      >({
        owner_id: original.id,
        name: "Modification d'identité",
        kind: 'Update',
        category: 'Ownership',
        section: 'Coordonnées propriétaire'
      });
    });

    it('should create an event if the email or phone has changed', async () => {
      const original = genOwnerApi();
      await Owners().insert(formatOwnerApi(original));
      const payload: OwnerPayloadDTO = {
        ...original,
        phone: '+33 6 12 34 56 78'
      };

      const { status } = await request(app)
        .put(testRoute(original.id))
        .send(payload)
        .set('Content-Type', 'application/json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const events = await Events()
        .join(
          ownerEventsTable,
          `${ownerEventsTable}.event_id`,
          `${eventsTable}.id`
        )
        .where({ owner_id: original.id });
      expect(events).toPartiallyContain<
        Partial<EventRecordDBO<OwnerApi> & OwnerEventDBO>
      >({
        owner_id: original.id,
        name: 'Modification de coordonnées',
        kind: 'Update',
        category: 'Ownership',
        section: 'Coordonnées propriétaire'
      });
    });

    it('should create an event if the address has changed', async () => {
      const original = genOwnerApi();
      const originalAddress = genAddressApi(original.id, AddressKinds.Owner);
      await Owners().insert(formatOwnerApi(original));
      await db(banAddressesTable).insert(formatAddressApi(originalAddress));
      const payload: OwnerPayloadDTO = {
        ...original,
        banAddress: genAddressApi(original.id, AddressKinds.Owner)
      };

      const { status } = await request(app)
        .put(testRoute(original.id))
        .send(payload)
        .set('Content-Type', 'application/json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const events = await Events()
        .join(
          ownerEventsTable,
          `${ownerEventsTable}.event_id`,
          `${eventsTable}.id`
        )
        .where({ owner_id: original.id });
      expect(events).toPartiallyContain<
        Partial<EventRecordDBO<OwnerApi> & OwnerEventDBO>
      >({
        owner_id: original.id,
        name: 'Modification de coordonnées',
        kind: 'Update',
        category: 'Ownership',
        section: 'Coordonnées propriétaire'
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
      owners = Array.from({ length: 3 }, genOwnerApi);
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
        idprodroit: null
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

      it('should create an event', async () => {
        const payload = housingOwners.toReversed().map((housingOwner, i) => {
          return { ...housingOwner, rank: i + 1 };
        });

        await request(app)
          .put(testRoute(housing.id))
          .send(payload)
          .use(tokenProvider(user));

        const event = await Events()
          .select(`${eventsTable}.*`)
          .join(
            housingEventsTable,
            `${housingEventsTable}.event_id`,
            `${eventsTable}.id`
          )
          .where({
            housing_geo_code: housing.geoCode,
            housing_id: housing.id
          })
          .first();
        expect(event).toMatchObject({
          name: 'Changement de propriétaires',
          kind: 'Update'
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
