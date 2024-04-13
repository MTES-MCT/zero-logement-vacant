import { configureStore, Store } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import GroupAddHousingModal from './GroupAddHousingModal';
import {
  applicationMiddlewares,
  applicationReducer,
} from '../../../store/store';
import { genAuthUser, genGroup } from '../../../test/fixtures.test';
import { Provider } from 'react-redux';

describe('GroupHousingModal', () => {
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

  const onSubmit = jest.fn();
  const onGroupCreate = jest.fn();

  it('should render', async () => {
    fetchMock.mockIf(
      (request) => request.url.endsWith('/api/groups'),
      async () => ({
        status: 200,
        body: JSON.stringify(new Array(3).fill('0').map(genGroup)),
      }),
    );

    render(
      <Provider store={store}>
        <GroupAddHousingModal
          onGroupSelect={onSubmit}
          onGroupCreate={onGroupCreate}
        />
      </Provider>,
    );

    const select = await screen.findByLabelText(
      /Ajoutez votre sélection à un groupe existant/,
    );
    await user.click(select);
  });
});
