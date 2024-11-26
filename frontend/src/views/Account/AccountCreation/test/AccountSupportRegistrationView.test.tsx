import { startReactDsfr } from '@codegouvfr/react-dsfr/spa';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as randomstring from 'randomstring';
import { Provider } from 'react-redux';
import { Link, MemoryRouter as Router, Route } from 'react-router-dom';

import {
  genEstablishmentDTO,
  genProspectDTO,
  genSignupLinkDTO
} from '@zerologementvacant/models/fixtures';
import AccountSupportRegistrationView from '../AccountSupportRegistrationView';
import { Prospect } from '../../../../models/Prospect';
import configureTestStore from '../../../../utils/test/storeUtils';

describe('AccountSupportRegistrationView', () => {
  const user = userEvent.setup();
  const establishment = genEstablishmentDTO();

  function setup(prospect: Prospect = genProspectDTO(establishment)) {
    const link = genSignupLinkDTO(prospect.email);
    const store = configureTestStore({ withAuth: true });
    const password = randomstring.generate();

    render(
      <Provider store={store}>
        <Router
          initialEntries={[
            {
              pathname: '/inscription/mot-de-passe',
              hash: link.id
            },
            {
              pathname: '/inscription/prise-en-main',
              state: {
                prospect,
                password
              }
            }
          ]}
          initialIndex={1}
        >
          <Route path="/inscription/mot-de-passe">
            Définissez votre mot de passe
          </Route>
          <Route
            path="/inscription/prise-en-main"
            component={AccountSupportRegistrationView}
          />
          <Route path="/parc-de-logements">Parc de logements</Route>
        </Router>
      </Provider>
    );
  }

  it('should render', async () => {
    setup();

    await screen.findAllByText('Vos premiers pas accompagnés sur ZLV');
  });

  it('should go back to the previous step', async () => {
    // This is needed to inject `linkProps` into the `Button` component
    startReactDsfr({
      defaultColorScheme: 'light',
      Link
    });

    setup();

    const previous = await screen.findByText('Revenir à l’étape précédente');
    await user.click(previous);

    const title = await screen.findByText(/^Définissez votre mot de passe/);
    expect(title).toBeVisible();
  });

  it('should create an account', async () => {
    setup();

    const createAccount = await screen.findByRole('button', {
      name: /Créer mon compte/i
    });
    await user.click(createAccount);
    const title = await screen.findByText('Parc de logements');
    expect(title).toBeVisible();
  });
});
