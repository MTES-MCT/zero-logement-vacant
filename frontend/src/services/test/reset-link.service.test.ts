import { http, HttpResponse } from 'msw';

import { mockAPI } from '~/mocks/mock-api';
import config from '~/utils/config';

import resetLinkService from '../reset-link.service';

describe('Reset link service', () => {
  it('resets a password with an anonymous reset link', async () => {
    let requestBody: unknown;
    mockAPI.use(
      http.post(
        `${config.apiEndpoint}/account/reset-password`,
        async ({ request }) => {
          requestBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }
      )
    );

    await resetLinkService.resetPassword('reset-link-key', 'new-password');

    expect(requestBody).toEqual({
      key: 'reset-link-key',
      password: 'new-password'
    });
  });
});
