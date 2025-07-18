import { faker } from '@faker-js/faker';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserRole } from '@zerologementvacant/models';
import { Provider } from 'react-redux';
import { Group } from '../../../models/Group';
import configureTestStore from '../../../utils/test/storeUtils';
import GroupCampaignCreationModal from './GroupCampaignCreationModal';

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
      role: UserRole.USUAL,
      activatedAt: faker.date.past(),
      establishmentId: faker.string.uuid()
    },
    archivedAt: faker.datatype.boolean() ? faker.date.past() : null
  };
};

describe('Group campaign creation modal', () => {
  const user = userEvent.setup();
  let store: any;

  beforeEach(() => {
    store = configureTestStore({
      withAuth: true
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
    const campaignTitleInputElement = screen.getByLabelText(
      /^Titre de la campagne/
    );
    const createButton = screen.getByRole('button', {
      name: /^Créer une campagne/
    });
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

    const createButton = screen.getByRole('button', {
      name: /^Créer une campagne/
    });
    expect(createButton).toBeVisible();
    await user.click(createButton);

    const modal = screen.getByRole('dialog');
    const save = await within(modal).findByRole('button', {
      name: /^Confirmer/
    });
    await user.click(save);

    const error = await screen.findByText(
      'Veuillez renseigner le titre de la campagne.'
    );
    expect(error).toBeInTheDocument();
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

    const createButton = screen.getByRole('button', {
      name: /^Créer une campagne/
    });
    expect(createButton).toBeVisible();
    await user.click(createButton);

    const campaignTitleInputElement = screen.getByLabelText(
      /^Titre de la campagne/
    );

    await userEvent.type(campaignTitleInputElement, faker.lorem.paragraph());

    const modal = screen.getByRole('dialog');
    const save = await within(modal).findByRole('button', {
      name: /^Confirmer/
    });
    await user.click(save);

    const error = await screen.findByText(
      'La longueur maximale du titre de la campagne est de 64 caractères.'
    );
    expect(error).toBeInTheDocument();
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

    const createButton = screen.getByRole('button', {
      name: /^Créer une campagne/
    });
    expect(createButton).toBeVisible();
    await user.click(createButton);

    const campaignTitleInputElement = screen.getByLabelText(
      /^Titre de la campagne/
    );

    await userEvent.type(campaignTitleInputElement, faker.lorem.words(3));

    const campaignDescriptionInputElement = screen.getByLabelText(
      /^Description de la campagne/
    );

    await userEvent.type(
      campaignDescriptionInputElement,
      faker.lorem.sentences(50)
    );

    const modal = screen.getByRole('dialog');
    const save = await within(modal).findByRole('button', {
      name: /^Confirmer/
    });
    await user.click(save);

    const error = await screen.findByText(
      'La longueur maximale de la description de la campagne est de 1000 caractères.'
    );
    expect(error).toBeInTheDocument();
  });
});
