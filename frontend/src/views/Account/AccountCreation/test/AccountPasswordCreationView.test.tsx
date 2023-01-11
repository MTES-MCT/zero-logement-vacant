import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { render, screen, waitFor } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { genProspect, genSignupLink } from '../../../../../test/fixtures.test';
import AccountPasswordCreationView from '../AccountPasswordCreationView';
import { Provider } from 'react-redux';
import { applyMiddleware, createStore } from 'redux';
import applicationReducer from '../../../../store/reducers/applicationReducers';
import thunk from 'redux-thunk';
import prospectService from '../../../../services/prospect.service';
import { Prospect } from '../../../../models/Prospect';

describe('AccountPasswordCreationView', () => {
  const user = userEvent.setup();
  const history = createMemoryHistory();
  const store = createStore(applicationReducer, {}, applyMiddleware(thunk));
  const email = 'ok@beta.gouv.fr';
  const link = genSignupLink(email);
  const prospect: Prospect = {
    ...genProspect(),
    email,
    hasAccount: true,
    hasCommitment: true,
  };

  function setup() {
    history.push({
      pathname: '/inscription/mot-de-passe',
      hash: `#${link.id}`,
    });
    render(
      <Provider store={store}>
        <Router history={history}>
          <AccountPasswordCreationView />
        </Router>
      </Provider>
    );
  }

  function mockProspectServicePass(value: Prospect = prospect) {
    jest.spyOn(prospectService, 'upsert').mockResolvedValue(value);
  }

  function mockProspectServiceFail() {
    jest.spyOn(prospectService, 'upsert').mockRejectedValue(new Error());
  }

  it('should render', async () => {
    mockProspectServicePass();
    setup();

    await screen.findAllByText('Créer votre mot de passe');
  });

  it('should display an error if the link is expired', async () => {
    mockProspectServiceFail();
    setup();

    await screen.findByText('Ce lien n’existe pas ou est expiré !');
  });

  it("should be forbidden if one's establishment does not exist in ZLV", async () => {
    mockProspectServicePass({
      ...prospect,
      establishment: null,
    });
    setup();

    await waitFor(() => {
      expect(history.location.pathname).toBe('/inscription/impossible');
    });
  });

  it('should be forbidden if one has no account', async () => {
    mockProspectServicePass({
      ...prospect,
      hasAccount: true,
      hasCommitment: false,
    });
    setup();

    await waitFor(() => {
      expect(history.location.pathname).toBe('/inscription/en-attente');
    });
  });

  it("should be forbidden if one's account is waiting for approval", async () => {
    mockProspectServicePass({
      ...prospect,
      hasAccount: false,
      hasCommitment: false,
    });
    setup();

    await waitFor(() => {
      expect(history.location.pathname).toBe('/inscription/impossible');
    });
  });

  it('should go back to the previous step', async () => {
    mockProspectServicePass();
    setup();

    const previous = await screen.findByText('Revenir à l’étape précédente');
    await user.click(previous);

    expect(history.location.pathname).toBe('/inscription/email');
  });

  it('should choose a password', async () => {
    mockProspectServicePass();
    setup();
    const password = '123QWEasd';

    const passwordInput = await screen.findByLabelText(
      /Créer votre mot de passe/
    );
    await user.type(passwordInput, password);
    const confirmationInput = await screen.findByLabelText(
      /Confirmer votre mot de passe/
    );
    await user.type(confirmationInput, password);
    await user.keyboard('{Enter}');

    expect(history.location.pathname).toBe('/inscription/campagne');
    expect(history.location.state).toStrictEqual({
      prospect,
      password,
    });
  });
});
