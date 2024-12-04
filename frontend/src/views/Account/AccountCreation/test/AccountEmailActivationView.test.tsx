import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import AccountEmailActivationView from '../AccountEmailActivationView';
import { Provider } from 'react-redux';
import { store } from '../../../../store/store';
import { signupLinkApi } from '../../../../services/signup-link.service';

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
          <RouterProvider router={router} />
        </Provider>
      );
    }

    it('should render', async () => {
      setup();

      const title = screen.getByText(
        'Vous devez confirmer votre adresse mail.'
      );

      expect(title).toBeVisible();
    });

    it('should send an email again', async () => {
      const sendActivationEmail = jest.spyOn(
        signupLinkApi.endpoints.sendActivationEmail,
        'initiate'
      );
      setup();

      const sendAgain = screen.getByText(/renvoyer le mail/i);
      await user.click(sendAgain);

      expect(sendActivationEmail).toHaveBeenCalledWith('ok@beta.gouv.fr', {
        fixedCacheKey: undefined
      });
      const sent = screen.getByText('Email envoyé.');
      expect(sent).toBeVisible();
    });
  });
});
