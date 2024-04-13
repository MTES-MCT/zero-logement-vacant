import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import AccountEmailActivationView from '../AccountEmailActivationView';
import { Provider } from 'react-redux';
import { store } from '../../../../store/store';
import { signupLinkApi } from '../../../../services/signup-link.service';

describe('AccountEmailActivationView', () => {
  const user = userEvent.setup();
  const history = createMemoryHistory();

  describe('Without passing an email in route state', () => {
    function setup() {
      render(
        <Provider store={store}>
          <Router history={history}>
            <AccountEmailActivationView />
          </Router>
        </Provider>
      );
    }

    it('should redirect to /inscription/email', () => {
      setup();
      expect(history.location.pathname).toBe('/inscription/email');
    });
  });

  describe('With an email', () => {
    function setup() {
      history.push({
        pathname: '/inscription/activation',
        state: {
          email: 'ok@beta.gouv.fr',
        },
      });
      render(
        <Provider store={store}>
          <Router history={history}>
            <AccountEmailActivationView />
          </Router>
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
        fixedCacheKey: undefined,
      });
      const sent = screen.getByText('Email envoyé.');
      expect(sent).toBeVisible();
    });
  });
});
