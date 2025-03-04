import { faker } from '@faker-js/faker';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_VALUES,
  CampaignDTO,
  CampaignStatus,
  DatafoncierHousing,
  HousingDTO,
  HousingKind
} from '@zerologementvacant/models';
import {
  genCampaignDTO,
  genDatafoncierHousingDTO,
  genGroupDTO,
  genHousingDTO,
  genOwnerDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import async from 'async';
import fp from 'lodash/fp';
import * as randomstring from 'randomstring';
import { Provider } from 'react-redux';
import {
  createMemoryRouter,
  MemoryRouter as Router,
  RouterProvider
} from 'react-router-dom';
import data from '../../mocks/handlers/data';
import { AppStore } from '../../store/store';
import configureTestStore from '../../utils/test/storeUtils';
import CampaignView from '../Campaign/CampaignView';
import GroupView from '../Group/GroupView';
import HousingListTabsProvider from './HousingListTabsProvider';
import HousingListView from './HousingListView';

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
          <HousingListTabsProvider>
            <HousingListView />
          </HousingListTabsProvider>
        </Router>
      </Provider>
    );

    const accordion = await screen.findByRole('button', { name: /^Logement/ });
    await user.click(accordion);
    const checkbox = await screen.findByRole('checkbox', {
      name: /^Appartement/
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
          <HousingListTabsProvider>
            <HousingListView />
          </HousingListTabsProvider>
        </Router>
      </Provider>
    );

    const createCampaign = screen.queryByRole('button', {
      name: /^Créer une campagne/
    });
    expect(createCampaign).not.toBeInTheDocument();
  });

  describe('Add a housing', () => {
    let datafoncierHousing: DatafoncierHousing;

    beforeEach(() => {
      datafoncierHousing = genDatafoncierHousingDTO();
      data.datafoncierHousings.push(datafoncierHousing);
    });

    it('should fail if the housing was not found in datafoncier', async () => {
      const localId = randomstring.generate(12);

      render(
        <Provider store={store}>
          <Router>
            <HousingListTabsProvider>
              <HousingListView />
            </HousingListTabsProvider>
          </Router>
        </Provider>
      );

      const button = screen.getByText('Ajouter un logement', {
        selector: 'button'
      });
      await user.click(button);
      const modal = await screen.findByRole('dialog');
      const input = await within(modal).findByLabelText(
        /^Saisissez l’identifiant fiscal national/
      );
      await user.type(input, localId);
      await user.click(
        within(modal).getByRole('button', { name: /^Confirmer/ })
      );
      const error = await within(modal).findByText(
        'Nous n’avons pas pu trouver de logement avec les informations que vous avez fournies. Vérifiez les informations saisies afin de vous assurer qu’elles soient correctes, puis réessayez en modifiant l’identifiant du logement.'
      );
      expect(error).toBeVisible();
    });

    it('should fail if the housing already exists in our database', async () => {
      const owner = genOwnerDTO();
      const housing: HousingDTO = {
        ...genHousingDTO(owner),
        localId: datafoncierHousing.idlocal
      };
      data.housings.push(housing);
      data.owners.push(owner);
      data.housingOwners.set(housing.id, [
        {
          id: owner.id,
          rank: 1,
          locprop: null,
          idprocpte: null,
          idprodroit: null
        }
      ]);
      expect(housing.localId).toBeDefined();

      render(
        <Provider store={store}>
          <Router>
            <HousingListTabsProvider>
              <HousingListView />
            </HousingListTabsProvider>
          </Router>
        </Provider>
      );

      const button = screen.getByText('Ajouter un logement', {
        selector: 'button'
      });
      await user.click(button);
      const modal = await screen.findByRole('dialog');
      const input = await within(modal).findByLabelText(
        /^Saisissez l’identifiant fiscal national/
      );
      await user.type(input, datafoncierHousing.idlocal);
      await user.click(within(modal).getByText('Confirmer'));
      const alert = await within(modal).findByText(
        'Ce logement existe déjà dans votre parc'
      );
      expect(alert).toBeVisible();
    });

    it('should succeed otherwise', async () => {
      render(
        <Provider store={store}>
          <Router>
            <HousingListTabsProvider>
              <HousingListView />
            </HousingListTabsProvider>
          </Router>
        </Provider>
      );

      const button = await screen.findByRole('button', {
        name: /^Ajouter un logement/
      });
      await user.click(button);
      const modal = await screen.findByRole('dialog');
      const input = await within(modal).findByLabelText(
        /^Saisissez l’identifiant fiscal national/
      );
      await user.type(input, datafoncierHousing.idlocal);
      await user.click(
        within(modal).getByRole('button', { name: /^Confirmer/ })
      );
      await within(modal).findByText(
        'Voici le logement que nous avons trouvé à cette adresse/sur cette parcelle.'
      );
      await user.click(
        within(modal).getByRole('button', { name: /^Confirmer/ })
      );

      expect(modal).not.toBeVisible();
      const alert = await screen.findByText(
        'Le logement sélectionné a bien été ajouté à votre parc de logements.'
      );
      expect(alert).toBeVisible();
    });
  });

  describe('Group creation', () => {
    function renderView() {
      const router = createMemoryRouter(
        [
          {
            path: '/parc-de-logements',
            element: (
              <HousingListTabsProvider>
                <HousingListView />
              </HousingListTabsProvider>
            )
          },
          { path: '/groupes/:id', element: <GroupView /> }
        ],
        {
          initialEntries: ['/parc-de-logements']
        }
      );
      render(
        <Provider store={store}>
          <RouterProvider router={router} />
        </Provider>
      );

      return {
        router
      };
    }

    it('should add housings to an existing group', async () => {
      const creator = genUserDTO();
      data.users.push(creator);
      const group = genGroupDTO(creator);
      data.groups.push(group);

      const { router } = renderView();

      const panel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      const [checkbox] = await within(panel).findAllByRole('checkbox');
      await user.click(checkbox);
      const exportOrContact = await screen.findByRole('button', {
        name: 'Exporter ou contacter'
      });
      await user.click(exportOrContact);
      const exportOrContactModal = await screen.findByRole('dialog', {
        name: 'Que souhaitez-vous faire ?'
      });
      expect(exportOrContactModal).toBeVisible();
      const addToGroup = await within(exportOrContactModal).findByRole(
        'button',
        { name: 'Ajouter dans un groupe' }
      );
      await user.click(addToGroup);
      const groupModal = await screen.findByRole('dialog', {
        name: 'Ajouter dans un groupe de logements'
      });
      expect(groupModal).toBeVisible();
      const select = await within(groupModal).findByRole('combobox', {
        name: /Ajoutez votre sélection à un groupe existant/
      });
      await user.selectOptions(select, group.id);
      const option: HTMLOptionElement = await screen.findByRole('option', {
        name: group.title
      });
      expect(option.selected).toBe(true);
      const confirm = await within(groupModal).findByRole('button', {
        name: /^Confirmer/
      });
      await user.click(confirm);
      expect(router.state.location.pathname).toStartWith('/groupes/');
    });

    it.todo('should add housings to a new group');

    it('should go back to the first step', async () => {
      renderView();

      const panel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      const [checkbox] = await within(panel).findAllByRole('checkbox');
      await user.click(checkbox);
      const exportOrContact = await screen.findByRole('button', {
        name: 'Exporter ou contacter'
      });
      await user.click(exportOrContact);
      const addToGroup = await screen.findByRole('button', {
        name: 'Ajouter dans un groupe'
      });
      await user.click(addToGroup);
      const back = await screen.findByRole('button', {
        name: 'Revenir en arrière'
      });
      await user.click(back);
      const modal = await screen.findByRole('dialog', {
        name: 'Que souhaitez-vous faire ?'
      });
      expect(modal).toBeVisible();
    });

    it('should go back to the previous step', async () => {
      renderView();

      const panel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      const [checkbox] = await within(panel).findAllByRole('checkbox');
      await user.click(checkbox);
      const exportOrContact = await screen.findByRole('button', {
        name: 'Exporter ou contacter'
      });
      await user.click(exportOrContact);
      const addToGroup = await screen.findByRole('button', {
        name: 'Ajouter dans un groupe'
      });
      await user.click(addToGroup);
      const newGroup = await screen.findByRole('button', {
        name: 'Créer un nouveau groupe'
      });
      await user.click(newGroup);
      const back = await screen.findByRole('button', {
        name: 'Revenir en arrière'
      });
      await user.click(back);
      const modal = await screen.findByRole('dialog', {
        name: 'Ajouter dans un groupe de logements'
      });
      expect(modal).toBeVisible();
    });

    it('should create a new group', async () => {
      const { router } = renderView();

      const panel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      const [checkbox] = await within(panel).findAllByRole('checkbox');
      await user.click(checkbox);
      const exportOrContact = await screen.findByRole('button', {
        name: 'Exporter ou contacter'
      });
      await user.click(exportOrContact);
      const addToGroup = await screen.findByRole('button', {
        name: 'Ajouter dans un groupe'
      });
      await user.click(addToGroup);
      const createGroup = await screen.findByRole('button', {
        name: 'Créer un nouveau groupe'
      });
      await user.click(createGroup);
      const groupName = await screen.findByRole('textbox', {
        name: /Nom du groupe/
      });
      await user.type(groupName, 'Logements vacants');
      const groupDescription = await screen.findByRole('textbox', {
        name: /Description/
      });
      await user.type(groupDescription, 'Tous les logements vacants');
      const confirm = await screen.findByRole('button', {
        name: /Créer un groupe/
      });
      await user.click(confirm);
      expect(router.state.location.pathname).toStartWith('/groupes');
    });

    it.todo('should require a title and a description');

    it('should display an alert if trying to export without selecting housings', async () => {
      renderView();

      const exportOrContact = await screen.findByRole('button', {
        name: 'Exporter ou contacter'
      });
      await user.click(exportOrContact);
      const alert = await screen.findByRole('alert');
      expect(alert).toBeVisible();
    });
  });

  describe('Campaign creation', () => {
    function renderView() {
      const router = createMemoryRouter(
        [
          {
            path: '/parc-de-logements',
            element: (
              <HousingListTabsProvider>
                <HousingListView />
              </HousingListTabsProvider>
            )
          },
          { path: '/campagnes/:id', element: <CampaignView /> }
        ],
        { initialEntries: ['/parc-de-logements'] }
      );
      render(
        <Provider store={store}>
          <RouterProvider router={router} />
        </Provider>
      );

      return {
        router
      };
    }

    it('should create a campaign', async () => {
      const { router } = renderView();

      const panel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      const [checkbox] = await within(panel).findAllByRole('checkbox');
      await user.click(checkbox);
      const exportOrContact = await screen.findByRole('button', {
        name: 'Exporter ou contacter'
      });
      await user.click(exportOrContact);
      const groupOrCampaignCreationModal = await screen.findByRole('dialog', {
        name: 'Que souhaitez-vous faire ?'
      });
      const createCampaign = await within(
        groupOrCampaignCreationModal
      ).findByRole('button', { name: 'Créer une campagne' });
      await user.click(createCampaign);
      const campaignCreationInfoModal = await screen.findByRole('dialog', {
        name: 'Créer une campagne'
      });
      const skip = await within(campaignCreationInfoModal).findByRole(
        'button',
        {
          name: 'Créer une campagne'
        }
      );
      await user.click(skip);
      const campaignCreationModal = await screen.findByRole('dialog', {
        name: 'Créer une campagne'
      });
      const title = await within(campaignCreationModal).findByRole('textbox', {
        name: /^Titre de la campagne/
      });
      await user.type(title, 'Tous les logements');
      const description = await within(campaignCreationModal).findByRole(
        'textbox',
        {
          name: /^Description/
        }
      );
      await user.type(description, 'Tous les logements disponibles');
      const confirm = await within(campaignCreationModal).findByRole('button', {
        name: 'Créer une campagne'
      });
      await user.click(confirm);
      expect(router.state.location.pathname).toStartWith('/campagnes/');
    });

    it('should require a title', async () => {
      renderView();

      const panel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      const [checkbox] = await within(panel).findAllByRole('checkbox');
      await user.click(checkbox);
      const exportOrContact = await screen.findByRole('button', {
        name: 'Exporter ou contacter'
      });
      await user.click(exportOrContact);
      const groupOrCampaignCreationModal = await screen.findByRole('dialog', {
        name: 'Que souhaitez-vous faire ?'
      });
      const createCampaign = await within(
        groupOrCampaignCreationModal
      ).findByRole('button', {
        name: 'Créer une campagne'
      });
      await user.click(createCampaign);
      const campaignCreationInfoModal = await screen.findByRole('dialog', {
        name: 'Créer une campagne'
      });
      const skip = await within(campaignCreationInfoModal).findByRole(
        'button',
        {
          name: 'Créer une campagne'
        }
      );
      await user.click(skip);
      const campaignCreationModal = await screen.findByRole('dialog', {
        name: 'Créer une campagne'
      });
      const confirm = await within(campaignCreationModal).findByRole('button', {
        name: 'Créer une campagne'
      });
      await user.click(confirm);
      const error = await within(campaignCreationModal).findByText(
        'Veuillez donner un nom à la campagne pour confirmer.'
      );
      expect(error).toBeVisible();
    });

    it('should restrict require the description', async () => {
      renderView();

      const panel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      const [checkbox] = await within(panel).findAllByRole('checkbox');
      await user.click(checkbox);
      const exportOrContact = await screen.findByRole('button', {
        name: 'Exporter ou contacter'
      });
      await user.click(exportOrContact);
      const groupOrCampaignCreationModal = await screen.findByRole('dialog', {
        name: 'Que souhaitez-vous faire ?'
      });
      const createCampaign = await within(
        groupOrCampaignCreationModal
      ).findByRole('button', {
        name: 'Créer une campagne'
      });
      await user.click(createCampaign);
      const campaignCreationInfoModal = await screen.findByRole('dialog', {
        name: 'Créer une campagne'
      });
      const skip = await within(campaignCreationInfoModal).findByRole(
        'button',
        {
          name: 'Créer une campagne'
        }
      );
      await user.click(skip);
      const campaignCreationModal = await screen.findByRole('dialog', {
        name: 'Créer une campagne'
      });
      const title = await within(campaignCreationModal).findByRole('textbox', {
        name: /^Titre de la campagne/
      });
      await user.type(title, 'Tous les logements');
      const confirm = await within(campaignCreationModal).findByRole('button', {
        name: 'Créer une campagne'
      });
      await user.click(confirm);
      const error = await within(campaignCreationModal).findByText(
        'Veuillez donner une description à la campagne pour confirmer.'
      );
      expect(error).toBeVisible();
    });

    it('should restrict the title to 64 characters', async () => {
      renderView();

      const panel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      const [checkbox] = await within(panel).findAllByRole('checkbox');
      await user.click(checkbox);
      const exportOrContact = await screen.findByRole('button', {
        name: 'Exporter ou contacter'
      });
      await user.click(exportOrContact);
      const groupOrCampaignCreationModal = await screen.findByRole('dialog', {
        name: 'Que souhaitez-vous faire ?'
      });
      const createCampaign = await within(
        groupOrCampaignCreationModal
      ).findByRole('button', {
        name: 'Créer une campagne'
      });
      await user.click(createCampaign);
      const campaignCreationInfoModal = await screen.findByRole('dialog', {
        name: 'Créer une campagne'
      });
      const skip = await within(campaignCreationInfoModal).findByRole(
        'button',
        {
          name: 'Créer une campagne'
        }
      );
      await user.click(skip);
      const campaignCreationModal = await screen.findByRole('dialog', {
        name: 'Créer une campagne'
      });
      const title = await within(campaignCreationModal).findByRole('textbox', {
        name: /^Titre de la campagne/
      });
      await user.type(title, faker.string.alpha({ length: 65 }));
      const confirm = await within(campaignCreationModal).findByRole('button', {
        name: 'Créer une campagne'
      });
      await user.click(confirm);
      const error = await within(campaignCreationModal).findByText(
        'La longueur maximale du titre est de 64 caractères.'
      );
      expect(error).toBeVisible();
    });

    it('should restrict the description to 1000 characters', async () => {
      renderView();

      const panel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      const [checkbox] = await within(panel).findAllByRole('checkbox');
      await user.click(checkbox);
      const exportOrContact = await screen.findByRole('button', {
        name: 'Exporter ou contacter'
      });
      await user.click(exportOrContact);
      const groupOrCampaignCreationModal = await screen.findByRole('dialog', {
        name: 'Que souhaitez-vous faire ?'
      });
      const createCampaign = await within(
        groupOrCampaignCreationModal
      ).findByRole('button', {
        name: 'Créer une campagne'
      });
      await user.click(createCampaign);
      const campaignCreationInfoModal = await screen.findByRole('dialog', {
        name: 'Créer une campagne'
      });
      const skip = await within(campaignCreationInfoModal).findByRole(
        'button',
        {
          name: 'Créer une campagne'
        }
      );
      await user.click(skip);
      const campaignCreationModal = await screen.findByRole('dialog', {
        name: 'Créer une campagne'
      });
      const title = await within(campaignCreationModal).findByRole('textbox', {
        name: /^Titre de la campagne/
      });
      await user.type(title, 'Tous les logements');
      const confirm = await within(campaignCreationModal).findByRole('button', {
        name: 'Créer une campagne'
      });
      const description = await within(campaignCreationModal).findByRole(
        'textbox',
        {
          name: /^Description/
        }
      );
      await user.type(description, faker.string.alpha({ length: 1001 }));
      await user.click(confirm);
      const error = await within(campaignCreationModal).findByText(
        'La longueur maximale de la description est de 1000 caractères.'
      );
      expect(error).toBeVisible();
    });
  });

  describe('Housing tabs', () => {
    it('should select a default tab', async () => {
      render(
        <Provider store={store}>
          <Router>
            <HousingListTabsProvider>
              <HousingListView />
            </HousingListTabsProvider>
          </Router>
        </Provider>
      );

      const tab = await screen.findByRole('tab', { selected: true });
      expect(tab).toHaveTextContent(/^Tous/);
    });

    it('should open another tab', async () => {
      render(
        <Provider store={store}>
          <Router>
            <HousingListTabsProvider>
              <HousingListView />
            </HousingListTabsProvider>
          </Router>
        </Provider>
      );

      const tab = await screen.findByRole('tab', {
        selected: false,
        name: /^En attente de retour/
      });
      await user.click(tab);
      expect(tab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Status filter', () => {
    function renderView() {
      const router = createMemoryRouter(
        [
          {
            path: '/parc-de-logements',
            element: (
              <HousingListTabsProvider>
                <HousingListView />
              </HousingListTabsProvider>
            )
          }
        ],
        {
          initialEntries: ['/parc-de-logements']
        }
      );
      render(
        <Provider store={store}>
          <RouterProvider router={router} />
        </Provider>
      );

      return {
        router
      };
    }

    it('should display a badge', async () => {
      renderView();

      const mobilization = await screen.findByRole('button', {
        name: 'Mobilisation'
      });
      await user.click(mobilization);
      const status = await screen.findByRole('combobox', {
        name: /Statut de suivi/
      });
      await user.click(status);
      const options = await screen.findByRole('listbox');
      const option = await within(options).findByText('Non suivi');
      await user.click(option);
      const badge = await screen.findByText('Statut de suivi : non suivi');
      expect(badge).toBeVisible();
    });
  });

  describe('Campaign filter', () => {
    const campaigns: ReadonlyArray<CampaignDTO> = CAMPAIGN_STATUS_VALUES.map(
      (status) => {
        return Array.from({ length: 3 }, () => genCampaignDTO()).map(
          (campaign) => ({ ...campaign, status })
        );
      }
    ).flat();

    beforeAll(() => {
      data.campaigns.push(...campaigns);
      const owner = genOwnerDTO();
      data.owners.push(owner);
      campaigns.forEach((campaign) => {
        const housings = Array.from({ length: 3 }, () => genHousingDTO(owner));
        data.housings.push(...housings);
        housings.forEach((housing) => {
          data.housingCampaigns.set(housing.id, [campaign]);
          data.housingOwners.set(housing.id, [
            {
              id: owner.id,
              rank: 1,
              idprodroit: null,
              idprocpte: null,
              locprop: null
            }
          ]);
        });
        data.campaignHousings.set(campaign.id, housings);
      });
    });

    function renderView() {
      render(
        <Provider store={store}>
          <Router>
            <HousingListTabsProvider>
              <HousingListView />
            </HousingListTabsProvider>
          </Router>
        </Provider>
      );
    }

    it('should filter by a single campaign', async () => {
      renderView();

      const [campaign] = campaigns;
      const mobilization = await screen.findByRole('button', {
        name: 'Mobilisation'
      });
      await user.click(mobilization);
      const filter = await screen.findByLabelText(/^Campagne/);
      await user.click(filter);
      const options = await screen.findByRole('listbox');
      const option = await within(options).findByText(campaign.title);
      await user.click(option);
      await user.keyboard('{Escape}');
      const panel = await screen.findByRole('tabpanel', {
        name: /^Tous/
      });
      const count = await within(panel).findByText(
        /^\d+ logements \((\d+|un) propriétaires?\) filtrés sur un total de \d+ logements$/
      );
      expect(count).toBeVisible();
    });

    it('should filter by several campaigns', async () => {
      renderView();

      const mobilization = await screen.findByRole('button', {
        name: 'Mobilisation'
      });
      await user.click(mobilization);
      const filter = await screen.findByLabelText(/^Campagne/);
      await user.click(filter);
      const options = await screen.findByRole('listbox');
      const slice = campaigns.slice(0, 2);
      await async.forEachSeries(slice as CampaignDTO[], async (campaign) => {
        const option = await within(options).findByText(campaign.title);
        await user.click(option);
      });
      await user.keyboard('{Escape}');
      const panel = await screen.findByRole('tabpanel', {
        name: /^Tous/
      });
      const count = await within(panel).findByText(
        /^(\d+|un) logements? \((\d+|un) propriétaires?\) filtrés sur un total de \d+ logements$/
      );
      expect(count).toBeVisible();
    });

    it('should remove the filter by campaigns', async () => {
      renderView();

      const mobilization = await screen.findByRole('button', {
        name: 'Mobilisation'
      });
      await user.click(mobilization);

      // Select options
      const filter = await screen.findByRole('combobox', {
        name: /^Campagne/
      });
      await user.click(filter);
      let listbox = await screen.findByRole('listbox', {
        name: /^Campagne/
      });
      const options = campaigns
        .slice(0, 3)
        .map((campaign) => within(listbox).getByText(campaign.title));
      await async.forEachSeries(options, async (option) => {
        await user.click(option);
      });
      await user.keyboard('{Escape}');
      const panel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      let count = await within(panel).findByText(
        /^(\d+|un) logements? \((\d+|un) propriétaires?\) filtrés sur un total de \d+ logements$/
      );
      expect(count).toBeVisible();

      // Deselect options
      await user.click(filter);
      listbox = await screen.findByRole('listbox', {
        name: /^Campagne/
      });
      const selectedOptions = await within(listbox).findAllByRole('option', {
        selected: true
      });
      await async.forEachSeries(selectedOptions, async (option) => {
        await user.click(option);
      });
      await user.keyboard('{Escape}');
      count = await within(panel).findByText(
        /^(\d+|un) logements? \((\d+|un) propriétaires?\)$/
      );
      expect(count).toBeVisible();
    });

    it('should filter by a status', async () => {
      const status: CampaignStatus = 'draft';

      renderView();

      const mobilization = await screen.findByRole('button', {
        name: 'Mobilisation'
      });
      await user.click(mobilization);
      const filter = await screen.findByLabelText(/^Campagne/);
      await user.click(filter);
      const options = await screen.findByRole('listbox');
      const option = await within(options).findByText(
        CAMPAIGN_STATUS_LABELS[status]
      );
      await user.click(option);
      await user.keyboard('{Escape}');
      const panel = await screen.findByRole('tabpanel', {
        name: /^Tous/
      });
      const count = await within(panel).findByText(
        /^(\d+|un) logements? \(\d+ propriétaires\) filtrés sur un total de \d+ logements$/
      );
      expect(count).toBeVisible();
    });

    it('should remove the filter by status', async () => {
      const status: CampaignStatus = 'draft';

      renderView();

      // Select an option
      const mobilization = await screen.findByRole('button', {
        name: 'Mobilisation'
      });
      await user.click(mobilization);
      const filter = await screen.findByLabelText(/^Campagne/);
      await user.click(filter);
      let listbox = await screen.findByRole('listbox');
      let option = await within(listbox).findByText(
        CAMPAIGN_STATUS_LABELS[status]
      );
      await user.click(option);
      await user.keyboard('{Escape}');
      const panel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      let count = await within(panel).findByText(
        /^(\d+|un) logements? \((\d+|un) propriétaires?\) filtrés sur un total de \d+ logements$/
      );
      expect(count).toBeVisible();

      // Deselect options
      await user.click(filter);
      listbox = await screen.findByRole('listbox', {
        name: /^Campagne/
      });
      option = await within(listbox).findByText(CAMPAIGN_STATUS_LABELS[status]);
      await user.click(option);
      await user.keyboard('{Escape}');
      count = await within(panel).findByText(
        /^(\d+|un) logements? \((\d+|un) propriétaires?\)$/
      );
      expect(count).toBeVisible();
    });

    it('should select a status and its campaigns if at least one of the campaigns is not selected', async () => {
      const status: CampaignStatus = 'draft';

      renderView();

      const mobilization = await screen.findByRole('button', {
        name: /^Mobilisation/
      });
      await user.click(mobilization);
      const filter = await screen.findByLabelText(/^Campagne/);
      await user.click(filter);
      const options = await screen.findByRole('listbox');
      const option = await within(options).findByText(
        CAMPAIGN_STATUS_LABELS[status]
      );
      // Select the status
      await user.click(option);
      data.campaigns
        .filter((campaign) => campaign.status === status)
        .map((campaign) => {
          return within(options).getByRole('checkbox', {
            name: campaign.title
          });
        })
        .forEach((checkbox) => {
          expect(checkbox).toBeChecked();
        });
    });

    it('should unselect a status and its campaigns if all the campaigns of this status are selected', async () => {
      const status: CampaignStatus = 'draft';

      renderView();

      const filter = await screen.findByLabelText(/^Campagne/);
      await user.click(filter);
      const options = await screen.findByRole('listbox');
      const option = await within(options).findByText(
        CAMPAIGN_STATUS_LABELS[status]
      );
      await user.click(option);
      const checkboxes = data.campaigns
        .filter((campaign) => campaign.status === status)
        .map((campaign) => {
          return within(options).getByRole('checkbox', {
            name: campaign.title
          });
        });
      // Unselect the status
      await user.click(option);
      checkboxes.forEach((checkbox) => {
        expect(checkbox).not.toBeChecked();
      });
    });
  });
});
