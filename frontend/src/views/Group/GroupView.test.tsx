import { faker } from '@faker-js/faker';
import { Store } from '@reduxjs/toolkit';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter as Router, Route } from 'react-router-dom';

import {
  genCampaignDTO,
  genGroupDTO,
  genUserDTO,
  GroupDTO
} from '@zerologementvacant/models';
import data from '../../mocks/handlers/data';
import configureTestStore from '../../utils/test/storeUtils';
import GroupView from './GroupView';

describe('Group view', () => {
  const user = userEvent.setup();

  let store: Store;

  beforeEach(() => {
    store = configureTestStore();
  });

  it('should show NotFoundView if the group does not exist', async () => {
    render(
      <Provider store={store}>
        <Router initialEntries={[`/groupes/${faker.string.uuid()}`]}>
          <Route path="/parc-de-logements">Parc de logements</Route>
          <Route path="/groupes/:id" component={GroupView} />
        </Router>
      </Provider>
    );

    const text = await screen.findByText('Page non trouvée');
    expect(text).toBeVisible();
  });

  it('should show NotFoundView if the group has been archived', async () => {
    const creator = faker.helpers.arrayElement(data.users);
    const housings = faker.helpers.arrayElements(data.housings);
    const group: GroupDTO = {
      ...genGroupDTO(creator, housings),
      archivedAt: new Date().toJSON()
    };
    // Not pushed into the data.groups array

    render(
      <Provider store={store}>
        <Router initialEntries={[`/groupes/${group.id}`]}>
          <Route path="/parc-de-logements">Parc de logements</Route>
          <Route path="/groupes/:id" component={GroupView} />
        </Router>
      </Provider>
    );

    const text = await screen.findByText('Page non trouvée');
    expect(text).toBeVisible();
  });

  describe('Create a campaign from the group', () => {
    it('should display a modal to create a campaign', async () => {
      const creator = genUserDTO();
      const housings = data.housings;
      const group = genGroupDTO(creator, housings);
      data.groups.push(group);

      render(
        <Provider store={store}>
          <Router initialEntries={[`/groupes/${group.id}`]}>
            <Route path="/campagnes/:id">Campagne</Route>
            <Route path="/groupes/:id" component={GroupView} />
          </Router>
        </Provider>
      );

      const createCampaign = await screen.findByText(/^Créer une campagne/);
      expect(createCampaign).toBeEnabled();
      await user.click(createCampaign);
      const modal = await screen.findByRole('dialog');
      const title = await within(modal).findByLabelText(
        /^Titre de la campagne/
      );
      await user.type(title, 'Logements prioritaires');
      const confirm = await within(modal).findByText('Confirmer');
      await user.click(confirm);

      const page = await screen.findByText('Campagne');
      expect(page).toBeVisible();
    });
  });

  describe('Remove the group', () => {
    it('should display a modal to archive the group', async () => {
      const creator = genUserDTO();
      const group = genGroupDTO(creator);
      const campaign = genCampaignDTO(group);
      data.campaigns.push(campaign);
      data.users.push(creator);
      data.groups.push(group);

      render(
        <Provider store={store}>
          <Router initialEntries={[`/groupes/${group.id}`]}>
            <Route path="/parc-de-logements">Parc de logements</Route>
            <Route path="/groupes/:id" component={GroupView} />
          </Router>
        </Provider>
      );

      const archiveGroup = await screen.findByText(/^Archiver le groupe/);
      await user.click(archiveGroup);
      const modal = await screen.findByRole('dialog');
      const confirm = await within(modal).findByText(/^Confirmer/);
      await user.click(confirm);

      const page = await screen.findByText('Parc de logements');
      expect(page).toBeVisible();
    });

    it('should display a "Remove" button if no campaign was created from the group', async () => {
      const creator = genUserDTO();
      const group = genGroupDTO(creator);
      data.users.push(creator);
      data.groups.push(group);

      render(
        <Provider store={store}>
          <Router initialEntries={[`/groupes/${group.id}`]}>
            <Route path="/groupes/:id" component={GroupView} />
          </Router>
        </Provider>
      );

      const removeGroup = await screen.findByText(/^Supprimer le groupe/);
      expect(removeGroup).toBeVisible();
    });
  });
});
