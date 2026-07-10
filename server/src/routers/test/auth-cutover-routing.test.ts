import { constants } from 'node:http2';

import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import errorHandler from '~/middlewares/error-handler';
import establishmentRepository from '~/repositories/establishmentRepository';
import userPerimeterRepository from '~/repositories/userPerimeterRepository';
import userRepository from '~/repositories/userRepository';
import protectedRouter from '~/routers/protected';
import unprotectedRouter from '~/routers/unprotected';
import { genEstablishmentApi, genUserApi } from '~/test/testFixtures';
import { createTestToken, tokenProvider } from '~/test/testUtils';

vi.mock('~/repositories/userRepository', () => ({
  default: { get: vi.fn(), getByEmailIncludingDeleted: vi.fn() }
}));
vi.mock('~/repositories/establishmentRepository', () => ({
  default: { get: vi.fn() }
}));
vi.mock('~/repositories/userPerimeterRepository', () => ({
  default: { get: vi.fn() }
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(unprotectedRouter);
  app.use(protectedRouter);
  app.use(errorHandler());
  return app;
}

describe('Authentication cutover', () => {
  it('rejects a valid legacy JWT on a protected route', async () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);
    vi.mocked(userRepository.get).mockResolvedValue(user);
    vi.mocked(establishmentRepository.get).mockResolvedValue(establishment);
    vi.mocked(userPerimeterRepository.get).mockResolvedValue(null);
    const token = createTestToken({
      userId: user.id,
      establishmentId: establishment.id
    });

    const response = await request(buildApp())
      .get('/account')
      .set('x-access-token', token);

    expect(response.status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
  });

  it('keeps controller tests authenticated without enabling production JWT auth', async () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);
    vi.mocked(userRepository.get).mockResolvedValue(user);
    vi.mocked(establishmentRepository.get).mockResolvedValue(establishment);
    vi.mocked(userPerimeterRepository.get).mockResolvedValue(null);

    const response = await request(buildApp())
      .get('/account')
      .use(tokenProvider(user));

    expect(response.status).toBe(constants.HTTP_STATUS_OK);
  });

  it('does not expose the legacy password authentication endpoint', async () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);
    vi.mocked(userRepository.get).mockResolvedValue(user);
    vi.mocked(userRepository.getByEmailIncludingDeleted).mockResolvedValue(
      null
    );
    vi.mocked(establishmentRepository.get).mockResolvedValue(establishment);
    vi.mocked(userPerimeterRepository.get).mockResolvedValue(null);

    const response = await request(buildApp())
      .post('/authenticate')
      .use(tokenProvider(user))
      .send({ email: user.email, password: user.password });

    expect(response.status).toBe(constants.HTTP_STATUS_NOT_FOUND);
  });

  it('does not expose the legacy two-factor verification endpoint', async () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);
    vi.mocked(userRepository.get).mockResolvedValue(user);
    vi.mocked(establishmentRepository.get).mockResolvedValue(establishment);
    vi.mocked(userPerimeterRepository.get).mockResolvedValue(null);

    const response = await request(buildApp())
      .post('/authenticate/verify-2fa')
      .use(tokenProvider(user))
      .send({ email: user.email, code: '123456' });

    expect(response.status).toBe(constants.HTTP_STATUS_NOT_FOUND);
  });

  it('does not expose the legacy GET establishment-switch endpoint', async () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);
    vi.mocked(userRepository.get).mockResolvedValue(user);
    vi.mocked(establishmentRepository.get).mockResolvedValue(establishment);
    vi.mocked(userPerimeterRepository.get).mockResolvedValue(null);

    const response = await request(buildApp())
      .get('/account/establishments/not-an-id')
      .use(tokenProvider(user));

    expect(response.status).toBe(constants.HTTP_STATUS_NOT_FOUND);
  });
});
