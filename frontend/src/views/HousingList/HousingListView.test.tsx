import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fp from 'lodash/fp';
import { http, HttpResponse } from 'msw';
import { constants } from 'node:http2';
import * as randomstring from 'randomstring';
import { Provider } from 'react-redux';
import { MemoryRouter as Router, Route } from 'react-router-dom';

import {
  genDatafoncierHousingDTO,
  genGroupDTO,
  genUserDTO,
  HousingKind
} from '@zerologementvacant/models';
import HousingListView from './HousingListView';
import config from '../../utils/config';
import configureTestStore from '../../utils/test/storeUtils';
import { AppStore } from '../../store/store';
import GroupView from '../Group/GroupView';
import data from '../../mocks/handlers/data';
import { mockAPI } from '../../mocks/mock-api';

jest.mock('../../components/Aside/Aside.tsx');

describe('Housing list view', () => {
  const user = userEvent.setup();
  let store: AppStore;

  beforeEach(() => {
    store = configureTestStore();
  });

  it('should filter by housing kind', async () => {
    const apartments = data.housings.filter(
      (housing) => housing.housingKind === HousingKind.APARTMENT
    );
    const owners = fp.uniqBy(
      'id',
      apartments.map((housing) => housing.owner)
    );
    render(
      <Provider store={store}>
        <Router>
          <HousingListView />
        </Router>
      </Provider>
    );

    const accordion = await screen.findByRole('button', { name: /^Logement/, });
    await user.click(accordion);
    const checkbox = await screen.findByRole('checkbox', {
      name: /^Appartement/,
    });
    await user.click(checkbox);
    const text = `${apartments.length} logements (${owners.length} propriétaires) filtrés sur un total de ${data.housings.length} logements`;
    const label = await screen.findByText(text);
    expect(label).toBeVisible();
  });

  it('should hide the button to create campaign if no housing are selected', async () => {
    render(
      <Provider store={store}>
        <Router>
          <HousingListView />
        </Router>
      </Provider>
    );

    const createCampaign = screen.queryByRole('button', {
      name: /^Créer une campagne/,
    });
    expect(createCampaign).not.toBeInTheDocument();
  });

  it('should enable the creation of the campaign when at least a housing is selected', async () => {
    render(
      <Provider store={store}>
        <Router>
          <HousingListView />
        </Router>
      </Provider>
    );

    const panel = await screen.findByRole('tabpanel');
    const [checkbox] = await within(panel).findAllByRole('checkbox');
    await user.click(checkbox);

    const createCampaign = await screen.findByRole('button', {
      name: /^Créer une campagne/,
    });
    expect(createCampaign).toBeVisible();
  });

  // TODO: should be resolved by the relevant bug story
  describe.skip('If the user does not know the local id', () => {
    const datafoncierHousing = genDatafoncierHousingDTO();
    data.datafoncierHousings.push(datafoncierHousing);

    it('should add a housing', async () => {
      render(
        <Provider store={store}>
          <Router>
            <HousingListView />
          </Router>
        </Provider>
      );

      const button = await screen.findByRole('button', {
        name: /^Ajouter un logement/,
      });
      await user.click(button);
      const modal = await screen.findByRole('dialog');
      const input = await within(modal).findByLabelText(
        /^Identifiant du logement/
      );
      await user.type(input, datafoncierHousing.idlocal);
      await user.click(
        within(modal).getByRole('button', { name: /^Confirmer/, })
      );
      await within(modal).findByText(
        'Voici le logement que nous avons trouvé à cette adresse/sur cette parcelle.'
      );
      await user.click(
        within(modal).getByRole('button', { name: /^Confirmer/, })
      );

      expect(modal).not.toBeVisible();
      const alert = await screen.findByText(
        'Le logement sélectionné a bien été ajouté à votre parc de logements.'
      );
      expect(alert).toBeVisible();
    });

    it('should fail if the housing was not found in datafoncier', async () => {
      const localId = randomstring.generate(12);

      render(
        <Provider store={store}>
          <Router>
            <HousingListView />
          </Router>
        </Provider>
      );

      const button = screen.getByText('Ajouter un logement', {
        selector: 'button',
      });
      await user.click(button);
      const modal = await screen.findByRole('dialog');
      const input = await within(modal).findByLabelText(
        /^Identifiant du logement/
      );
      await user.type(input, localId);
      await user.click(
        within(modal).getByRole('button', { name: /^Confirmer/, })
      );
      const alert = await within(modal).findByText(
        'Nous n’avons pas pu trouver de logement avec les informations que vous avez fournies.'
      );
      expect(alert).toBeVisible();
    });

    it('should fail if the housing already exists in our database', async () => {
      const localId = data.housings[0].localId;
      expect(localId).toBeDefined();

      render(
        <Provider store={store}>
          <Router>
            <HousingListView />
          </Router>
        </Provider>
      );

      const button = screen.getByText('Ajouter un logement', {
        selector: 'button',
      });
      await user.click(button);
      const modal = await screen.findByRole('dialog');
      const input = await within(modal).findByLabelText(
        /^Identifiant du logement/
      );
      await user.type(input, datafoncierHousing.idlocal);
      await user.click(within(modal).getByText('Confirmer'));
      const alert = await within(modal).findByText(
        'Ce logement existe déjà dans votre parc'
      );
      expect(alert).toBeVisible();
    });
  });

  it('should add all housing to a group immediately', async () => {
    render(
      <Provider store={store}>
        <Router initialEntries={['/parc-de-logements']}>
          <Route path="/parc-de-logements" component={HousingListView} />
          <Route path="/groupes/:id" component={GroupView} />
        </Router>
      </Provider>
    );

    const checkboxes = await within(
      await screen.findByTestId('housing-table')
    ).findAllByRole('checkbox');
    const [checkAll] = checkboxes;
    await user.click(checkAll);
    const addGroupHousing = await screen.findByText('Ajouter dans un groupe');
    await user.click(addGroupHousing);
    const modal = await screen.findByRole('dialog');
    const createGroup = await within(modal).findByText(
      /^Créer un nouveau groupe/
    );
    await user.click(createGroup);
    const groupName = await within(modal).findByLabelText('Nom du groupe');
    await user.type(groupName, 'My group');
    const groupDescription = await within(modal).findByLabelText('Description');
    await user.type(groupDescription, 'My group description');
    const confirm = await within(modal).findByRole('button', {
      name: /^Confirmer/,
    });
    await user.click(confirm);

    const alert = await screen.findByText(
      'Votre nouveau groupe a bien été créé et les logements sélectionnés ont bien été ajoutés.'
    );
    expect(alert).toBeVisible();
  });

  it('should create the group immediately and add the housing later', async () => {
    const creator = genUserDTO();
    const group = genGroupDTO(creator);
    mockAPI.use(
      http.post(`${config.apiEndpoint}/api/groups`, () => {
        data.groups.push(group);
        return HttpResponse.json(group, {
          status: constants.HTTP_STATUS_ACCEPTED,
        });
      })
    );

    render(
      <Provider store={store}>
        <Router initialEntries={['/parc-de-logements']}>
          <Route path="/parc-de-logements" component={HousingListView} />
          <Route path="/groupes/:id" component={GroupView} />
        </Router>
      </Provider>
    );

    const checkboxes = await within(
      await screen.findByTestId('housing-table')
    ).findAllByRole('checkbox');
    const [checkAll] = checkboxes;
    await user.click(checkAll);
    const addGroupHousing = await screen.findByText('Ajouter dans un groupe');
    await user.click(addGroupHousing);
    const modal = await screen.findByRole('dialog');
    const createGroup = await within(modal).findByText(
      /^Créer un nouveau groupe/
    );
    await user.click(createGroup);
    const groupName = await within(modal).findByLabelText('Nom du groupe');
    await user.type(groupName, 'My group');
    const groupDescription = await within(modal).findByLabelText('Description');
    await user.type(groupDescription, 'My group description');
    const confirm = await within(modal).findByText('Confirmer');
    await user.click(confirm);

    const alert = await screen.findByText(
      'Votre nouveau groupe a bien été créé. Les logements vont être ajoutés au fur et à mesure...'
    );
    expect(alert).toBeVisible();
  });

  describe('Housing tabs', () => {
    it('should select a default tab', async () => {
      render(
        <Provider store={store}>
          <Router>
            <HousingListView />
          </Router>
        </Provider>
      );

      const tab = await screen.findByRole('tab', { selected: true, });
      expect(tab).toHaveTextContent(/^Tous/);
    });

    it('should open another tab', async () => {
      render(
        <Provider store={store}>
          <Router>
            <HousingListView />
          </Router>
        </Provider>
      );

      const tab = await screen.findByRole('tab', {
        selected: false,
        name: /^En attente de retour/,
      });
      await user.click(tab);
      expect(tab).toHaveAttribute('aria-selected', 'true');
    });
  });
});
