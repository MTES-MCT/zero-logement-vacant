import GroupHeader, { DISPLAY_GROUPS } from './GroupHeader';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'jest-fetch-mock';
import { configureStore, Store } from '@reduxjs/toolkit';
import { applicationMiddlewares, applicationReducer } from '../../store/store';
import { genAuthUser, genGroup } from '../../../test/fixtures.test';
import { Provider } from 'react-redux';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import { getRequestCalls } from '../../utils/test/requestUtils';
import config from '../../utils/config';

describe('GroupHeader', () => {
  const user = userEvent.setup();

  let store: Store;

  beforeEach(() => {
    fetchMock.resetMocks();
    store = configureStore({
      reducer: applicationReducer,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false,
        }).concat(applicationMiddlewares),
      preloadedState: {
        authentication: { authUser: genAuthUser() },
      },
    });
  });

  it('should render', async () => {
    fetchMock.mockIf(
      (request) => request.url.endsWith('/api/groups'),
      async () => ({
        status: 200,
        body: JSON.stringify(
          new Array(DISPLAY_GROUPS + 1).fill('0').map(genGroup)
        ),
      })
    );

    render(
      <Provider store={store}>
        <Router history={createMemoryHistory()}>
          <GroupHeader />
        </Router>
      </Provider>
    );

    const displayMore = await screen.findByText(/^Afficher plus/);
    expect(displayMore).toBeVisible();
  });

  it('should hide the "Display more" button if there is no more groups', async () => {
    fetchMock.mockIf(
      (request) => request.url.endsWith('/api/groups'),
      async () => ({
        status: 200,
        body: JSON.stringify(new Array(DISPLAY_GROUPS).fill('0').map(genGroup)),
      })
    );

    render(
      <Provider store={store}>
        <Router history={createMemoryHistory()}>
          <GroupHeader />
        </Router>
      </Provider>
    );

    await expect(screen.findByText(/^Afficher plus/)).toReject();
  });

  it('should display all groups when the "Display more" button is clicked', async () => {
    const groups = new Array(DISPLAY_GROUPS + 1).fill('0').map(genGroup);
    fetchMock.mockIf(
      (request) => request.url.endsWith('/api/groups'),
      async () => ({
        status: 200,
        body: JSON.stringify(groups),
      })
    );

    render(
      <Provider store={store}>
        <Router history={createMemoryHistory()}>
          <GroupHeader />
        </Router>
      </Provider>
    );

    const displayMore = await screen.findByText(/^Afficher plus/);
    await user.click(displayMore);
    const titles = await Promise.all(
      groups.map((group) => screen.findByText(group.title))
    );
    titles.forEach((title) => {
      expect(title).toBeVisible();
    });
  });

  it('should display a modal to create a group', async () => {
    const router = createMemoryHistory();
    const group = genGroup();
    fetchMock.mockIf(
      (request) => request.url.endsWith('/api/groups'),
      async () => ({
        status: 200,
        body: JSON.stringify([]),
      })
    );
    fetchMock.mockIf(
      (request) =>
        request.method === 'POST' && request.url.endsWith('/api/groups'),
      async () => ({
        status: 201,
        body: JSON.stringify(group),
      })
    );

    render(
      <Provider store={store}>
        <Router history={router}>
          <GroupHeader />
        </Router>
      </Provider>
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

    expect(router.location).toMatchObject({
      pathname: `/groupes/${group.id}`,
      state: {
        alert: 'Votre nouveau groupe a bien été créé.',
      },
    });
  });
});
