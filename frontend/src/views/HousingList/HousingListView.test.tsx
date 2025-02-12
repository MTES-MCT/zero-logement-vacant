import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import async from 'async';
import fp from 'lodash/fp';
import { http, HttpResponse } from 'msw';
import { constants } from 'node:http2';
import * as randomstring from 'randomstring';
import { Provider } from 'react-redux';
import {
  createMemoryRouter,
  MemoryRouter as Router,
  Route,
  RouterProvider,
  Routes
} from 'react-router-dom';

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
          <HousingListView />
        </Router>
      </Provider>
    );

    const createCampaign = screen.queryByRole('button', {
      name: /^Créer une campagne/
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
      name: /^Créer une campagne/
    });
    expect(createCampaign).toBeVisible();
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
            <HousingListView />
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
            <HousingListView />
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
            <HousingListView />
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

  it('should add all housing to a group immediately', async () => {
    render(
      <Provider store={store}>
        <Router initialEntries={['/parc-de-logements']}>
          <Routes>
            <Route path="/parc-de-logements" element={<HousingListView />} />
            <Route path="/groupes/:id" element={<GroupView />} />
          </Routes>
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
      name: /^Confirmer/
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
          status: constants.HTTP_STATUS_ACCEPTED
        });
      })
    );

    render(
      <Provider store={store}>
        <Router initialEntries={['/parc-de-logements']}>
          <Routes>
            <Route path="/parc-de-logements" element={<HousingListView />} />
            <Route path="/groupes/:id" element={<GroupView />} />
          </Routes>
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

  describe('Group creation', () => {
    function renderView() {
      const router = createMemoryRouter(
        [{ path: '/parc-de-logements', element: <HousingListView /> }],
        {
          initialEntries: ['/parc-de-logements']
        }
      );
      render(
        <Provider store={store}>
          <RouterProvider router={router} />
        </Provider>
      );
    }

    it('should add housings to an existing group', async () => {
      renderView();

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
      const select = await within(groupModal).findByLabelText(
        /Ajoutez votre sélection à un groupe existant/
      );
      await user.click(select);
      const [option] = await within(groupModal).findAllByRole('option');
      await user.click(option);
      const confirm = await within(groupModal).findByRole('button', {
        name: /^Confirmer/
      });
      await user.click(confirm);
      expect(window.location.pathname).toStartWith('/groupes/');
    });

    it.todo('should add housings to a new group');
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

      const tab = await screen.findByRole('tab', { selected: true });
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
        name: /^En attente de retour/
      });
      await user.click(tab);
      expect(tab).toHaveAttribute('aria-selected', 'true');
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

    it('should filter by a single campaign', async () => {
      render(
        <Provider store={store}>
          <Router>
            <HousingListView />
          </Router>
        </Provider>
      );

      const [campaign] = campaigns;
      const filter = await screen.findByLabelText(/^Campagne/);
      await user.click(filter);
      const options = await screen.findByRole('listbox');
      const option = await within(options).findByText(campaign.title);
      await user.click(option);
      const housings = data.campaignHousings.get(campaign.id) ?? [];
      const count = await screen.findByText(
        new RegExp(`${housings.length} logements`)
      );
      expect(count).toBeVisible();
    });

    it('should filter by several campaigns', async () => {
      render(
        <Provider store={store}>
          <Router>
            <HousingListView />
          </Router>
        </Provider>
      );

      const filter = await screen.findByLabelText(/^Campagne/);
      await user.click(filter);
      const options = await screen.findByRole('listbox');
      const slice = campaigns.slice(0, 2);
      await async.forEachSeries(slice as CampaignDTO[], async (campaign) => {
        const option = await within(options).findByText(campaign.title);
        await user.click(option);
      });
      const housings = slice.flatMap((campaign) => {
        return data.campaignHousings.get(campaign.id);
      });
      const count = await screen.findByText(
        new RegExp(`${housings.length} logements`)
      );
      expect(count).toBeVisible();
    });

    it('should remove the filter by campaigns', async () => {
      render(
        <Provider store={store}>
          <Router>
            <HousingListView />
          </Router>
        </Provider>
      );

      const filter = await screen.findByLabelText(/^Campagne/);
      await user.click(filter);
      const options = await screen.findByRole('listbox');
      const slice = campaigns.slice(0, 2);
      await async.forEachSeries(slice as CampaignDTO[], async (campaign) => {
        const option = await within(options).findByText(campaign.title);
        await user.click(option);
      });
      const housings = slice.flatMap((campaign) => {
        return data.campaignHousings.get(campaign.id);
      });
      let count = await screen.findByText(
        new RegExp(`${housings.length} logements`)
      );
      expect(count).toBeVisible();
      await async.forEachSeries(slice as CampaignDTO[], async (campaign) => {
        const option = await within(options).findByText(campaign.title);
        await user.click(option);
      });
      count = await screen.findByText(
        new RegExp(`${data.housings.length} logements`)
      );
      expect(count).toBeVisible();
    });

    it('should filter by a status', async () => {
      const status: CampaignStatus = 'draft';

      render(
        <Provider store={store}>
          <Router>
            <HousingListView />
          </Router>
        </Provider>
      );

      const filter = await screen.findByLabelText(/^Campagne/);
      await user.click(filter);
      const options = await screen.findByRole('listbox');
      const option = await within(options).findByText(
        CAMPAIGN_STATUS_LABELS[status]
      );
      await user.click(option);
      const housings = fp.uniqBy(
        (housing) => housing.id,
        data.campaigns
          .filter((campaign) => campaign.status === status)
          .map((campaign) => {
            return data.campaignHousings.get(campaign.id) ?? [];
          })
          .flat()
          .map(({ id }) => {
            const housing = data.housings.find((housing) => housing.id === id);
            if (!housing) {
              throw new Error(`Housing ${id} not found`);
            }
            return housing;
          })
      );
      const count = await screen.findByText(
        new RegExp(`${housings.length} logements`)
      );
      expect(count).toBeVisible();
    });

    it('should remove the filter by status', async () => {
      const status: CampaignStatus = 'draft';

      render(
        <Provider store={store}>
          <Router>
            <HousingListView />
          </Router>
        </Provider>
      );

      const filter = await screen.findByLabelText(/^Campagne/);
      await user.click(filter);
      const options = await screen.findByRole('listbox');
      const option = await within(options).findByText(
        CAMPAIGN_STATUS_LABELS[status]
      );
      await user.click(option);
      const housings = fp.uniqBy(
        (housing) => housing.id,
        data.campaigns
          .filter((campaign) => campaign.status === status)
          .map((campaign) => {
            return data.campaignHousings.get(campaign.id) ?? [];
          })
          .flat()
          .map(({ id }) => {
            const housing = data.housings.find((housing) => housing.id === id);
            if (!housing) {
              throw new Error(`Housing ${id} not found`);
            }
            return housing;
          })
      );
      let count = await screen.findByText(
        new RegExp(`${housings.length} logements`)
      );
      expect(count).toBeVisible();
      await user.click(option);
      count = await screen.findByText(
        new RegExp(`${data.housings.length} logements`)
      );
      expect(count).toBeVisible();
    });

    it('should select a status and its campaigns if at least one of the campaigns is not selected', async () => {
      const status: CampaignStatus = 'draft';

      render(
        <Provider store={store}>
          <Router>
            <HousingListView />
          </Router>
        </Provider>
      );

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

      render(
        <Provider store={store}>
          <Router>
            <HousingListView />
          </Router>
        </Provider>
      );

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
