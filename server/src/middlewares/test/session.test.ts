import { UserRole } from '@zerologementvacant/models';
import express from 'express';
import Router from 'express-promise-router';
import { constants } from 'http2';
import request from 'supertest';
import { vi } from 'vitest';

import errorHandler from '~/middlewares/error-handler';
import { sessionCheck } from '~/middlewares/session';
import { auth } from '~/infra/auth';
import * as userRepositoryModule from '~/repositories/userRepository';
import * as establishmentRepositoryModule from '~/repositories/establishmentRepository';
import * as userPerimeterRepositoryModule from '~/repositories/userPerimeterRepository';
import { genEstablishmentApi, genUserApi } from '~/test/testFixtures';

vi.mock('~/infra/auth', () => ({
  auth: { api: { getSession: vi.fn() } }
}));
vi.mock('~/repositories/userRepository', () => ({
  default: { get: vi.fn() }
}));
vi.mock('~/repositories/establishmentRepository', () => ({
  default: { get: vi.fn() }
}));
vi.mock('~/repositories/userPerimeterRepository', () => ({
  default: { get: vi.fn() }
}));

const mockGetSession = vi.mocked(auth.api.getSession);
const mockUserGet = vi.mocked(
  (userRepositoryModule as any).default.get as (id: string) => Promise<any>
);
const mockEstablishmentGet = vi.mocked(
  (establishmentRepositoryModule as any).default.get as (
    id: string
  ) => Promise<any>
);
const mockUserPerimeterGet = vi.mocked(
  (userPerimeterRepositoryModule as any).default.get as (
    id: string
  ) => Promise<any>
);

function buildApp(middleware: ReturnType<typeof sessionCheck>) {
  const app = express();
  const router = Router();
  router.get('/probe', middleware, (req, res) => {
    res.status(constants.HTTP_STATUS_OK).json({
      userId: (req as any).user?.id ?? null,
      establishmentId: (req as any).establishment?.id ?? null
    });
  });
  app.use(router);
  app.use(errorHandler());
  return app;
}

describe('sessionCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responds 401 when no session and required is true (default)', async () => {
    mockGetSession.mockResolvedValue(null as any);

    const { status } = await request(buildApp(sessionCheck())).get('/probe');

    expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
  });

  it('responds 200 with null user when no session and required is false', async () => {
    mockGetSession.mockResolvedValue(null as any);

    const response = await request(
      buildApp(sessionCheck({ required: false }))
    ).get('/probe');

    expect(response.status).toBe(constants.HTTP_STATUS_OK);
    expect(response.body.userId).toBeNull();
  });

  it('populates req.user and req.establishment from session', async () => {
    const establishment = genEstablishmentApi();
    const user = { ...genUserApi(establishment.id), role: UserRole.USUAL };
    mockGetSession.mockResolvedValue({
      user: { id: user.id },
      session: { userId: user.id, activeEstablishmentId: establishment.id }
    } as any);
    mockUserGet.mockResolvedValue(user);
    mockEstablishmentGet.mockResolvedValue(establishment);
    mockUserPerimeterGet.mockResolvedValue(null);

    const response = await request(buildApp(sessionCheck())).get('/probe');

    expect(response.status).toBe(constants.HTTP_STATUS_OK);
    expect(response.body.userId).toBe(user.id);
    expect(response.body.establishmentId).toBe(establishment.id);
  });
});
