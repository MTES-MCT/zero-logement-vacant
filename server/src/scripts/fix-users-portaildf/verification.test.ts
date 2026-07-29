import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import userRepository from '~/repositories/userRepository';
import { genEstablishmentApi, genUserApi } from '~/test/testFixtures';

import { verifyUsers } from './verification';

vi.mock('~/repositories/userRepository', () => ({
  default: { getByEmail: vi.fn(), remove: vi.fn() }
}));

const auth = {
  apiUrl: 'https://portail-df.example.test',
  authorization: 'Bearer access-token'
};

describe('verifyUsers', () => {
  beforeEach(() => {
    nock.cleanAll();
    nock.disableNetConnect();
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
    vi.restoreAllMocks();
  });

  it.each([
    { label: 'missing from Portail DF', results: [] },
    { label: 'present in Portail DF', results: [{}] }
  ])('removes a listed local user when it is $label', async ({ results }) => {
    const email = 'user@example.test';
    const user = genUserApi(genEstablishmentApi().id);
    vi.mocked(userRepository.getByEmail).mockResolvedValue(user);
    nock(auth.apiUrl)
      .get('/api/utilisateurs')
      .query({ email })
      .reply(200, { results });

    await verifyUsers(auth, [email]);

    expect(userRepository.remove).toHaveBeenCalledWith(user.id);
  });
});
