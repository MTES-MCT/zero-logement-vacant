import { vi } from 'vitest';
import request from 'supertest';
import { constants } from 'http2';
import randomstring from 'randomstring';
import {
  genEmail,
  genEstablishmentApi,
  genProspectApi,
  genSignupLinkApi,
  genSiren,
  genUserApi
} from '~/test/testFixtures';
import { createServer } from '~/infra/server';
import signupLinkRepository, {
  formatSignupLinkApi,
  SignupLinks
} from '~/repositories/signupLinkRepository';
import { ProspectApi } from '~/models/ProspectApi';
import ceremaService from '~/services/ceremaService';
import { SignupLinkApi } from '~/models/SignupLinkApi';
import { subHours } from 'date-fns';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  formatProspectApi,
  Prospects
} from '~/repositories/prospectRepository';

describe('Prospect API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  const establishment = genEstablishmentApi();
  const anotherEstablishment = genEstablishmentApi();

  beforeAll(async () => {
    await Establishments().insert(
      [establishment, anotherEstablishment].map(formatEstablishmentApi)
    );
  });

  describe('PUT /signup-links/{link}/prospect', () => {
    const testRoute = (link: string) => `/api/signup-links/${link}/prospect`;

    it('should receive a valid link', async () => {
      // No link
      await request(url)
        .put(testRoute('1'))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should return forbidden when a user already exist', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(formatUserApi(user));
      const link = genSignupLinkApi(user.email);
      await SignupLinks().insert(formatSignupLinkApi(link));

      const { status } = await request(url).put(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
    });

    it('should return not found when the signup link is missing', async () => {
      const email = genEmail();
      const link = genSignupLinkApi(email);

      const { status } = await request(url).put(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should be impossible when the signup link is expired', async () => {
      const email = genEmail();
      const link: SignupLinkApi = {
        ...genSignupLinkApi(email),
        expiresAt: subHours(new Date(), 24)
      };
      await signupLinkRepository.insert(link);

      const { status } = await request(url).put(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_GONE);
    });

    it('should create a prospect for the first known establishment with lovac ok', async () => {
      const email = genEmail();
      const link = genSignupLinkApi(email);
      await SignupLinks().insert(formatSignupLinkApi(link));
      vi.spyOn(ceremaService, 'consultUsers').mockResolvedValue([
        {
          email,
          establishmentSiren: genSiren(),
          hasAccount: false,
          hasCommitment: true
        },
        {
          email,
          establishmentSiren: establishment.siren,
          hasAccount: true,
          hasCommitment: false
        },
        {
          email,
          establishmentSiren: anotherEstablishment.siren,
          hasAccount: true,
          hasCommitment: true
        }
      ]);

      const { body, status } = await request(url).put(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject<ProspectApi>({
        email,
        establishment: anotherEstablishment,
        hasAccount: true,
        hasCommitment: true,
        lastAccountRequestAt: expect.any(String)
      });
    });

    it('should create a prospect with an unknown establishment', async () => {
      const email = genEmail();
      const link = genSignupLinkApi(email);
      await SignupLinks().insert(formatSignupLinkApi(link));
      vi.spyOn(ceremaService, 'consultUsers').mockResolvedValue([
        {
          email,
          establishmentSiren: genSiren(),
          hasAccount: true,
          hasCommitment: true
        }
      ]);

      const { body, status } = await request(url).put(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject<ProspectApi>({
        email,
        hasAccount: true,
        hasCommitment: true,
        lastAccountRequestAt: expect.any(String)
      });
    });

    it('should update and return the prospect if they already exist', async () => {
      const prospect = genProspectApi(establishment);
      await Prospects().insert(formatProspectApi(prospect));
      const email = prospect.email;
      const link = genSignupLinkApi(email);
      const siren = establishment.siren;
      await SignupLinks().insert(formatSignupLinkApi(link));
      vi.spyOn(ceremaService, 'consultUsers').mockResolvedValue([
        {
          email,
          establishmentSiren: siren,
          hasAccount: true,
          hasCommitment: true
        }
      ]);

      const { body, status } = await request(url).put(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<ProspectApi>({
        email,
        establishment,
        hasAccount: true,
        hasCommitment: true,
        lastAccountRequestAt: expect.any(String)
      });
    });

    it('should have hasCommitment=true when at least one account has commitment, even if first account does not', async () => {
      const email = genEmail();
      const link = genSignupLinkApi(email);
      await SignupLinks().insert(formatSignupLinkApi(link));

      // Simulate the case where first account has no commitment but others do
      // This covers the scenario where a user has multiple Cerema accounts
      vi.spyOn(ceremaService, 'consultUsers').mockResolvedValue([
        {
          email,
          establishmentSiren: genSiren(), // Unknown establishment without commitment
          hasAccount: true,
          hasCommitment: false
        },
        {
          email,
          establishmentSiren: establishment.siren, // Known establishment with commitment
          hasAccount: true,
          hasCommitment: true
        },
        {
          email,
          establishmentSiren: anotherEstablishment.siren, // Another known establishment with commitment
          hasAccount: true,
          hasCommitment: true
        }
      ]);

      const { body, status } = await request(url).put(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject<ProspectApi>({
        email,
        // The repository orders by name, so we can't predict which establishment will be returned
        // We just verify it's one of the two with commitment
        establishment: expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          siren: expect.stringMatching(new RegExp(`(${establishment.siren}|${anotherEstablishment.siren})`))
        }),
        hasAccount: true,
        hasCommitment: true, // Should be true because at least one account has commitment
        lastAccountRequestAt: expect.any(String)
      });
    });
  });

  describe('GET /prospects/{email}', () => {
    const testRoute = (email: string) => `/api/prospects/${email}`;

    it('should receive a valid email', async () => {
      await request(url)
        .get(testRoute('a'))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
      // Bad email
      await request(url)
        .get(testRoute(randomstring.generate()))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should return not found if the prospect is missing', async () => {
      const { status } = await request(url).get(testRoute('test@test.test'));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return the prospect otherwise', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const prospect = genProspectApi(establishment);
      await Prospects().insert(formatProspectApi(prospect));

      const { body, status } = await request(url).get(
        testRoute(prospect.email)
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<Partial<ProspectApi>>({
        ...prospect,
        lastAccountRequestAt: expect.any(String)
      });
    });
  });
});
