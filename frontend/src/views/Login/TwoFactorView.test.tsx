import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { vi } from 'vitest';

import { genAuthContextValue, MockAuthProvider } from '~/test/auth';
import configureTestStore from '~/utils/storeUtils';

import TwoFactorView from './TwoFactorView';

describe('two factor view', () => {
  const user = userEvent.setup();

  function setup(options?: {
    verifyAdminTwoFactor?: () => Promise<void>;
    withChallenge?: boolean;
  }) {
    const router = createMemoryRouter(
      [
        { path: '/verification-2fa', element: <TwoFactorView /> },
        { path: '/admin', element: 'Admin login' },
        { path: '/parc-de-logements', element: 'Parc de logements' }
      ],
      {
        initialEntries:
          options?.withChallenge === false
            ? ['/verification-2fa']
            : [
                {
                  pathname: '/verification-2fa',
                  state: {
                    email: 'admin@zlv.fr',
                    establishmentId: 'establishment-id'
                  }
                }
              ]
      }
    );

    render(
      <Provider store={configureTestStore()}>
        <MockAuthProvider
          value={{
            ...genAuthContextValue(),
            verifyAdminTwoFactor:
              options?.verifyAdminTwoFactor ?? (async () => {})
          }}
        >
          <RouterProvider router={router} />
        </MockAuthProvider>
      </Provider>
    );
  }

  it('redirects an incomplete challenge outside the render phase', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    setup({ withChallenge: false });

    expect(await screen.findByText('Admin login')).toBeVisible();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('prevents duplicate verification submissions while pending', async () => {
    const verifyAdminTwoFactor = vi.fn(() => new Promise<void>(() => {}));
    setup({ verifyAdminTwoFactor });

    await user.type(screen.getByLabelText(/^Code de vérification/), '123456');

    const verify = screen.getByRole('button', { name: /Vérifier/ });
    await user.dblClick(verify);

    expect(verifyAdminTwoFactor).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole('button', { name: /Vérification/ })
    ).toBeDisabled();
  });
});
