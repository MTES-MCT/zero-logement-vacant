import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { genProspect, genSignupLink } from '../../../../../test/fixtures.test';
import AccountPasswordCreationView from '../AccountPasswordCreationView';
import { Provider } from 'react-redux';
import prospectService from '../../../../services/prospect.service';
import { Prospect } from '../../../../models/Prospect';
import AccountCampaignIntentCreationView from '../AccountCampaignIntentCreationView';
import configureTestStore from '../../../../utils/test/storeUtils';

describe('AccountPasswordCreationView', () => {
  const user = userEvent.setup();
  const email = 'ok@beta.gouv.fr';
  const link = genSignupLink(email);
  const prospect: Prospect = {
    ...genProspect(),
    email,
    hasAccount: true,
    hasCommitment: true
  };

  function setup() {
    const router = createMemoryRouter(
      [
        { path: '/inscription/en-attente', element: 'En attente' },
        { path: '/inscription/impossible', element: 'Impossible' },
        { path: '/inscription/email', element: 'Email' },
        {
          path: '/inscription/mot-de-passe',
          element: <AccountPasswordCreationView />
        },
        {
          path: '/inscription/campagne',
          element: <AccountCampaignIntentCreationView />
        }
      ],
      {
        initialEntries: [
          { pathname: '/inscription/mot-de-passe', hash: `#${link.id}` }
        ]
      }
    );
    const store = configureTestStore();
    render(
      <Provider store={store}>
        <RouterProvider router={router} />
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
      establishment: null
    });
    setup();

    const title = await screen.findByText('Impossible');
    expect(title).toBeVisible();
  });

  it('should be forbidden if one has no account', async () => {
    mockProspectServicePass({
      ...prospect,
      hasAccount: true,
      hasCommitment: false
    });
    setup();

    const title = await screen.findByText('En attente');
    expect(title).toBeVisible();
  });

  it("should be forbidden if one's account is waiting for approval", async () => {
    mockProspectServicePass({
      ...prospect,
      hasAccount: false,
      hasCommitment: false
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
      /Créer votre mot de passe/
    );
    await user.type(passwordInput, password);
    const confirmationInput = await screen.findByLabelText(
      /Confirmer votre mot de passe/
    );
    await user.type(confirmationInput, password);
    await user.keyboard('{Enter}');

    const title = await screen.findByText(/^Vos intentions de campagne/);
    expect(title).toBeVisible();
  });
});
