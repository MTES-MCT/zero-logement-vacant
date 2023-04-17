import request from 'supertest';
import { constants } from 'http2';
import randomstring from 'randomstring';
import { User1 } from '../../database/seeds/test/003-users';
import { genEmail, genSignupLinkApi, genSiren } from '../test/testFixtures';
import { createServer } from '../server';
import signupLinkRepository from '../repositories/signupLinkRepository';
import { ProspectApi } from '../models/ProspectApi';
import ceremaService from '../services/ceremaService';
import { SignupLinkApi } from '../models/SignupLinkApi';
import { subHours } from 'date-fns';
import { Prospect1 } from '../../database/seeds/test/007-prospects';
import {
  Establishment1,
  Establishment2,
} from '../../database/seeds/test/001-establishments';

describe('Prospect controller', () => {
  const { app } = createServer();

  describe('create', () => {
    const testRoute = (link: string) => `/api/signup-links/${link}/prospect`;

    it('should receive a valid link', async () => {
      // No link
      await request(app)
        .put(testRoute('1'))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should return forbidden when a user already exist', async () => {
      const link = genSignupLinkApi(User1.email);
      await signupLinkRepository.insert(link);

      const { status } = await request(app).put(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
    });

    it('should return not found when the signup link is missing', async () => {
      const email = genEmail();
      const link = genSignupLinkApi(email);

      const { status } = await request(app).put(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should be impossible when the signup link is expired', async () => {
      const email = genEmail();
      const link: SignupLinkApi = {
        ...genSignupLinkApi(email),
        expiresAt: subHours(new Date(), 24),
      };
      await signupLinkRepository.insert(link);

      const { status } = await request(app).put(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_GONE);
    });

    it('should create a prospect for the first known establishment with lovac ok', async () => {
      const email = genEmail();
      const link = genSignupLinkApi(email);
      await signupLinkRepository.insert(link);
      jest.spyOn(ceremaService, 'consultUsers').mockResolvedValue([
        {
          email,
          establishmentSiren: genSiren(),
          hasAccount: false,
          hasCommitment: true,
        },
        {
          email,
          establishmentSiren: Establishment1.siren,
          hasAccount: true,
          hasCommitment: false,
        },
        {
          email,
          establishmentSiren: Establishment2.siren,
          hasAccount: true,
          hasCommitment: true,
        },
      ]);

      const { body, status } = await request(app).put(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject<ProspectApi>({
        email,
        establishment: Establishment2,
        hasAccount: true,
        hasCommitment: true,
      });
    });

    it('should create a prospect with an unknown establishment', async () => {
      const email = genEmail();
      const link = genSignupLinkApi(email);
      await signupLinkRepository.insert(link);
      jest.spyOn(ceremaService, 'consultUsers').mockResolvedValue([
        {
          email,
          establishmentSiren: genSiren(),
          hasAccount: true,
          hasCommitment: true,
        },
      ]);

      const { body, status } = await request(app).put(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject<ProspectApi>({
        email,
        hasAccount: true,
        hasCommitment: true,
      });
    });

    it('should update and return the prospect if they already exist', async () => {
      const email = Prospect1.email;
      const link = genSignupLinkApi(email);
      const siren = Establishment2.siren;
      await signupLinkRepository.insert(link);
      jest.spyOn(ceremaService, 'consultUsers').mockResolvedValue([
        {
          email,
          establishmentSiren: siren,
          hasAccount: true,
          hasCommitment: true,
        },
      ]);

      const { body, status } = await request(app).put(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<ProspectApi>({
        email,
        establishment: Establishment2,
        hasAccount: true,
        hasCommitment: true,
      });
    });
  });

  describe('show', () => {
    const testRoute = (email: string) => `/api/prospects/${email}`;

    it('should receive a valid email', async () => {
      await request(app)
        .get(testRoute('a'))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
      // Bad email
      await request(app)
        .get(testRoute(randomstring.generate()))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should return not found if the prospect is missing', async () => {
      const { status } = await request(app).get(testRoute('test@test.test'));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return the prospect otherwise', async () => {
      const prospect = Prospect1;

      const { body, status } = await request(app).get(
        testRoute(prospect.email)
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual<ProspectApi>(prospect);
    });
  });
});
