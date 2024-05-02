import GroupHeader, { DISPLAY_GROUPS } from './GroupHeader';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'jest-fetch-mock';
import { Store } from '@reduxjs/toolkit';
import { genGroup } from '../../test/fixtures.test';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import { getRequestCalls, mockRequests } from '../../utils/test/requestUtils';
import config from '../../utils/config';
import configureTestStore from '../../utils/test/storeUtils';

describe('GroupHeader', () => {
  const user = userEvent.setup();

  let store: Store;

  beforeEach(() => {
    fetchMock.resetMocks();
    store = configureTestStore();
  });

  it('should render', async () => {
    fetchMock.mockIf(
      (request) => request.url.endsWith('/api/groups'),
      async () => ({
        status: 200,
        body: JSON.stringify(
          new Array(DISPLAY_GROUPS + 1).fill('0').map(genGroup),
        ),
      }),
    );

    render(
      <Provider store={store}>
        <Router>
          <GroupHeader />
        </Router>
      </Provider>,
    );

    const displayMore = await screen.findByText(/^Afficher plus/);
    expect(displayMore).toBeVisible();
  });

  it('should hide groups that have been archived', async () => {
    const archived = { ...genGroup(), archivedAt: new Date().toJSON() };
    const groups = [genGroup(), genGroup(), archived];
    mockRequests([
      {
        pathname: '/api/groups',
        response: {
          status: 200,
          body: JSON.stringify(groups),
        },
      },
    ]);

    render(
      <Provider store={store}>
        <Router>
          <GroupHeader />
        </Router>
      </Provider>,
    );

    const cards = await screen.findAllByRole('group-card');
    expect(cards).toBeArrayOfSize(
      groups.filter((group) => !group.archivedAt).length,
    );
  });

  it('should hide the "Display more" button if there is no more group', async () => {
    mockRequests([
      {
        pathname: '/api/groups',
        response: {
          status: 200,
          body: JSON.stringify(
            new Array(DISPLAY_GROUPS).fill('0').map(genGroup),
          ),
        },
      },
    ]);

    render(
      <Provider store={store}>
        <Router>
          <GroupHeader />
        </Router>
      </Provider>,
    );

    await expect(screen.findByText(/^Afficher plus/)).toReject();
  });

  it('should display all groups when the "Display more" button is clicked', async () => {
    const groups = new Array(DISPLAY_GROUPS + 1).fill('0').map(genGroup);
    mockRequests([
      {
        pathname: '/api/groups',
        response: {
          status: 200,
          body: JSON.stringify(groups),
        },
      },
    ]);

    render(
      <Provider store={store}>
        <Router>
          <GroupHeader />
        </Router>
      </Provider>,
    );

    const displayMore = await screen.findByText(/^Afficher plus/);
    await user.click(displayMore);
    const titles = await Promise.all(
      groups.map((group) => screen.findByText(group.title)),
    );
    titles.forEach((title) => {
      expect(title).toBeVisible();
    });
  });

  it('should display a modal to create a group', async () => {
    const group = genGroup();
    mockRequests([
      {
        pathname: '/api/groups',
        method: 'GET',
        response: {
          status: 200,
          body: JSON.stringify([]),
        },
      },
      {
        pathname: '/api/groups',
        method: 'POST',
        response: {
          status: 201,
          body: JSON.stringify(group),
        },
      },
    ]);

    render(
      <Provider store={store}>
        <Router>
          <GroupHeader />
        </Router>
      </Provider>,
    );

    const createGroup = await screen.findByText(/Créer un nouveau groupe/);
    await user.click(createGroup);
    const title = await screen.findByLabelText(/^Nom du groupe/);
    await user.type(title, 'Logements prioritaires');
    const description = await screen.findByText('Description');
    await user.type(description, 'Les logements prioritaires');
    const confirm = await screen.findByText('Confirmer');
    await user.click(confirm);

    const requests = await getRequestCalls(fetchMock);
    expect(requests).toContainEqual({
      url: `${config.apiEndpoint}/api/groups`,
      method: 'POST',
      body: {
        title: 'Logements prioritaires',
        description: 'Les logements prioritaires',
      },
    });

    const text = await screen.findByText(
      /^Votre nouveau groupe a bien été créé./,
    );
    expect(text).toBeVisible();
  });
});
