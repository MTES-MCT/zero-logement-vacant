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

  function setup(options?: { verifyAdminTwoFactor?: () => Promise<void> }) {
    const router = createMemoryRouter(
      [
        { path: '/verification-2fa', element: <TwoFactorView /> },
        { path: '/admin', element: 'Admin login' },
        { path: '/parc-de-logements', element: 'Parc de logements' }
      ],
      {
        initialEntries: [
          {
            pathname: '/verification-2fa',
            state: {
              authMode: 'auth-v2',
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

  it('prevents duplicate auth-v2 verification submissions while pending', async () => {
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
