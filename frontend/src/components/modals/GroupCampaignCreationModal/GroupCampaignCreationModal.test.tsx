import { render, screen, within } from '@testing-library/react';
import GroupCampaignCreationModal from './GroupCampaignCreationModal';
import { Provider } from 'react-redux';
import { genAuthUser } from '../../../../test/fixtures.test';
import { configureStore } from '@reduxjs/toolkit';
import { applicationReducer } from '../../../store/store';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { faker } from '@faker-js/faker';
import { Group } from '../../../models/Group';
import { UserRoles } from '../../../models/User';

const createGroup = (): Group => {
    return {
      id: faker.string.uuid(),
      title: faker.lorem.words(3),
      description: faker.lorem.paragraph(),
      housingCount: faker.number.int({ min: 0, max: 100 }),
      ownerCount: faker.number.int({ min: 0, max: 50 }),
      createdAt: faker.date.past(),
      createdBy: {
        id: faker.string.uuid(),
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        role: UserRoles.Usual,
        activatedAt: faker.date.past(),
        establishmentId: faker.string.uuid(),
      },
      archivedAt: faker.datatype.boolean() ? faker.date.past() : null,
    };
  };

describe('Group campaign creation modal', () => {
  const user = userEvent.setup();
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: applicationReducer,
      preloadedState: { authentication: { authUser: genAuthUser() } }
    });
  });

  test('should display housing count, campaign title input and submit button', () => {
    const group = createGroup();
    render(
      <Provider store={store}>
        <GroupCampaignCreationModal
          group={group}
          housingCount={2}
          onSubmit={() => Promise.resolve()}
        />
      </Provider>
    );

    const housingInfosTextElement = screen.getByTestId('housing-infos');
    const campaignTitleInputElement = screen.getAllByTestId(
      'campaign-title-input'
    )[0];
    const createButton = screen.getByText('Créer une campagne');
    expect(housingInfosTextElement).toBeInTheDocument();
    expect(housingInfosTextElement.textContent).toBe(
      'Vous êtes sur le point de créer une campagne comportant 2 logements.'
    );
    expect(campaignTitleInputElement).toBeInTheDocument();
    expect(createButton).toBeInTheDocument();
  });

  test('should require campaign title', async () => {
    const group = createGroup();
    render(
      <Provider store={store}>
        <GroupCampaignCreationModal
          group={group}
          housingCount={2}
          onSubmit={() => Promise.resolve()}
        />
      </Provider>
    );

    const createButton = screen.getByText('Créer une campagne');
    expect(createButton).toBeVisible();
    await user.click(createButton);

    const modal = screen.getByRole('dialog');
    const save = within(modal).getByText('Confirmer');
    await user.click(save);

    const error = await screen.findByText(
      'Veuillez renseigner le titre de la campagne.'
    );
    expect(error).toBeVisible();
  });

  test('should restrict campaign title exceeding 64 characters in length', async () => {
    const group = createGroup();
    render(
      <Provider store={store}>
        <GroupCampaignCreationModal
          group={group}
          housingCount={2}
          onSubmit={() => Promise.resolve()}
        />
      </Provider>
    );

    const createButton = screen.getByText('Créer une campagne');
    expect(createButton).toBeVisible();
    await user.click(createButton);

    const campaignTitleInputElement = screen.getAllByTestId(
      'campaign-title-input'
    )[0].childNodes[0] as Element;

    await userEvent.type(campaignTitleInputElement, faker.lorem.paragraph());

    const modal = screen.getByRole('dialog');
    const save = within(modal).getByText('Confirmer');
    await user.click(save);

    const error = await screen.findByText(
      'La longueur maximale du titre de la campagne est de 64 caractères.'
    );
    expect(error).toBeVisible();
  });

  test('should restrict campaign description exceeding 1000 characters in length', async () => {
    const group = createGroup();
    render(
      <Provider store={store}>
        <GroupCampaignCreationModal
          group={group}
          housingCount={2}
          onSubmit={() => Promise.resolve()}
        />
      </Provider>
    );

    const createButton = screen.getByText('Créer une campagne');
    expect(createButton).toBeVisible();
    await user.click(createButton);

    const campaignTitleInputElement = screen.getAllByTestId(
      'campaign-title-input'
    )[0].childNodes[0] as Element;

    await userEvent.type(campaignTitleInputElement, faker.lorem.words(3));

    const campaignDescriptionInputElement = screen.getAllByTestId(
      'campaign-description-input'
    )[0].childNodes[0] as Element;

    await userEvent.type(campaignDescriptionInputElement, faker.lorem.sentences(50));

    const modal = screen.getByRole('dialog');
    const save = within(modal).getByText('Confirmer');
    await user.click(save);

    const error = await screen.findByText(
      'La longueur maximale de la description de la campagne est de 1000 caractères.'
    );
    expect(error).toBeVisible();
  });

});
