import { render, screen, within } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';
import { Provider } from 'react-redux';
import HousingListView from './HousingListView';
import config from '../../utils/config';
import { initialHousingFilters } from '../../store/reducers/housingReducer';
import {
  genCampaign,
  genDatafoncierHousing,
  genGroup,
  genHousing,
  genPaginatedResult,
} from '../../../test/fixtures.test';
import { MemoryRouter as Router, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import {
  getRequestCalls,
  mockRequests,
  RequestMatch,
} from '../../utils/test/requestUtils';
import { HousingStatus } from '../../models/HousingState';
import configureTestStore from '../../utils/test/storeUtils';
import { AppStore } from '../../store/store';
import * as randomstring from 'randomstring';
import { Housing } from '../../models/Housing';
import { Group } from '../../models/Group';
import GroupView from '../Group/GroupView';
import { GroupDTO } from '@zerologementvacant/models';
import fp from 'lodash/fp';
import { Owner } from '../../models/Owner';

jest.mock('../../components/Aside/Aside.tsx');

describe('Housing list view', () => {
  const user = userEvent.setup();
  let store: AppStore;

  const defaultMatches: RequestMatch[] = [
    {
      pathname: '/api/housing',
      response: {
        body: JSON.stringify(genPaginatedResult([])),
      },
    },
    {
      pathname: '/api/campaigns',
      response: {
        body: JSON.stringify([]),
      },
    },
    {
      pathname: '/api/geo/perimeters',
      response: {
        body: JSON.stringify([]),
      },
    },
    {
      pathname: '/api/localities',
      response: {
        body: JSON.stringify([]),
      },
    },
    {
      pathname: '/api/housing/count',
      persist: true,
      response: {
        body: JSON.stringify({ housing: 1, owners: 1 }),
      },
    },
  ];

  beforeEach(() => {
    store = configureTestStore();
  });

  it('should filter by housing kind', async () => {
    const housings: Housing[] = [
      genHousing(),
      { ...genHousing(), housingKind: 'MAISON' },
      { ...genHousing(), housingKind: 'APPART' },
      { ...genHousing(), housingKind: 'APPART' },
    ];
    const apartments = housings.filter(
      (housing) => housing.housingKind === 'APPART',
    );
    const uniqueOwners = fp.pipe(
      fp.map<Housing, Owner>((housing) => housing.owner),
      fp.uniqBy<Owner>('id'),
    );
    mockRequests([
      {
        pathname: '/api/groups',
        response: {
          body: JSON.stringify([]),
        },
      },
      {
        pathname: '/api/housing',
        persist: true,
        response: async (request) => {
          const body = await request.json();
          const { housingKinds, status } = body.filter;
          const filtered = housings
            .filter((housing) => (status ? status === housing.status : true))
            .filter((housing) =>
              housingKinds ? housingKinds.includes(housing.housingKind) : true,
            );
          return {
            body: JSON.stringify(genPaginatedResult(filtered)),
          };
        },
      },
      {
        pathname: '/api/housing/count',
        method: 'POST',
        persist: true,
        response: async (request) => {
          const body = await request.json();
          const { housingKinds, status } = body.filters;
          const filtered = housings
            .filter((housing) => (status ? status === housing.status : true))
            .filter((housing) =>
              housingKinds ? housingKinds.includes(housing.housingKind) : true,
            );
          return {
            body: JSON.stringify({
              housing: filtered.length,
              owners: uniqueOwners(filtered).length,
            }),
          };
        },
      },
      {
        pathname: '/api/campaigns',
        response: {
          body: JSON.stringify([]),
        },
      },
      {
        pathname: '/api/geo/perimeters',
        response: {
          body: JSON.stringify([]),
        },
      },
      {
        pathname: '/api/localities',
        response: {
          body: JSON.stringify([]),
        },
      },
    ]);

    render(
      <Provider store={store}>
        <Router>
          <HousingListView />
        </Router>
      </Provider>,
    );

    const accordion = await screen.findByRole('button', { name: /^Logement/ });
    await user.click(accordion);
    const checkbox = await screen.findByRole('checkbox', {
      name: /^Appartement/,
    });
    await user.click(checkbox);
    const text = `${apartments.length} logements (${apartments.length} propriétaires) filtrés sur un total de ${housings.length} logements`;
    await screen.findByText(text);
  });

  test('should search', async () => {
    const housing = genHousing();
    const campaign = genCampaign();
    const paginated = genPaginatedResult([housing]);

    fetchMock.mockResponse((request: Request) => {
      return Promise.resolve(
        request.url === `${config.apiEndpoint}/api/housing`
          ? { body: JSON.stringify(paginated), init: { status: 200 } }
          : request.url === `${config.apiEndpoint}/api/campaigns`
            ? { body: JSON.stringify([campaign]), init: { status: 200 } }
            : request.url === `${config.apiEndpoint}/api/geo/perimeters`
              ? { body: JSON.stringify([]), init: { status: 200 } }
              : request.url.startsWith(`${config.apiEndpoint}/api/localities`)
                ? { body: JSON.stringify([]), init: { status: 200 } }
                : request.url === `${config.apiEndpoint}/api/housing/count`
                  ? {
                      body: JSON.stringify({ housing: 1, owners: 1 }),
                      init: { status: 200 },
                    }
                  : { body: '', init: { status: 404 } },
      );
    });

    render(
      <Provider store={store}>
        <Router>
          <HousingListView />
        </Router>
      </Provider>,
    );

    const searchInputElement = await screen.findByTestId('search-input');
    const searchButtonElement = await screen.findByTitle('Bouton de recherche');

    await user.type(searchInputElement, 'my search');
    await user.click(searchButtonElement);

    const requests = await getRequestCalls(fetchMock);

    expect(requests).toContainEqual({
      url: `${config.apiEndpoint}/api/housing`,
      method: 'POST',
      body: {
        filters: { ...initialHousingFilters, query: 'my search' },
        page: 1,
        perPage: config.perPageDefault,
        paginate: true,
      },
    });
  });

  test('should not display the button to create campaign if no housing are selected', async () => {
    const housing = genHousing();
    const campaign = genCampaign();
    const paginated = genPaginatedResult([housing]);

    fetchMock.mockResponse((request: Request) => {
      return Promise.resolve(
        request.url === `${config.apiEndpoint}/api/housing`
          ? { body: JSON.stringify(paginated), init: { status: 200 } }
          : request.url === `${config.apiEndpoint}/api/campaigns`
            ? { body: JSON.stringify([campaign]), init: { status: 200 } }
            : request.url === `${config.apiEndpoint}/api/geo/perimeters`
              ? { body: JSON.stringify([]), init: { status: 200 } }
              : request.url.startsWith(`${config.apiEndpoint}/api/localities`)
                ? { body: JSON.stringify([]), init: { status: 200 } }
                : request.url === `${config.apiEndpoint}/api/housing/count`
                  ? {
                      body: JSON.stringify({ housing: 1, owners: 1 }),
                      init: { status: 200 },
                    }
                  : { body: '', init: { status: 404 } },
      );
    });

    render(
      <Provider store={store}>
        <Router>
          <HousingListView />
        </Router>
      </Provider>,
    );

    const createCampaignButton = screen.queryByTestId('create-campaign-button');

    expect(createCampaignButton).not.toBeInTheDocument();
  });

  test('should enable the creation of the campaign when at least a housing is selected', async () => {
    const housing = genHousing();
    const campaign = genCampaign();
    const paginated = genPaginatedResult([housing]);

    fetchMock.mockResponse((request: Request) => {
      return Promise.resolve(
        request.url === `${config.apiEndpoint}/api/housing`
          ? { body: JSON.stringify(paginated), init: { status: 200 } }
          : request.url === `${config.apiEndpoint}/api/campaigns`
            ? { body: JSON.stringify([campaign]), init: { status: 200 } }
            : request.url === `${config.apiEndpoint}/api/geo/perimeters`
              ? { body: JSON.stringify([]), init: { status: 200 } }
              : request.url.startsWith(`${config.apiEndpoint}/api/localities`)
                ? { body: JSON.stringify([]), init: { status: 200 } }
                : request.url === `${config.apiEndpoint}/api/housing/count`
                  ? {
                      body: JSON.stringify({ housing: 1, owners: 1 }),
                      init: { status: 200 },
                    }
                  : { body: '', init: { status: 404 } },
      );
    });

    render(
      <Provider store={store}>
        <Router>
          <HousingListView />
        </Router>
      </Provider>,
    );

    const tabPanels = await screen.findAllByRole('tabpanel');

    const housing1Element = await within(tabPanels[0]).findByTestId(
      'housing-check-' + housing.id,
    );
    // eslint-disable-next-line testing-library/no-node-access
    const housing1CheckboxElement = housing1Element.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;

    await user.click(housing1CheckboxElement);

    const createCampaignButton = await screen.findByTestId(
      'create-campaign-button',
    );
    expect(createCampaignButton).toBeInTheDocument();
  });

  describe('If the user does not know the local id', () => {
    test('should add a housing', async () => {
      const datafoncierHousing = genDatafoncierHousing();
      const housing = genHousing();
      mockRequests([
        ...defaultMatches,
        {
          pathname: `/api/datafoncier/housing/${datafoncierHousing.idlocal}`,
          response: {
            body: JSON.stringify(housing),
          },
        },
        {
          pathname: `/api/housing/${datafoncierHousing.idlocal}`,
          response: {
            status: 404,
            body: JSON.stringify({
              name: 'HousingMissingError',
              message: `Housing ${datafoncierHousing.idlocal} missing`,
            }),
          },
        },
        {
          pathname: '/api/housing/creation',
          response: {
            status: 201,
            body: JSON.stringify(housing),
          },
        },
      ]);

      render(
        <Provider store={store}>
          <Router>
            <HousingListView />
          </Router>
        </Provider>,
      );

      const button = await screen.findByRole('button', {
        name: /^Ajouter un logement/,
      });
      await user.click(button);
      const modal = await screen.findByRole('dialog');
      const input = await within(modal).findByLabelText(
        /^Identifiant du logement/,
      );
      await user.type(input, datafoncierHousing.idlocal);
      await user.click(within(modal).getByText('Confirmer'));
      await within(modal).findByText(
        'Voici le logement que nous avons trouvé à cette adresse/sur cette parcelle.',
      );
      await user.click(within(modal).getByText('Confirmer'));

      expect(modal).not.toBeVisible();
      const alert = await screen.findByText(
        'Le logement sélectionné a bien été ajouté à votre parc de logements.',
      );
      expect(alert).toBeVisible();
    });

    test('should fail if the housing was not found in datafoncier', async () => {
      const localId = randomstring.generate(12);
      mockRequests([
        ...defaultMatches,
        // The housing is missing from datafoncier
        {
          pathname: `/api/datafoncier/housing/${localId}`,
          response: {
            status: 404,
            body: JSON.stringify({
              name: 'HousingMissingError',
              message: `Housing ${localId} missing`,
            }),
          },
        },
        {
          pathname: `/api/housing/${localId}`,
          response: {
            status: 404,
            body: JSON.stringify({
              name: 'HousingMissingError',
              message: `Housing ${localId} missing`,
            }),
          },
        },
      ]);

      render(
        <Provider store={store}>
          <Router>
            <HousingListView />
          </Router>
        </Provider>,
      );

      const button = screen.getByText('Ajouter un logement', {
        selector: 'button',
      });
      await user.click(button);
      const modal = await screen.findByRole('dialog');
      const input = await within(modal).findByLabelText(
        /^Identifiant du logement/,
      );
      await user.type(input, localId);
      await user.click(within(modal).getByText('Confirmer'));
      const alert = await within(modal).findByText(
        'Nous n’avons pas pu trouver de logement avec les informations que vous avez fournies.',
      );
      expect(alert).toBeVisible();
    });

    test('should fail if the housing already exists in our database', async () => {
      const datafoncierHousing = genDatafoncierHousing();
      const housing = genHousing();
      mockRequests([
        ...defaultMatches,
        {
          pathname: `/api/datafoncier/housing/${datafoncierHousing.idlocal}`,
          response: {
            status: 200,
            body: JSON.stringify(datafoncierHousing),
          },
        },
        // The housing exists in our database
        {
          pathname: `/api/housing/${datafoncierHousing.idlocal}`,
          response: {
            status: 200,
            body: JSON.stringify(housing),
          },
        },
      ]);

      render(
        <Provider store={store}>
          <Router>
            <HousingListView />
          </Router>
        </Provider>,
      );

      const button = screen.getByText('Ajouter un logement', {
        selector: 'button',
      });
      await user.click(button);
      const modal = await screen.findByRole('dialog');
      const input = await within(modal).findByLabelText(
        /^Identifiant du logement/,
      );
      await user.type(input, datafoncierHousing.idlocal);
      await user.click(within(modal).getByText('Confirmer'));
      const alert = await within(modal).findByText(
        'Ce logement existe déjà dans votre parc',
      );
      expect(alert).toBeVisible();
    });
  });

  test('should add all housing to a group immediately', async () => {
    let group: Group = genGroup();
    let groupDTO: GroupDTO | null = null;
    const housings = Array.from({ length: 3 }, () => genHousing());
    mockRequests([
      ...defaultMatches.filter(
        (match) => !match.pathname.startsWith('/api/housing'),
      ),
      {
        pathname: '/api/housing',
        method: 'POST',
        persist: true,
        response: {
          body: JSON.stringify(genPaginatedResult(housings)),
        },
      },
      {
        pathname: '/api/housing/count',
        method: 'POST',
        persist: true,
        response: {
          body: JSON.stringify({ housing: housings.length, owners: 1 }),
        },
      },
      {
        pathname: '/api/groups',
        method: 'GET',
        response: {
          body: JSON.stringify([]),
        },
      },
      {
        pathname: '/api/groups',
        method: 'POST',
        response: async (request) => {
          const body = await request.json();
          group = {
            ...group,
            ownerCount: 1,
            title: body.title,
            description: body.description,
          };
          groupDTO = {
            ...group,
            createdAt: group.createdAt.toJSON(),
            archivedAt: null,
            createdBy: undefined,
          };
          return {
            status: 201,
            body: JSON.stringify(groupDTO),
          };
        },
      },
      {
        pathname: '/api/groups',
        response: {
          body: JSON.stringify([groupDTO]),
        },
      },
      {
        pathname: `/api/groups/${group.id}`,
        response: async () => {
          return {
            body: JSON.stringify(groupDTO),
          };
        },
      },
    ]);

    render(
      <Provider store={store}>
        <Router initialEntries={['/parc-de-logements']}>
          <Route path="/parc-de-logements" component={HousingListView} />
          <Route path="/groupes/:id" component={GroupView} />
        </Router>
      </Provider>,
    );

    const checkboxes = await within(
      await screen.findByTestId('housing-table'),
    ).findAllByRole('checkbox');
    const [checkAll] = checkboxes;
    await user.click(checkAll);
    const addGroupHousing = await screen.findByText('Ajouter dans un groupe');
    await user.click(addGroupHousing);
    const modal = await screen.findByRole('dialog');
    const createGroup = await within(modal).findByText(
      /^Créer un nouveau groupe/,
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
      'Votre nouveau groupe a bien été créé et les logements sélectionnés ont bien été ajoutés.',
    );
    expect(alert).toBeVisible();
  });

  test('should create the group immediately and add the housing later', async () => {
    const group = genGroup();
    const housingCount = 10;
    mockRequests([
      ...defaultMatches.filter(
        (match) => !match.pathname.startsWith('/api/housing'),
      ),
      {
        pathname: '/api/housing',
        method: 'POST',
        response: {
          body: JSON.stringify(
            genPaginatedResult(
              new Array(housingCount).fill('0').map(() => genHousing()),
            ),
          ),
          status: 200,
        },
      },
      {
        pathname: '/api/housing/count',
        method: 'POST',
        response: {
          body: JSON.stringify({ housing: housingCount, owners: 1 }),
        },
      },
      {
        pathname: '/api/groups',
        method: 'POST',
        response: {
          status: 202,
          body: JSON.stringify(group),
        },
      },
      {
        pathname: `/api/groups/${group.id}`,
        response: async () => {
          return {
            body: JSON.stringify(group),
          };
        },
      },
    ]);

    render(
      <Provider store={store}>
        <Router initialEntries={['/parc-de-logements']}>
          <Route path="/parc-de-logements" component={HousingListView} />
          <Route path="/groupes/:id" component={GroupView} />
        </Router>
      </Provider>,
    );

    const checkboxes = await within(
      await screen.findByTestId('housing-table'),
    ).findAllByRole('checkbox');
    const [checkAll] = checkboxes;
    await user.click(checkAll);
    const addGroupHousing = await screen.findByText('Ajouter dans un groupe');
    await user.click(addGroupHousing);
    const modal = await screen.findByRole('dialog');
    const createGroup = await within(modal).findByText(
      /^Créer un nouveau groupe/,
    );
    await user.click(createGroup);
    const groupName = await within(modal).findByLabelText('Nom du groupe');
    await user.type(groupName, 'My group');
    const groupDescription = await within(modal).findByLabelText('Description');
    await user.type(groupDescription, 'My group description');
    const confirm = await within(modal).findByText('Confirmer');
    await user.click(confirm);

    const alert = await screen.findByText(
      'Votre nouveau groupe a bien été créé. Les logements vont être ajoutés au fur et à mesure...',
    );
    expect(alert).toBeVisible();
  });

  describe('Housing tabs', () => {
    it('should select a default tab', async () => {
      mockRequests(defaultMatches);

      render(
        <Provider store={store}>
          <Router>
            <HousingListView />
          </Router>
        </Provider>,
      );

      const tab = await screen.findByRole('tab', { selected: true });
      expect(tab).toHaveTextContent(/^Tous/);
    });

    it('should open another tab', async () => {
      const housing: Housing = {
        ...genHousing(),
        status: HousingStatus.Waiting,
      };
      mockRequests([
        ...defaultMatches.slice(1),
        {
          pathname: '/api/housing',
          method: 'POST',
          response: {
            body: JSON.stringify([housing]),
          },
        },
      ]);

      render(
        <Provider store={store}>
          <Router>
            <HousingListView />
          </Router>
        </Provider>,
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
