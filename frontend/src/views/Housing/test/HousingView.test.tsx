import { faker } from '@faker-js/faker';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  HousingDTO,
  HousingOwnerDTO,
  HousingStatus,
  Occupancy,
  OwnerDTO,
  OwnerRank
} from '@zerologementvacant/models';
import {
  genHousingDTO,
  genHousingOwnerDTO,
  genOwnerDTO
} from '@zerologementvacant/models/fixtures';
import { format, subYears } from 'date-fns';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import data from '../../../mocks/handlers/data';
import configureTestStore from '../../../utils/test/storeUtils';
import HousingView from '../HousingView';

describe('Housing view', () => {
  const user = userEvent.setup();

  let owner: OwnerDTO;
  let housing: HousingDTO;
  let housingOwners: HousingOwnerDTO[];

  beforeEach(() => {
    owner = genOwnerDTO();
    const secondaryOwners = Array.from({ length: 3 }, genOwnerDTO);
    data.owners.push(owner, ...secondaryOwners);
    housing = {
      ...genHousingDTO(owner),
      status: HousingStatus.NEVER_CONTACTED,
      subStatus: null,
      occupancy: Occupancy.VACANT,
      occupancyIntended: null
    };
    data.housings.push(housing);
    housingOwners = [owner, ...secondaryOwners].map((owner, i) => ({
      ...genHousingOwnerDTO(owner),
      rank: (i + 1) as OwnerRank
    }));
    data.housingOwners.set(housing.id, housingOwners);
  });

  function renderView(housing: HousingDTO) {
    const store = configureTestStore();
    const router = createMemoryRouter(
      [{ path: '/housing/:housingId', element: <HousingView /> }],
      {
        initialEntries: [`/housing/${housing.id}`]
      }
    );
    render(
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    );
  }

  it('should throw an error if the housing is missing', async () => {
    const owner = genOwnerDTO();
    const missingHousing = genHousingDTO(owner);

    renderView(missingHousing);

    const error = await screen.findByRole('heading', {
      name: 'Page non trouvée'
    });
    expect(error).toBeVisible();
  });

  it('should display the main owner', async () => {
    renderView(housing);

    const name = await screen.findByLabelText('Nom et prénom');
    expect(name).toHaveTextContent(owner.fullName);
  });

  describe('Show housing details', () => {
    describe('Vacancy start year', () => {
      it('should be unknown', async () => {
        housing.occupancy = Occupancy.RENT;
        housing.vacancyStartYear = null;

        renderView(housing);

        const vacancyStartYear = await screen.findByLabelText(
          'Année de début de vacance déclarée'
        );
        expect(vacancyStartYear).toHaveTextContent('Pas d’information');
      });

      it('should be defined', async () => {
        housing.occupancy = Occupancy.VACANT;
        housing.vacancyStartYear = new Date().getFullYear() - 1;

        renderView(housing);

        const vacancyStartYear = await screen
          .findByText(/^Année de début de vacance déclarée/)
          .then((label) => label.nextElementSibling);
        expect(vacancyStartYear).toHaveTextContent(
          `${format(subYears(new Date(), 1), 'yyyy')} (1 an)`
        );
      });
    });

    describe('Source', () => {
      it('should be "Fichiers fonciers (2023)"', async () => {
        housing.dataFileYears = ['ff-2023'];

        renderView(housing);

        const source = await screen.findByText(/^Source des informations/);
        expect(source).toHaveTextContent('Fichiers fonciers (2023)');
      });
    });
  });

  describe('Update owner details', () => {
    it('should update their name', async () => {
      renderView(housing);

      const modifyOwners = await screen.findByRole('button', {
        name: /^Modifier/,
        description: 'Modifier le propriétaire'
      });
      await user.click(modifyOwners);
      const modal = await screen.findByRole('dialog');
      const accordions = await within(modal).findAllByRole('button', {
        expanded: false
      });
      const [firstAccordion] = accordions;
      await user.click(firstAccordion);
      const inputs = await within(modal).findAllByLabelText(/^Nom prénom/);
      const [input] = inputs;
      const newName = faker.person.fullName();
      await user.clear(input);
      await user.type(input, newName);
      const save = await within(modal).findByRole('button', {
        name: /^Enregistrer/
      });
      await user.click(save);

      expect(modal).not.toBeVisible();
      const name = await screen.findByLabelText('Nom et prénom');
      expect(name).toBeVisible();
    });
  });

  describe('Add owner', () => {
    it('should add an owner who is missing from the database', async () => {
      renderView(housing);

      const newOwner = genOwnerDTO();
      const modifyOwners = await screen.findByRole('button', {
        name: /^Modifier/,
        description: 'Modifier le propriétaire'
      });
      await user.click(modifyOwners);
      const modal = await screen.findByRole('dialog');
      const addOwner = await within(modal).findByRole('button', {
        name: /^Ajouter un propriétaire/
      });
      await user.click(addOwner);
      const rank = await within(modal).findByLabelText(
        /^Sélectionner les droits de propriétés/
      );
      await user.selectOptions(rank, String(housingOwners.length + 1));
      const identity = await within(modal).findByLabelText(/^Identité/);
      await user.type(identity, newOwner.fullName);
      const birthDate =
        await within(modal).findByLabelText(/^Date de naissance/);
      await user.type(birthDate, newOwner.birthDate as string);
      const address = await within(modal).findByLabelText(/^Adresse postale/);
      if (newOwner.rawAddress) {
        await user.type(address, newOwner.rawAddress.join(' '));
      }
      const email = await within(modal).findByLabelText(/^Adresse mail/);
      await user.type(email, newOwner.email as string);
      const phone = await within(modal).findByLabelText(/^Numéro de téléphone/);
      await user.type(phone, newOwner.phone as string);
      const add = await within(modal).findByRole('button', {
        name: /^Ajouter/
      });
      await user.click(add);
      const newAccordion = await within(modal).findByRole('button', {
        name: new RegExp(`^${newOwner.fullName}`)
      });
      expect(newAccordion).toBeVisible();
      const save = await within(modal).findByRole('button', {
        name: /^Enregistrer/
      });
      await user.click(save);
      expect(modal).not.toBeVisible();
      const link = await screen.findByRole('heading', {
        name: newOwner.fullName
      });
      expect(link).toBeVisible();
    });

    it('should add an owner who is present in the database', async () => {
      const newOwner = genOwnerDTO();
      data.owners.push(newOwner);

      renderView(housing);

      const modifyOwners = await screen.findByRole('button', {
        name: /^Modifier/,
        description: 'Modifier le propriétaire'
      });
      await user.click(modifyOwners);
      const modal = await screen.findByRole('dialog');
      const addOwner = await within(modal).findByRole('button', {
        name: /^Ajouter un propriétaire/
      });
      await user.click(addOwner);
      const rank = await within(modal).findByLabelText(
        /^Sélectionner les droits de propriétés/
      );
      await user.selectOptions(rank, String(housingOwners.length + 1));
      const search = await within(modal).findByRole('searchbox');
      await user.type(search, newOwner.fullName + '{Enter}');
      await within(modal).findByText(/^Un propriétaire trouvé/);
      const cell = await within(modal).findByRole('cell');
      const add = await within(cell).findByRole('button', {
        name: /^Ajouter/
      });
      await user.click(add);
      const newAccordion = await within(modal).findByRole('button', {
        name: new RegExp(`^${newOwner.fullName}`)
      });
      expect(newAccordion).toBeVisible();
      const save = await within(modal).findByRole('button', {
        name: /^Enregistrer/
      });
      await user.click(save);
      expect(modal).not.toBeVisible();
      const link = await screen.findByRole('heading', {
        name: newOwner.fullName
      });
      expect(link).toBeVisible();
    });
  });

  describe('Update the housing', () => {
    it('should update the occupancy', async () => {
      renderView(housing);

      const update = await screen.findByRole('button', {
        name: /Mettre à jour/,
        description: 'Mettre à jour le logement'
      });
      await user.click(update);
      const panel = await screen.findByRole('tabpanel', {
        name: 'Occupation'
      });
      const occupancy = await within(panel).findByLabelText(
        'Occupation actuelle'
      );
      await user.click(occupancy);
      const options = await screen.findByRole('listbox');
      const option = await within(options).findByRole('option', {
        name: 'En location'
      });
      await user.click(option);
      const save = await screen.findByRole('button', {
        name: 'Enregistrer'
      });
      await user.click(save);
      const newOccupancy = await screen.findByLabelText('Occupation');
      expect(newOccupancy).toHaveTextContent(/En location/i);
    });

    it('should update the status', async () => {
      renderView(housing);

      const [update] = await screen.findAllByRole('button', {
        name: /Mettre à jour/
      });
      await user.click(update);
      const mobilizationTab = await screen.findByRole('tab', {
        name: 'Mobilisation'
      });
      await user.click(mobilizationTab);
      const mobilizationPanel = await screen.findByRole('tabpanel', {
        name: 'Mobilisation'
      });
      const status =
        await within(mobilizationPanel).findByLabelText(/Statut de suivi/);
      await user.click(status);
      const options = await screen.findByRole('listbox');
      const statusOption = await within(options).findByText(/Premier contact/i);
      await user.click(statusOption);
      const subStatus =
        await within(mobilizationPanel).findByLabelText(/Sous-statut/);
      await user.click(subStatus);
      const subStatusOption = await screen.findByRole('option', {
        name: 'En pré-accompagnement'
      });
      await user.click(subStatusOption);
      const save = await screen.findByRole('button', {
        name: 'Enregistrer'
      });
      await user.click(save);
      const mobilization = await screen.findByLabelText('Statut de suivi');
      expect(mobilization).toBeVisible();
    });

    it('should create a note', async () => {
      renderView(housing);

      const [update] = await screen.findAllByRole('button', {
        name: /Mettre à jour/
      });
      await user.click(update);
      const noteTab = await screen.findByRole('tab', {
        name: 'Note'
      });
      await user.click(noteTab);
      const notePanel = await screen.findByRole('tabpanel', {
        name: 'Note'
      });
      const textbox = await within(notePanel).findByLabelText('Nouvelle note');
      await user.type(textbox, faker.lorem.paragraph());
      const save = await screen.findByRole('button', {
        name: 'Enregistrer'
      });
      await user.click(save);
      const history = await screen.findByRole('tab', {
        name: 'Historique et notes'
      });
      await user.click(history);
      const panel = await screen.findByRole('tabpanel', {
        name: 'Historique et notes'
      });
      const note = await within(panel).findByText('Note');
      expect(note).toBeVisible();
    });
  });
});
