import { faker } from '@faker-js/faker';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { ProspectDTO, SignupLinkDTO } from '@zerologementvacant/models';
import {
  genEstablishmentDTO,
  genProspectDTO,
  genSignupLinkDTO
} from '@zerologementvacant/models/fixtures';
import AccountPasswordCreationView from '../AccountPasswordCreationView';
import AccountCampaignIntentCreationView from '../AccountCampaignIntentCreationView';
import configureTestStore from '../../../../utils/test/storeUtils';
import data from '../../../../mocks/handlers/data';

describe('AccountPasswordCreationView', () => {
  const user = userEvent.setup();
  const establishment = genEstablishmentDTO();

  function setup(link: SignupLinkDTO) {
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

  it('should render', async () => {
    const prospect = genProspectDTO(establishment);
    data.prospects.push(prospect);
    const link = genSignupLinkDTO(prospect.email);
    data.signupLinks.push(link);

    setup(link);

    const step = await screen.findByRole('heading', {
      name: /Définissez votre mot de passe/i
    });
    expect(step).toBeVisible();
  });

  it('should display an error if the link is expired', async () => {
    const prospect = genProspectDTO(establishment);
    data.prospects.push(prospect);
    const link: SignupLinkDTO = {
      ...genSignupLinkDTO(prospect.email),
      expiresAt: faker.date.past()
    };
    data.signupLinks.push(link);

    setup(link);

    await screen.findByText('Ce lien n’existe pas ou est expiré !');
  });

  it("should be forbidden if one's establishment does not exist in ZLV", async () => {
    const prospect: ProspectDTO = {
      ...genProspectDTO(establishment),
      establishment: undefined
    };
    data.prospects.push(prospect);
    const link = genSignupLinkDTO(prospect.email);
    data.signupLinks.push(link);

    setup(link);

    const title = await screen.findByText('Impossible');
    expect(title).toBeVisible();
  });

  it('should be forbidden if one has no account', async () => {
    const prospect: ProspectDTO = {
      ...genProspectDTO(establishment),
      hasCommitment: false
    };
    data.prospects.push(prospect);
    const link = genSignupLinkDTO(prospect.email);
    data.signupLinks.push(link);

    setup(link);

    const title = await screen.findByText('En attente');
    expect(title).toBeVisible();
  });

  it("should be forbidden if one's account is waiting for approval", async () => {
    const prospect: ProspectDTO = {
      ...genProspectDTO(establishment),
      hasAccount: false,
      hasCommitment: false
    };
    data.prospects.push(prospect);
    const link = genSignupLinkDTO(prospect.email);
    data.signupLinks.push(link);

    setup(link);

    const title = await screen.findByText('Impossible');
    expect(title).toBeVisible();
  });

  it('should require a password of at least eight characters, one uppercase, one lowercase and one number', async () => {
    const prospect = genProspectDTO(establishment);
    data.prospects.push(prospect);
    const link = genSignupLinkDTO(prospect.email);
    data.signupLinks.push(link);

    setup(link);

    const confirm = await screen.findByRole('button', {
      name: /^Confirmer mon mot de passe/i
    });
    await user.click(confirm);
    const errors = [
      screen.getByText(/Au moins 8 caractères/i),
      screen.getByText(/Au moins une majuscule/i),
      screen.getByText(/Au moins une minuscule/i),
      screen.getByText(/Au moins un chiffre/i)
    ];
    errors.forEach((error) => {
      expect(error).toBeVisible();
    });
  });

  it('should require to confirm the password', async () => {
    const prospect = genProspectDTO(establishment);
    data.prospects.push(prospect);
    const link = genSignupLinkDTO(prospect.email);
    data.signupLinks.push(link);

    setup(link);

    const confirm = await screen.findByRole('button', {
      name: /^Confirmer mon mot de passe/i
    });
    await user.click(confirm);
    const error = screen.getByText(/Veuillez confirmer votre mot de passe/i);
    expect(error).toBeVisible();
  });

  it('should choose a password', async () => {
    const prospect = genProspectDTO(establishment);
    data.prospects.push(prospect);
    const link = genSignupLinkDTO(prospect.email);
    data.signupLinks.push(link);

    setup(link);

    const password = '123QWEasd';
    const passwordInput = await screen.findByLabelText(
      /^Définissez votre mot de passe/i
    );
    await user.type(passwordInput, password);
    const confirmationInput = await screen.findByLabelText(
      /^Confirmez votre mot de passe/i
    );
    await user.type(confirmationInput, password);
    await user.keyboard('{Enter}');

    const title = await screen.findByText(/^Vos intentions de campagne/);
    expect(title).toBeVisible();
  });
});
