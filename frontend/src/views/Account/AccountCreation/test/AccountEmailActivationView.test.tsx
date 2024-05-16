import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter as Router, Route } from 'react-router-dom';
import AccountEmailActivationView from '../AccountEmailActivationView';
import { Provider } from 'react-redux';
import { store } from '../../../../store/store';
import { signupLinkApi } from '../../../../services/signup-link.service';

describe('AccountEmailActivationView', () => {
  const user = userEvent.setup();

  describe('Without passing an email in route state', () => {
    function setup() {
      render(
        <Provider store={store}>
          <Router initialEntries={['/inscription/activation']}>
            <Route path="/inscription/email">Créer votre compte</Route>
            <Route
              path="/inscription/activation"
              component={AccountEmailActivationView}
            />
          </Router>
        </Provider>,
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
      render(
        <Provider store={store}>
          <Router
            initialEntries={[
              {
                pathname: '/inscription/activation',
                state: {
                  email: 'ok@beta.gouv.fr',
                },
              },
            ]}
          >
            <Route
              path="/inscription/activation"
              component={AccountEmailActivationView}
            />
          </Router>
        </Provider>,
      );
    }

    it('should render', async () => {
      setup();

      const title = screen.getByText(
        'Vous devez confirmer votre adresse mail.',
      );

      expect(title).toBeVisible();
    });

    it('should send an email again', async () => {
      const sendActivationEmail = jest.spyOn(
        signupLinkApi.endpoints.sendActivationEmail,
        'initiate',
      );
      setup();

      const sendAgain = screen.getByText(/renvoyer le mail/i);
      await user.click(sendAgain);

      expect(sendActivationEmail).toHaveBeenCalledWith('ok@beta.gouv.fr', {
        fixedCacheKey: undefined,
      });
      const sent = screen.getByText('Email envoyé.');
      expect(sent).toBeVisible();
    });
  });
});
