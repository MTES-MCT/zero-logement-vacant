import { GeoStatisticsResponseDTO, UserRole } from '@zerologementvacant/models';
import { constants } from 'http2';
import request from 'supertest';

import { createServer } from '~/infra/server';
import { UserApi } from '~/models/UserApi';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  genEstablishmentApi,
  genHousingApi,
  genUserApi
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Geo Statistics API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  // Create establishments with different geo codes
  // Establishment with geoCodes in Grand Est (67, 68) and Pays de la Loire (44)
  const establishment = genEstablishmentApi();
  const establishmentWithGeoCodes = {
    ...establishment,
    geoCodes: ['67482', '67043', '68066', '44109', '44162']
  };

  const user: UserApi = {
    ...genUserApi(establishmentWithGeoCodes.id),
    role: UserRole.USUAL
  };

  const admin: UserApi = {
    ...genUserApi(establishmentWithGeoCodes.id),
    role: UserRole.ADMIN
  };

  const anotherEstablishment = genEstablishmentApi();
  const anotherEstablishmentWithGeoCodes = {
    ...anotherEstablishment,
    geoCodes: ['75101', '75102', '75103'] // Paris
  };
  const anotherUser: UserApi = {
    ...genUserApi(anotherEstablishmentWithGeoCodes.id),
    role: UserRole.USUAL
  };

  beforeAll(async () => {
    await Establishments().insert(
      [establishmentWithGeoCodes, anotherEstablishmentWithGeoCodes].map(
        formatEstablishmentApi
      )
    );
    await Users().insert([user, admin, anotherUser].map(formatUserApi));

    // Create housing in the establishment's geo codes
    const housings = [
      // Grand Est - Bas-Rhin (67)
      genHousingApi('67482'),
      genHousingApi('67482'),
      genHousingApi('67043'),
      // Grand Est - Haut-Rhin (68)
      genHousingApi('68066'),
      genHousingApi('68066'),
      // Pays de la Loire - Loire-Atlantique (44)
      genHousingApi('44109'),
      // Another establishment - Paris (75)
      genHousingApi('75101'),
      genHousingApi('75102')
    ];

    await Housing().insert(housings.map(formatHousingRecordApi));
  });

  describe('GET /geo/statistics', () => {
    const testRoute = '/api/geo/statistics';

    it('should require authentication', async () => {
      const { status } = await request(url).get(testRoute).query({
        level: 'region'
      });

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should require level parameter', async () => {
      const { status } = await request(url)
        .get(testRoute)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should reject invalid level parameter', async () => {
      const { status } = await request(url)
        .get(testRoute)
        .query({ level: 'invalid' })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    describe('level=region', () => {
      it('should return statistics by region', async () => {
        const { body, status } = await request(url)
          .get(testRoute)
          .query({ level: 'region' })
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body).toMatchObject<GeoStatisticsResponseDTO>({
          level: 'region',
          establishmentId: establishmentWithGeoCodes.id,
          statistics: expect.any(Array)
        });
        expect(body.statistics.length).toBeGreaterThan(0);
        // Each statistic should have code, name, and housingCount
        body.statistics.forEach((stat: { code: string; name: string; housingCount: number }) => {
          expect(stat).toHaveProperty('code');
          expect(stat).toHaveProperty('name');
          expect(stat).toHaveProperty('housingCount');
          expect(stat.housingCount).toBeGreaterThan(0);
        });
      });
    });

    describe('level=department', () => {
      it('should return statistics by department', async () => {
        const { body, status } = await request(url)
          .get(testRoute)
          .query({ level: 'department' })
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body.level).toBe('department');
        expect(body.statistics.length).toBeGreaterThan(0);
      });

      it('should reject region code if establishment does not cover ALL departments (restrictive)', async () => {
        // Establishment has geoCodes in 67, 68, 44 only
        // Region 44 (Grand Est) has 10 departments: 67, 68, 57, 54, 55, 08, 10, 51, 52, 88
        // Since establishment doesn't cover ALL departments, access should be denied
        const { status } = await request(url)
          .get(testRoute)
          .query({ level: 'department', code: '44' }) // Grand Est
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
      });

      it('should reject region code outside establishment perimeter', async () => {
        const { status } = await request(url)
          .get(testRoute)
          .query({ level: 'department', code: '11' }) // Île-de-France - not in establishment geoCodes
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
      });
    });

    describe('level=epci', () => {
      it('should return empty array if no department code provided', async () => {
        const { body, status } = await request(url)
          .get(testRoute)
          .query({ level: 'epci' })
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body.level).toBe('epci');
        expect(body.statistics).toEqual([]);
      });

      it('should reject department code if establishment does not cover ALL EPCIs (restrictive)', async () => {
        // Establishment has geoCodes ['67482', '67043'] which are both in Eurométropole de Strasbourg
        // Department 67 (Bas-Rhin) has 25 EPCIs
        // Since establishment only covers 1 EPCI out of 25, access should be denied
        const { status } = await request(url)
          .get(testRoute)
          .query({ level: 'epci', code: '67' }) // Bas-Rhin
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
      });

      it('should reject department code outside establishment perimeter', async () => {
        const { status } = await request(url)
          .get(testRoute)
          .query({ level: 'epci', code: '75' }) // Paris - not in establishment geoCodes
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
      });
    });

    describe('security', () => {
      it('should not allow regular users to query other establishments', async () => {
        const { status } = await request(url)
          .get(testRoute)
          .query({
            level: 'region',
            establishmentId: anotherEstablishmentWithGeoCodes.id
          })
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
      });

      it('should allow admin to query any establishment', async () => {
        const { body, status } = await request(url)
          .get(testRoute)
          .query({
            level: 'region',
            establishmentId: anotherEstablishmentWithGeoCodes.id
          })
          .use(tokenProvider(admin));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body.establishmentId).toBe(anotherEstablishmentWithGeoCodes.id);
      });

      it('should allow users to query their own establishment explicitly', async () => {
        const { body, status } = await request(url)
          .get(testRoute)
          .query({
            level: 'region',
            establishmentId: establishmentWithGeoCodes.id
          })
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body.establishmentId).toBe(establishmentWithGeoCodes.id);
      });
    });
  });
});
