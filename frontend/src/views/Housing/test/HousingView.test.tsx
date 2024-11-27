import { faker } from '@faker-js/faker';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import {
  HousingDTO,
  HousingOwnerDTO,
  OwnerDTO
} from '@zerologementvacant/models';
import {
  genHousingDTO,
  genHousingOwnerDTO,
  genOwnerDTO
} from '@zerologementvacant/models/fixtures';
import configureTestStore from '../../../utils/test/storeUtils';
import HousingView from '../HousingView';
import data from '../../../mocks/handlers/data';

describe('Housing view', () => {
  const user = userEvent.setup();

  let owner: OwnerDTO;
  let housing: HousingDTO;
  let housingOwners: HousingOwnerDTO[];

  beforeEach(() => {
    owner = genOwnerDTO();
    const secondaryOwners = Array.from({ length: 3 }, genOwnerDTO);
    data.owners.push(owner, ...secondaryOwners);
    housing = genHousingDTO(owner);
    data.housings.push(housing);
    housingOwners = [owner, ...secondaryOwners].map((owner, i) => ({
      ...genHousingOwnerDTO(owner),
      rank: i + 1
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

  it('should display the main owner', async () => {
    renderView(housing);

    const name = await screen.findByRole('heading', {
      name: owner.fullName
    });
    expect(name).toBeVisible();
  });

  describe('Update owner details', () => {
    it('should update their name', async () => {
      renderView(housing);

      const modifyOwners = await screen.findByRole('button', {
        name: /^Modifier/
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
      const name = await screen.findByRole('heading', {
        name: newName
      });
      expect(name).toBeVisible();
    });
  });

  describe('Add owner', () => {
    it('should add an owner who is missing from the database', async () => {
      renderView(housing);

      const newOwner = genOwnerDTO();
      const modifyOwners = await screen.findByRole('button', {
        name: /^Modifier/
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
      await user.type(address, newOwner.rawAddress.join(' '));
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
        name: /^Modifier/
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
});
