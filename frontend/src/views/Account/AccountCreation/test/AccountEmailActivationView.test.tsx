import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { startReactDsfr } from '@codegouvfr/react-dsfr/spa';

import AccountEmailActivationView from '../AccountEmailActivationView';
import { store } from '../../../../store/store';
import { signupLinkApi } from '../../../../services/signup-link.service';
import Notification from '../../../../components/Notification/Notification';

describe('AccountEmailActivationView', () => {
  const user = userEvent.setup();

  describe('Without passing an email in route state', () => {
    function setup() {
      const router = createMemoryRouter(
        [
          { path: '/inscription/email', element: 'Créer votre compte' },
          {
            path: '/inscription/activation',
            element: <AccountEmailActivationView />
          }
        ],
        {
          initialEntries: ['/inscription/activation']
        }
      );
      render(
        <Provider store={store}>
          <Notification />
          <RouterProvider router={router} />
        </Provider>
      );
    }

    it('should redirect to /inscription/email', () => {
      setup();

      const title = screen.getByText(/^Créer votre compte/);
      expect(title).toBeVisible();
    });
  });

  describe('With an email', () => {
    function setup() {
      const router = createMemoryRouter(
        [
          { path: '/inscription/email', element: 'Créer votre compte' },
          {
            path: '/inscription/activation',
            element: <AccountEmailActivationView />
          }
        ],
        {
          initialEntries: [
            {
              pathname: '/inscription/activation',
              state: { email: 'ok@beta.gouv.fr' }
            }
          ]
        }
      );
      render(
        <Provider store={store}>
          <Notification />
          <RouterProvider router={router} />
        </Provider>
      );
    }

    it('should render', async () => {
      setup();

      const heading = screen.getByRole('heading', {
        name: /Créez votre compte/i
      });
      expect(heading).toBeVisible();
    });

    it('should send an email again', async () => {
      const sendActivationEmail = jest.spyOn(
        signupLinkApi.endpoints.sendActivationEmail,
        'initiate'
      );
      setup();

      const sendAgain = screen.getByText(/renvoyez un e-mail de vérification/i);
      await user.click(sendAgain);

      expect(sendActivationEmail).toHaveBeenCalledWith('ok@beta.gouv.fr', {
        fixedCacheKey: undefined
      });
      const sent = await screen.findByText('Email envoyé');
      expect(sent).toBeVisible();
    });

    it('should go back to /inscription/email', async () => {
      // This is needed to inject `linkProps` into the `Button` component
      startReactDsfr({
        defaultColorScheme: 'light',
        Link
      });

      setup();

      const back = screen.getByText(/^Revenir à l’étape précédente/i);
      await user.click(back);
      const signUp = screen.getByText(/^Créer votre compte/);
      expect(signUp).toBeVisible();
    });
  });
});
