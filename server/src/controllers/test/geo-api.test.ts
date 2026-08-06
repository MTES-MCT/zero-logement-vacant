import { constants } from 'http2';
import fs from 'node:fs';
import path from 'node:path';

import { faker } from '@faker-js/faker/locale/fr';
import AdmZip from 'adm-zip';
import randomstring from 'randomstring';
import request from 'supertest';

import { kysely } from '~/infra/database/kysely';
import { createServer } from '~/infra/server';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { GeoPerimeterApi } from '~/models/GeoPerimeterApi';
import { UserApi } from '~/models/UserApi';
import { toGeoPerimeterInsert } from '~/repositories/geoRepository';
import { factories } from '~/test/factories';
import { genGeoPerimeterApi } from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

// EICAR test file - standard antivirus test string
const EICAR_TEST_FILE =
  'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

describe('Geo perimeters API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  let establishment: EstablishmentApi;
  let anotherEstablishment: EstablishmentApi;
  let user: UserApi;

  beforeAll(async () => {
    establishment = await factories.establishment.create();
    anotherEstablishment = await factories.establishment.create();
    user = await factories.user.create({ establishmentId: establishment.id });
  });

  describe('GET /geo/perimeters', () => {
    const testRoute = '/geo/perimeters';

    let geoPerimeters: GeoPerimeterApi[];
    let otherGeoPerimeters: GeoPerimeterApi[];

    beforeAll(async () => {
      geoPerimeters = Array.from({ length: 3 }, () =>
        genGeoPerimeterApi(establishment.id, user)
      );
      otherGeoPerimeters = Array.from({ length: 2 }, () =>
        genGeoPerimeterApi(anotherEstablishment.id, user)
      );
      await kysely
        .insertInto('geoPerimeters')
        .values(
          geoPerimeters.concat(otherGeoPerimeters).map(toGeoPerimeterInsert)
        )
        .execute();
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).get(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should list the geo perimeters for the authenticated user', async () => {
      const { body, status } = await request(url)
        .get(testRoute)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const ids = new Set(
        body.map((perimeter: GeoPerimeterApi) => perimeter.id)
      );
      expect(geoPerimeters).toSatisfyAll<GeoPerimeterApi>((perimeter) =>
        ids.has(perimeter.id)
      );
      expect(otherGeoPerimeters).toSatisfyAll<GeoPerimeterApi>(
        (perimeter) => !ids.has(perimeter.id)
      );
    });
  });

  describe('DELETE /geo/perimeters', () => {
    const testRoute = '/geo/perimeters';

    let geoPerimeter: GeoPerimeterApi;

    beforeAll(async () => {
      geoPerimeter = genGeoPerimeterApi(establishment.id, user);
      await kysely
        .insertInto('geoPerimeters')
        .values(toGeoPerimeterInsert(geoPerimeter))
        .execute();
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url)
        .delete(testRoute)
        .send({ geoPerimeterIds: [geoPerimeter.id] });

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received valid geo perimeter ids array', async () => {
      await request(url)
        .delete(testRoute)
        .send()
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
      await request(url)
        .delete(testRoute)
        .send({ geoPerimeterIds: geoPerimeter.id })
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
      await request(url)
        .delete(testRoute)
        .send({
          geoPerimeterIds: [geoPerimeter.id, randomstring.generate()]
        })
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should delete the perimeters', async () => {
      const { status } = await request(url)
        .delete(testRoute)
        .send({ geoPerimeterIds: [geoPerimeter.id] })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);

      const actual = await kysely
        .selectFrom('geoPerimeters')
        .selectAll('geoPerimeters')
        .where('id', '=', geoPerimeter.id)
        .executeTakeFirst();
      expect(actual).toBeUndefined();
    });

    it('should not delete a perimeter from another establishment', async () => {
      const anotherGeoPerimeter = genGeoPerimeterApi(
        anotherEstablishment.id,
        user
      );
      await kysely
        .insertInto('geoPerimeters')
        .values(toGeoPerimeterInsert(anotherGeoPerimeter))
        .execute();

      const { status } = await request(url)
        .delete(testRoute)
        .send({ geoPerimeterIds: [anotherGeoPerimeter.id] })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);

      const actual = await kysely
        .selectFrom('geoPerimeters')
        .selectAll('geoPerimeters')
        .where('id', '=', anotherGeoPerimeter.id)
        .executeTakeFirst();
      expect(actual).toMatchObject({
        id: anotherGeoPerimeter.id
      });
    });
  });

  describe('PUT /geo/perimeters/{id}', () => {
    const testRoute = (id: string) => `/geo/perimeters/${id}`;

    let geoPerimeter: GeoPerimeterApi;
    let anotherGeoPerimeter: GeoPerimeterApi;

    beforeAll(async () => {
      geoPerimeter = genGeoPerimeterApi(establishment.id, user);
      anotherGeoPerimeter = genGeoPerimeterApi(anotherEstablishment.id, user);
      await kysely
        .insertInto('geoPerimeters')
        .values([geoPerimeter, anotherGeoPerimeter].map(toGeoPerimeterInsert))
        .execute();
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).put(testRoute(faker.string.uuid()));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be forbidden for a user from another establishment', async () => {
      const { status } = await request(url)
        .put(testRoute(anotherGeoPerimeter.id))
        .send({
          kind: randomstring.generate(),
          name: randomstring.generate()
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received valid parameters', async () => {
      await request(url)
        .put(testRoute('id'))
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(url)
        .put(testRoute(geoPerimeter.id))
        .send({
          name: randomstring.generate()
        })
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should update the perimeter', async () => {
      const newKind: string = randomstring.generate();
      const newName: string = randomstring.generate();

      const { body, status } = await request(url)
        .put(testRoute(geoPerimeter.id))
        .send({
          kind: newKind,
          name: newName
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        id: geoPerimeter.id,
        kind: newKind,
        name: newName
      });

      const actual = await kysely
        .selectFrom('geoPerimeters')
        .selectAll('geoPerimeters')
        .where('id', '=', geoPerimeter.id)
        .executeTakeFirst();
      expect(actual).toMatchObject({
        id: geoPerimeter.id,
        kind: newKind,
        name: newName
      });
    });
  });

  describe('POST /geo/perimeters', () => {
    const testRoute = '/geo/perimeters';

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).post(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    // Skipped: Requires ClamAV daemon running locally (see docs/EICAR_TESTING.md)
    // Enable this test in CI/CD where ClamAV is available, or run manually with local ClamAV setup
    it.skip('should reject EICAR test file in ZIP', async () => {
      // Create a ZIP containing EICAR test file
      const zip = new AdmZip();
      zip.addFile('eicar.txt', Buffer.from(EICAR_TEST_FILE));
      const zipBuffer = zip.toBuffer();

      const tmpPath = path.join(import.meta.dirname, 'eicar-test.zip');
      fs.writeFileSync(tmpPath, zipBuffer);

      try {
        const { body, status } = await request(url)
          .post(testRoute)
          .attach('file', tmpPath)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(body).toMatchObject({
          error: 'Virus detected',
          reason: 'virus_detected',
          message: expect.stringContaining('malicious content'),
          details: {
            filename: expect.any(String),
            viruses: expect.arrayContaining([expect.stringContaining('EICAR')])
          }
        });
      } finally {
        fs.unlinkSync(tmpPath);
      }
    }, 30000);

    it('should reject non-ZIP file', async () => {
      const txtContent = 'This is not a ZIP file';
      const tmpPath = path.join(import.meta.dirname, 'fake.zip');
      fs.writeFileSync(tmpPath, txtContent);

      try {
        const { body, status } = await request(url)
          .post(testRoute)
          .attach('file', tmpPath)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(body).toMatchObject({
          name: 'BadRequestError',
          message: 'Bad request'
        });
      } finally {
        fs.unlinkSync(tmpPath);
      }
    }, 30000);

    it('should reject ZIP without shapefile components', async () => {
      const zip = new AdmZip();
      zip.addFile('readme.txt', Buffer.from('This is not a shapefile'));
      const zipBuffer = zip.toBuffer();

      const tmpPath = path.join(import.meta.dirname, 'no-shapefile.zip');
      fs.writeFileSync(tmpPath, zipBuffer);

      try {
        const { body, status } = await request(url)
          .post(testRoute)
          .attach('file', tmpPath)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(body).toMatchObject({
          name: 'ShapefileValidationError',
          message: expect.stringContaining('Missing')
        });
      } finally {
        fs.unlinkSync(tmpPath);
      }
    }, 30000);

    it.skip('should reject corrupted ZIP file', async () => {
      // TODO: This test is skipped because it's flaky in CI
      // The corrupted ZIP detection is tested in the middleware unit tests
      // See shapefileValidation.test.ts for validation logic tests

      // Create a corrupted ZIP (ZIP header but invalid content)
      const corruptedZip = Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x03, 0x04]), // ZIP magic bytes
        Buffer.from('corrupted data that is not a valid ZIP structure')
      ]);
      const tmpPath = path.join(import.meta.dirname, 'corrupted.zip');
      fs.writeFileSync(tmpPath, corruptedZip);

      try {
        const { body, status } = await request(url)
          .post(testRoute)
          .attach('file', tmpPath)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(body).toMatchObject({
          name: 'ShapefileValidationError',
          message: expect.any(String)
        });
      } finally {
        fs.unlinkSync(tmpPath);
      }
    }, 30000);

    it('should reject file that is too large', async () => {
      // Set max size to 0.5MB for testing
      const originalLimit = process.env.GEO_UPLOAD_MAX_SIZE_MB;
      process.env.GEO_UPLOAD_MAX_SIZE_MB = '0.5';

      // Create a 1MB ZIP (exceeds 0.5MB limit)
      const largeBuffer = Buffer.alloc(1 * 1024 * 1024, 'a');
      const tmpPath = path.join(import.meta.dirname, 'large.zip');
      fs.writeFileSync(tmpPath, largeBuffer);

      try {
        const { status } = await request(url)
          .post(testRoute)
          .attach('file', tmpPath)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      } finally {
        fs.unlinkSync(tmpPath);
        if (originalLimit) {
          process.env.GEO_UPLOAD_MAX_SIZE_MB = originalLimit;
        } else {
          delete process.env.GEO_UPLOAD_MAX_SIZE_MB;
        }
      }
    }, 30000);
  });

  describe('PUT /geo/perimeters/:geoPerimeterId — validation', () => {
    const validId = '00000000-0000-4000-8000-000000000001';

    it('should return 400 when :geoPerimeterId is not a UUID', async () => {
      const { status, body } = await request(url)
        .put('/geo/perimeters/not-a-uuid')
        .send({ kind: 'something' })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      expect(body).toMatchObject({ name: 'ValidationError' });
      expect(body.message).toMatch(/geoPerimeterId/i);
    });

    it('should return 400 when body.kind is missing', async () => {
      const { status, body } = await request(url)
        .put(`/geo/perimeters/${validId}`)
        .send({})
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      expect(body).toMatchObject({ name: 'ValidationError' });
    });

    it('should return 400 when body.kind is empty', async () => {
      const { status, body } = await request(url)
        .put(`/geo/perimeters/${validId}`)
        .send({ kind: '' })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      expect(body).toMatchObject({ name: 'ValidationError' });
      expect(body.message).toMatch(/kind/i);
    });
  });

  describe('DELETE /geo/perimeters — validation', () => {
    it('should return 400 when body.geoPerimeterIds is missing', async () => {
      const { status, body } = await request(url)
        .delete('/geo/perimeters')
        .send({})
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      expect(body).toMatchObject({ name: 'ValidationError' });
    });

    it('should return 400 when body.geoPerimeterIds contains a non-UUID', async () => {
      const { status, body } = await request(url)
        .delete('/geo/perimeters')
        .send({ geoPerimeterIds: ['not-a-uuid'] })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      expect(body).toMatchObject({ name: 'ValidationError' });
      expect(body.message).toMatch(/geoPerimeterIds/i);
    });
  });
});
