import { faker } from '@faker-js/faker/locale/fr';
import {
  HousingDocumentDTO,
  UserRole,
  type DocumentDTO
} from '@zerologementvacant/models';
import { Array, Predicate } from 'effect';
import { constants } from 'http2';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';

import type { DeepPartial } from 'ts-essentials';
import { FileValidationError } from '~/errors/fileValidationError';
import config from '~/infra/config';
import { createServer } from '~/infra/server';
import { UserApi } from '~/models/UserApi';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import housingDocumentRepository from '~/repositories/housingDocumentRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  genEstablishmentApi,
  genHousingApi,
  genHousingDocumentApi,
  genUserApi
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Document API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  const establishment = genEstablishmentApi('12345');
  const user: UserApi = {
    ...genUserApi(establishment.id),
    role: UserRole.USUAL
  };
  const admin: UserApi = {
    ...genUserApi(establishment.id),
    role: UserRole.ADMIN
  };
  const anotherUser: UserApi = {
    ...genUserApi(establishment.id),
    role: UserRole.USUAL
  };
  const anotherEstablishment = genEstablishmentApi('23456');
  const userFromAnotherEstablishment = genUserApi(anotherEstablishment.id);

  beforeAll(async () => {
    await Establishments().insert(
      [establishment, anotherEstablishment].map(formatEstablishmentApi)
    );
    await Users().insert(
      [user, admin, anotherUser, userFromAnotherEstablishment].map(
        formatUserApi
      )
    );
  });

  describe('GET /housing/:id/documents', () => {
    const testRoute = (housingId: string) =>
      `/api/housing/${housingId}/documents`;

    const housing = genHousingApi(
      faker.helpers.arrayElement(establishment.geoCodes)
    );
    const anotherHousing = genHousingApi(
      faker.helpers.arrayElement(anotherEstablishment.geoCodes)
    );

    beforeAll(async () => {
      await Housing().insert(
        [housing, anotherHousing].map(formatHousingRecordApi)
      );

      const documents = [
        genHousingDocumentApi(housing, user),
        genHousingDocumentApi(housing, user),
        genHousingDocumentApi(anotherHousing, userFromAnotherEstablishment)
      ];
      await housingDocumentRepository.createMany(documents);
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).get(testRoute(housing.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it("should forbid access to documents of housing outside of an establishment's perimeter", async () => {
      const { status } = await request(url)
        .get(testRoute(anotherHousing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return 200 OK with documents list', async () => {
      const { status, body } = await request(url)
        .get(testRoute(housing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toBeArrayOfSize(2);
    });

    it('should include pre-signed URLs', async () => {
      const { status, body } = await request(url)
        .get(testRoute(housing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toSatisfyAll<HousingDocumentDTO>((doc) => {
        return doc.url.startsWith('http');
      });
    });

    it('should return documents ordered by creation date desc', async () => {
      const { status, body } = await request(url)
        .get(testRoute(housing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toBeSortedBy('createdAt', {
        descending: true
      });
    });
  });

  describe('POST /housing/:id/documents', () => {
    const testRoute = (housingId: string) =>
      `/api/housing/${housingId}/documents`;

    const housing = genHousingApi(
      faker.helpers.arrayElement(establishment.geoCodes)
    );
    const anotherHousing = genHousingApi(
      faker.helpers.arrayElement(anotherEstablishment.geoCodes)
    );

    beforeAll(async () => {
      await Housing().insert(
        [housing, anotherHousing].map(formatHousingRecordApi)
      );
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url)
        .post(testRoute(housing.id))
        .attach('file', Buffer.from('test'), 'test.pdf');

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should forbid uploading to housing outside of an establishment’s perimeter', async () => {
      const { status } = await request(url)
        .post(testRoute(anotherHousing.id))
        .attach('files', Buffer.from('test'), 'test.pdf')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return 400 Bad request if no file is uploaded', async () => {
      const { status } = await request(url)
        .post(testRoute(housing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should return 201 Created with the uploaded document', async () => {
      // Create a valid PDF file
      const pdfBuffer = Buffer.from([
        0x25,
        0x50,
        0x44,
        0x46,
        0x2d, // %PDF-
        0x31,
        0x2e,
        0x34 // 1.4
      ]);

      const tmpPath = path.join(import.meta.dirname, 'test-upload.pdf');
      fs.writeFileSync(tmpPath, pdfBuffer);

      try {
        const { status, body } = await request(url)
          .post(testRoute(housing.id))
          .attach('files', tmpPath)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_CREATED);
        expect(body).toBeArrayOfSize(1);
        expect(body[0]).toMatchObject<DeepPartial<HousingDocumentDTO>>({
          id: expect.any(String),
          filename: 'test-upload.pdf',
          url: expect.stringMatching(/^http/),
          contentType: 'application/pdf',
          sizeBytes: expect.any(Number),
          createdAt: expect.any(String),
          updatedAt: null,
          creator: {
            id: user.id,
            email: user.email
          }
        });
      } finally {
        fs.unlinkSync(tmpPath);
      }
    }, 30000);

    it('should upload multiple valid files and return 201 Created', async () => {
      // Create valid PNG and PDF files
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52
      ]);
      const pdfBuffer = Buffer.from([
        0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34
      ]);

      const pngPath = path.join(import.meta.dirname, 'test-image.png');
      const pdfPath = path.join(import.meta.dirname, 'test-doc.pdf');
      fs.writeFileSync(pngPath, pngBuffer);
      fs.writeFileSync(pdfPath, pdfBuffer);

      try {
        const { status, body } = await request(url)
          .post(testRoute(housing.id))
          .attach('files', pngPath)
          .attach('files', pdfPath)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_CREATED);
        expect(body).toBeArrayOfSize(2);
        expect(body).toSatisfyAll<HousingDocumentDTO>((doc) => {
          return (
            typeof doc.id === 'string' &&
            doc.url.startsWith('http') &&
            doc.creator.id === user.id
          );
        });
      } finally {
        fs.unlinkSync(pngPath);
        fs.unlinkSync(pdfPath);
      }
    }, 30000);

    it('should return 400 Bad Request when all files fail validation', async () => {
      // Create invalid files (text files pretending to be images)
      const invalidBuffer = Buffer.from('This is not an image');
      const tmpPath1 = path.join(import.meta.dirname, 'fake1.png');
      const tmpPath2 = path.join(import.meta.dirname, 'fake2.pdf');
      fs.writeFileSync(tmpPath1, invalidBuffer);
      fs.writeFileSync(tmpPath2, invalidBuffer);

      try {
        const { status, body } = await request(url)
          .post(testRoute(housing.id))
          .attach('files', tmpPath1)
          .attach('files', tmpPath2)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(body).toBeArrayOfSize(2);
        body.forEach((error) => {
          expect(error).toMatchObject<Partial<FileValidationError>>({
            name: 'FileValidationError',
            data: {
              filename: expect.any(String),
              reason: 'invalid_file_type'
            }
          });
        });
      } finally {
        fs.unlinkSync(tmpPath1);
        fs.unlinkSync(tmpPath2);
      }
    }, 30000);

    it('should return 207 Multi-Status with partial success (some valid, some invalid)', async () => {
      // Create one valid PNG and one invalid file
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52
      ]);
      const invalidBuffer = Buffer.from('This is not an image');

      const validPath = path.join(import.meta.dirname, 'valid.png');
      const invalidPath = path.join(import.meta.dirname, 'invalid.png');
      fs.writeFileSync(validPath, pngBuffer);
      fs.writeFileSync(invalidPath, invalidBuffer);

      try {
        const { status, body } = await request(url)
          .post(testRoute(housing.id))
          .attach('files', validPath)
          .attach('files', invalidPath)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_MULTI_STATUS);
        expect(body).toBeArrayOfSize(2);

        // Find the success and error in the response
        const [documents, errors] = Array.partition(
          body as ReadonlyArray<DocumentDTO | FileValidationError>,
          (documentOrError): documentOrError is FileValidationError =>
            Predicate.hasProperty(documentOrError, 'name') &&
            documentOrError.name === 'FileValidationError'
        );
        documents.forEach((document) => {
          expect(document).toMatchObject({
            id: expect.any(String),
            filename: 'valid.png',
            url: expect.stringMatching(/^http/)
          });
        });

        errors.forEach((error) => {
          expect(error).toMatchObject({
            name: 'FileValidationError',
            message: expect.any(String),
            data: {
              filename: 'invalid.png',
              reason: 'invalid_file_type'
            }
          });
        });
      } finally {
        fs.unlinkSync(validPath);
        fs.unlinkSync(invalidPath);
      }
    }, 30000);

    it('should detect MIME type spoofing and return error', async () => {
      // Create a PNG file but declare it as PDF
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52
      ]);

      const tmpPath = path.join(import.meta.dirname, 'spoofed.pdf');
      fs.writeFileSync(tmpPath, pngBuffer);

      try {
        const { status, body } = await request(url)
          .post(testRoute(housing.id))
          .attach('files', tmpPath)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(body).toBeArrayOfSize(1);
        expect(body[0]).toMatchObject({
          name: 'FileValidationError',
          message: expect.stringContaining('does not match'),
          data: {
            filename: 'spoofed.pdf',
            reason: 'mime_mismatch'
          }
        });
      } finally {
        fs.unlinkSync(tmpPath);
      }
    }, 30000);

    // Test runs only when ClamAV is enabled (CLAMAV_ENABLED=true)
    const itIfClamavEnabled = config.clamav.enabled ? it : it.skip;

    itIfClamavEnabled(
      'should return 207 Multi-Status when virus detected in one of multiple files',
      async () => {
        // EICAR test file - standard antivirus test string
        const EICAR_TEST_FILE =
          'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

        // Create one valid PNG and one EICAR test file
        const pngBuffer = Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00,
          0x0d, 0x49, 0x48, 0x44, 0x52
        ]);

        const validPath = path.join(import.meta.dirname, 'clean.png');
        const virusPath = path.join(import.meta.dirname, 'eicar.pdf');
        fs.writeFileSync(validPath, pngBuffer);
        fs.writeFileSync(virusPath, EICAR_TEST_FILE);

        try {
          const { status, body } = await request(url)
            .post(testRoute(housing.id))
            .attach('files', validPath)
            .attach('files', virusPath)
            .use(tokenProvider(user));

          expect(status).toBe(constants.HTTP_STATUS_MULTI_STATUS);
          expect(body).toBeArrayOfSize(2);

          const success = body.find(
            (item: any) => !item.name || item.name !== 'FileValidationError'
          );
          const error = body.find(
            (item: any) => item.name === 'FileValidationError'
          );

          expect(success).toMatchObject({
            filename: 'clean.png'
          });
          expect(success.creator.id).toBe(user.id);

          expect(error).toMatchObject({
            name: 'FileValidationError',
            filename: 'eicar.pdf',
            reason: 'virus_detected',
            message: expect.stringContaining('malicious content'),
            details: {
              viruses: expect.arrayContaining([
                expect.stringContaining('EICAR')
              ])
            }
          });
        } finally {
          fs.unlinkSync(validPath);
          fs.unlinkSync(virusPath);
        }
      },
      30000
    );
  });

  describe('PUT /documents/:id', () => {
    const testRoute = (documentId: string) => `/api/documents/${documentId}`;

    const housing = genHousingApi(
      faker.helpers.arrayElement(establishment.geoCodes)
    );
    const userDocument = genHousingDocumentApi(housing, user);
    const anotherUserDocument = genHousingDocumentApi(housing, anotherUser);

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housing));
      await housingDocumentRepository.createMany([
        userDocument,
        anotherUserDocument
      ]);
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url)
        .put(testRoute(userDocument.id))
        .send({ filename: 'nouveau-nom.pdf' });

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should return 404 Not found if document does not exist', async () => {
      const { status } = await request(url)
        .put(testRoute(faker.string.uuid()))
        .send({ filename: 'nouveau-nom.pdf' })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should forbid updating a document created by another user', async () => {
      const { status } = await request(url)
        .put(testRoute(anotherUserDocument.id))
        .send({ filename: 'nouveau-nom.pdf' })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
    });

    it('should allow admin to update any document', async () => {
      const { status, body } = await request(url)
        .put(testRoute(anotherUserDocument.id))
        .send({ filename: 'admin-rename.pdf' })
        .use(tokenProvider(admin));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<Partial<HousingDocumentDTO>>({
        id: anotherUserDocument.id,
        filename: 'admin-rename.pdf',
        updatedAt: expect.any(String)
      });
    });

    it('should return 200 OK with updated document', async () => {
      const { status, body } = await request(url)
        .put(testRoute(userDocument.id))
        .send({ filename: 'nouveau-nom.pdf' })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<Partial<HousingDocumentDTO>>({
        id: userDocument.id,
        filename: 'nouveau-nom.pdf',
        url: expect.stringMatching(/^http/),
        updatedAt: expect.any(String)
      });
    });

    it('should return 400 Bad request if filename is missing', async () => {
      const { status } = await request(url)
        .put(testRoute(userDocument.id))
        .send({})
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });
  });

  describe('DELETE /documents/:id', () => {
    const testRoute = (documentId: string) => `/api/documents/${documentId}`;

    const housing = genHousingApi(
      faker.helpers.arrayElement(establishment.geoCodes)
    );

    it('should be forbidden for a non-authenticated user', async () => {
      const document = genHousingDocumentApi(housing, user);
      await Housing().insert(formatHousingRecordApi(housing));
      await housingDocumentRepository.create(document);

      const { status } = await request(url).delete(testRoute(document.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should return 404 Not found if document does not exist', async () => {
      const { status } = await request(url)
        .delete(testRoute(faker.string.uuid()))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should forbid deleting a document created by another user', async () => {
      const document = genHousingDocumentApi(housing, anotherUser);
      await housingDocumentRepository.create(document);

      const { status } = await request(url)
        .delete(testRoute(document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
    });

    it('should allow admin to delete any document', async () => {
      const document = genHousingDocumentApi(housing, anotherUser);
      await housingDocumentRepository.create(document);

      const { status } = await request(url)
        .delete(testRoute(document.id))
        .use(tokenProvider(admin));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
    });

    it('should return 204 No content after deletion', async () => {
      const document = genHousingDocumentApi(housing, user);
      await housingDocumentRepository.create(document);

      const { status } = await request(url)
        .delete(testRoute(document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
    });

    it('should soft-delete the document', async () => {
      const document = genHousingDocumentApi(housing, user);
      await housingDocumentRepository.create(document);

      await request(url)
        .delete(testRoute(document.id))
        .use(tokenProvider(user));

      const deletedDocument = await housingDocumentRepository.get(document.id);

      expect(deletedDocument).not.toBeNull();
      expect(deletedDocument!.deletedAt).not.toBeNull();
    });
  });
});
