import { faker } from '@faker-js/faker/locale/fr';
import { constants } from 'http2';
import randomstring from 'randomstring';
import request from 'supertest';
import path from 'node:path';
import fs from 'node:fs';
import AdmZip from 'adm-zip';

import { tokenProvider } from '~/test/testUtils';
import {
  formatGeoPerimeterApi,
  GeoPerimeters
} from '~/repositories/geoRepository';
import { createServer } from '~/infra/server';
import {
  genEstablishmentApi,
  genGeoPerimeterApi,
  genUserApi
} from '~/test/testFixtures';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import { GeoPerimeterApi } from '~/models/GeoPerimeterApi';

// EICAR test file - standard antivirus test string
const EICAR_TEST_FILE = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

describe('Geo perimeters API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  const establishment = genEstablishmentApi();
  const anotherEstablishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(
      [establishment, anotherEstablishment].map(formatEstablishmentApi)
    );
    await Users().insert(formatUserApi(user));
  });

  describe('GET /geo/perimeters', () => {
    const testRoute = '/api/geo/perimeters';

    const geoPerimeters: GeoPerimeterApi[] = Array.from({ length: 3 }, () =>
      genGeoPerimeterApi(establishment.id, user)
    );
    const otherGeoPerimeters: GeoPerimeterApi[] = Array.from(
      { length: 2 },
      () => genGeoPerimeterApi(anotherEstablishment.id, user)
    );

    beforeAll(async () => {
      await GeoPerimeters().insert(
        geoPerimeters.concat(otherGeoPerimeters).map(formatGeoPerimeterApi)
      );
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
    const testRoute = '/api/geo/perimeters';

    const geoPerimeter = genGeoPerimeterApi(establishment.id, user);

    beforeAll(async () => {
      await GeoPerimeters().insert(formatGeoPerimeterApi(geoPerimeter));
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

      const actual = await GeoPerimeters()
        .where({ id: geoPerimeter.id })
        .first();
      expect(actual).toBeUndefined();
    });

    it('should not delete a perimeter from another establishment', async () => {
      const anotherGeoPerimeter = genGeoPerimeterApi(
        anotherEstablishment.id,
        user
      );
      await GeoPerimeters().insert(formatGeoPerimeterApi(anotherGeoPerimeter));

      const { status } = await request(url)
        .delete(testRoute)
        .send({ geoPerimeterIds: [anotherGeoPerimeter.id] })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);

      const actual = await GeoPerimeters()
        .where({ id: anotherGeoPerimeter.id })
        .first();
      expect(actual).toMatchObject({
        id: anotherGeoPerimeter.id
      });
    });
  });

  describe('PUT /geo/perimeters/{id}', () => {
    const testRoute = (id: string) => `/api/geo/perimeters/${id}`;

    const geoPerimeter = genGeoPerimeterApi(establishment.id, user);
    const anotherGeoPerimeter = genGeoPerimeterApi(
      anotherEstablishment.id,
      user
    );

    beforeAll(async () => {
      await GeoPerimeters().insert(
        [geoPerimeter, anotherGeoPerimeter].map(formatGeoPerimeterApi)
      );
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

      const actual = await GeoPerimeters()
        .where({ id: geoPerimeter.id })
        .first();
      expect(actual).toMatchObject({
        id: geoPerimeter.id,
        kind: newKind,
        name: newName
      });
    });
  });

  describe('POST /geo/perimeters', () => {
    const testRoute = '/api/geo/perimeters';

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).post(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

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
            viruses: expect.arrayContaining([
              expect.stringContaining('EICAR')
            ])
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

    it('should reject corrupted ZIP file', async () => {
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
      // Set max size to 5MB for testing
      process.env.GEO_UPLOAD_MAX_SIZE_MB = '5';

      // Create a ZIP larger than 5MB
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'a');
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
        delete process.env.GEO_UPLOAD_MAX_SIZE_MB;
      }
    }, 30000);
  });
});
