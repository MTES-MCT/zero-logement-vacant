import userEvent from '@testing-library/user-event';
import { genProspect, genSiren } from '../../../../../test/fixtures.test';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter as Router, Route } from 'react-router-dom';
import * as randomstring from 'randomstring';
import AccountCampaignIntentCreationView from '../AccountCampaignIntentCreationView';
import { Prospect } from '../../../../models/Prospect';
import configureTestStore from '../../../../utils/test/storeUtils';

describe('AccountCampaignIntentCreationView', () => {
  const user = userEvent.setup();
  const store = configureTestStore({ withAuth: true, });
  const password = randomstring.generate();

  function renderComponent(prospect: Prospect = genProspect()) {
    render(
      <Provider store={store}>
        <Router
          initialEntries={[
            {
              pathname: '/inscription/campagne',
              state: {
                prospect,
                password,
              },
            }
          ]}
        >
          <Route path="/inscription/mot-de-passe">
            Créer votre mot de passe
          </Route>
          <Route
            path="/inscription/campagne"
            component={AccountCampaignIntentCreationView}
          />
        </Router>
      </Provider>
    );
  }

  it('should render', async () => {
    renderComponent();

    await screen.findAllByText(
      'Quand prévoyez-vous de contacter des propriétaires de logements vacants ?'
    );
  });

  it('should go back to the previous step', async () => {
    renderComponent();

    const previous = await screen.findByText('Revenir à l’étape précédente');
    await user.click(previous);

    const title = await screen.findByText(/^Créer votre mot de passe/);
    expect(title).toBeVisible();
  });

  it('should disable campaign intent selection if one already exists', () => {
    renderComponent({
      ...genProspect(),
      establishment: {
        id: randomstring.generate(),
        siren: genSiren(),
        campaignIntent: '2-4',
      },
    });

    const labels = [
      'Dans les 2 prochains mois',
      'Dans 2 à 4 mois',
      'Dans plus de 4 mois'
    ];
    labels
      .map((label) => screen.getByLabelText(label))
      .forEach((radio) => {
        expect(radio).toBeDisabled();
      });
  });

  it('should submit campaign intent if none exist', async () => {
    renderComponent({
      ...genProspect(),
      establishment: {
        id: randomstring.generate(),
        siren: genSiren(),
      },
    });

    const radio = screen.getByLabelText('Dans les 2 prochains mois');
    await user.click(radio);

    expect(radio).toBeChecked();

    const submit = await screen.findByText('Créer votre compte');
    await user.click(submit);
  });
});
