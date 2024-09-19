import { configureStore, Store } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import GroupAddHousingModal from './GroupAddHousingModal';
import {
  applicationMiddlewares,
  applicationReducer
} from '../../../store/store';
import { genAuthUser } from '../../../../test/fixtures.test';
import { Provider } from 'react-redux';
import { faker } from '@faker-js/faker';

describe('GroupHousingModal', () => {
  const user = userEvent.setup();

  let store: Store;

  beforeEach(() => {
    store = configureStore({
      reducer: applicationReducer,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false
        }).concat(applicationMiddlewares),
      preloadedState: {
        authentication: { authUser: genAuthUser() }
      }
    });
  });

  const onSubmit = jest.fn();
  const onGroupCreate = jest.fn();

  it('should render', async () => {
    render(
      <Provider store={store}>
        <GroupAddHousingModal
          onGroupSelect={onSubmit}
          onGroupCreate={onGroupCreate}
        />
      </Provider>
    );

    const select = await screen.findByLabelText(
      /Ajoutez votre sélection à un groupe existant/
    );
    await user.click(select);
  });

  test('should require group name', async () => {
    render(
      <Provider store={store}>
        <GroupAddHousingModal
          onGroupSelect={onSubmit}
          onGroupCreate={onGroupCreate}
        />
      </Provider>
    );
    
    const createButton = await screen.findByText('Créer un nouveau groupe');
    await user.click(createButton);

    const save =  await screen.findByText('Confirmer');
    await user.click(save);

    const error = await screen.findByText(
      'Veuillez donner un nom au groupe pour confirmer'
    );
    expect(error).toBeInTheDocument();
  });

  test('should restrict group name exceeding 64 characters in length', async () => {
    render(
      <Provider store={store}>
        <GroupAddHousingModal
          onGroupSelect={onSubmit}
          onGroupCreate={onGroupCreate}
        />
      </Provider>
    );

    const createButton = await screen.findByText('Créer un nouveau groupe');
    await user.click(createButton);

    const campaignTitleInputElement = screen.getByLabelText(/^Nom du groupe/);

    await userEvent.type(campaignTitleInputElement, faker.lorem.paragraph());

    const save = await screen.findByText('Confirmer');
    await user.click(save);

    const error = await screen.findByText(
      'La longueur maximale du titre du groupe est de 64 caractères.'
    );
    expect(error).toBeInTheDocument();
  });

  test('should restrict group description exceeding 1000 characters in length', async () => {
    render(
      <Provider store={store}>
        <GroupAddHousingModal
          onGroupSelect={onSubmit}
          onGroupCreate={onGroupCreate}
        />
      </Provider>
    );

    const createButton = await screen.findByText('Créer un nouveau groupe');
    await user.click(createButton);

    const campaignTitleInputElement = screen.getByLabelText(/^Nom du groupe/);

    await userEvent.type(campaignTitleInputElement, faker.lorem.words(3));

    const campaignDescriptionInputElement = screen.getByLabelText(/^Description/);

    await userEvent.type(campaignDescriptionInputElement, faker.lorem.sentences(50));

    const save = await screen.findByText('Confirmer');
    await user.click(save);

    const error = await screen.findByText(
      'La longueur maximale de la description du groupe est de 1000 caractères.'
    );
    expect(error).toBeInTheDocument();
  });
});
