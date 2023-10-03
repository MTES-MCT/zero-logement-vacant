import GroupHeader, { DISPLAY_GROUPS } from './GroupHeader';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'jest-fetch-mock';
import { configureStore, Store } from '@reduxjs/toolkit';
import { applicationMiddlewares, applicationReducer } from '../../store/store';
import { genAuthUser, genGroup } from '../../../test/fixtures.test';
import { Provider } from 'react-redux';

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
        <GroupHeader />
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
        <GroupHeader />
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
        <GroupHeader />
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
});
