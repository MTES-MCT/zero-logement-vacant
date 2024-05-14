import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { MemoryRouter as Router, Route } from 'react-router-dom';
import {
  genAuthUser,
  genProspect,
  genSignupLink,
} from '../../../../../test/fixtures.test';
import AccountPasswordCreationView from '../AccountPasswordCreationView';
import { Provider } from 'react-redux';
import prospectService from '../../../../services/prospect.service';
import { Prospect } from '../../../../models/Prospect';
import { configureStore } from '@reduxjs/toolkit';
import { applicationReducer } from '../../../../store/store';
import AccountCampaignIntentCreationView from '../AccountCampaignIntentCreationView';

describe('AccountPasswordCreationView', () => {
  const user = userEvent.setup();
  const store = configureStore({
    reducer: applicationReducer,
    preloadedState: { authentication: { authUser: genAuthUser() } },
  });
  const email = 'ok@beta.gouv.fr';
  const link = genSignupLink(email);
  const prospect: Prospect = {
    ...genProspect(),
    email,
    hasAccount: true,
    hasCommitment: true,
  };

  function setup() {
    render(
      <Provider store={store}>
        <Router
          initialEntries={[
            {
              pathname: '/inscription/mot-de-passe',
              hash: `#${link.id}`,
            },
          ]}
        >
          <Route path="/inscription/en-attente">En attente</Route>
          <Route path="/inscription/impossible">Impossible</Route>
          <Route path="/inscription/email">Email</Route>
          <Route
            path="/inscription/mot-de-passe"
            component={AccountPasswordCreationView}
          />
          <Route
            path="/inscription/campagne"
            component={AccountCampaignIntentCreationView}
          />
        </Router>
      </Provider>,
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

    const title = await screen.findByText('Impossible');
    expect(title).toBeVisible();
  });

  it('should be forbidden if one has no account', async () => {
    mockProspectServicePass({
      ...prospect,
      hasAccount: true,
      hasCommitment: false,
    });
    setup();

    const title = await screen.findByText('En attente');
    expect(title).toBeVisible();
  });

  it("should be forbidden if one's account is waiting for approval", async () => {
    mockProspectServicePass({
      ...prospect,
      hasAccount: false,
      hasCommitment: false,
    });
    setup();

    const title = await screen.findByText('Impossible');
    expect(title).toBeVisible();
  });

  it('should go back to the previous step', async () => {
    mockProspectServicePass();
    setup();

    const previous = await screen.findByText('Revenir à l’étape précédente');
    await user.click(previous);

    const title = await screen.findByText('Email');
    expect(title).toBeVisible();
  });

  it('should choose a password', async () => {
    mockProspectServicePass();
    setup();
    const password = '123QWEasd';

    const passwordInput = await screen.findByLabelText(
      /Créer votre mot de passe/,
    );
    await user.type(passwordInput, password);
    const confirmationInput = await screen.findByLabelText(
      /Confirmer votre mot de passe/,
    );
    await user.type(confirmationInput, password);
    await user.keyboard('{Enter}');

    const title = await screen.findByText(/^Vos intentions de campagne/);
    expect(title).toBeVisible();
  });
});
