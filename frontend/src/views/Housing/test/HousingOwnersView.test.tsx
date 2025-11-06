import { faker } from '@faker-js/faker/locale/fr';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  INACTIVE_OWNER_RANKS,
  OWNER_KIND_LABELS,
  UserRole,
  type HousingDTO,
  type HousingOwnerDTO,
  type OwnerDTO,
  type OwnerRank
} from '@zerologementvacant/models';
import {
  genEstablishmentDTO,
  genHousingDTO,
  genHousingOwnerDTO,
  genOwnerDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import data from '~/mocks/handlers/data';
import { fromEstablishmentDTO } from '~/models/Establishment';
import { fromUserDTO } from '~/models/User';
import configureTestStore from '~/utils/storeUtils';
import HousingOwnersView from '~/views/Housing/HousingOwnersView';

describe('HousingOwnersView', () => {
  const user = userEvent.setup();
  const auth = genUserDTO(UserRole.USUAL);

  interface RenderViewOptions {
    housing: HousingDTO;
    owners: ReadonlyArray<OwnerDTO>;
    housingOwners: ReadonlyArray<HousingOwnerDTO>;
  }

  function renderView(options: RenderViewOptions) {
    data.housings.push(options.housing);
    data.owners.push(...options.owners);
    data.housingOwners.set(options.housing.id, options.housingOwners);

    const store = configureTestStore({
      auth: {
        user: fromUserDTO(auth),
        accessToken: faker.string.alphanumeric(10),
        establishment: fromEstablishmentDTO(genEstablishmentDTO())
      }
    });
    const router = createMemoryRouter(
      [
        { path: '/logements/:id/proprietaires', element: <HousingOwnersView /> }
      ],
      {
        initialEntries: [`/logements/${options.housing.id}/proprietaires`]
      }
    );

    render(
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    );
  }

  it('should display an empty state if there are no active owners', async () => {
    const housing = genHousingDTO(null);
    const owners = faker.helpers.multiple(() => genOwnerDTO());
    const housingOwners = owners.map((owner) => ({
      ...genHousingOwnerDTO(owner),
      // Only inactive owners
      rank: faker.helpers.arrayElement(INACTIVE_OWNER_RANKS)
    }));

    renderView({
      housing,
      owners,
      housingOwners
    });

    const error = await screen.findByRole('heading', {
      name: 'Il n’y a pas de propriétaire actuel connu pour ce logement'
    });
    expect(error).toBeVisible();
  });

  it('should display an empty state if there are no owners at all', async () => {
    const housing = genHousingDTO(null);
    const owners = faker.helpers.multiple(() => genOwnerDTO());
    const housingOwners: ReadonlyArray<HousingOwnerDTO> = [];

    renderView({
      housing,
      owners,
      housingOwners
    });

    const error = await screen.findByRole('heading', {
      name: 'Il n’y a pas de propriétaire connu pour ce logement'
    });
    expect(error).toBeVisible();
  });

  it('should edit a housing owner’s details', async () => {
    const housing = genHousingDTO(null);
    const owners: ReadonlyArray<OwnerDTO> = [genOwnerDTO()];
    const housingOwners: ReadonlyArray<HousingOwnerDTO> = [
      { ...genHousingOwnerDTO(owners[0]), rank: 1 }
    ];

    renderView({
      housing,
      owners,
      housingOwners
    });

    const button = await screen.findByRole('button', {
      name: `Éditer ${owners[0].fullName}`
    });
    await user.click(button);
    const name = await screen.findByRole('textbox', {
      name: /^Nom et prénom/
    });
    const newName = faker.person.fullName();
    await user.clear(name);
    await user.type(name, newName);
    const save = await screen.findByRole('button', {
      name: 'Enregistrer'
    });
    await user.click(save);
    const cell = await screen.findByRole('cell', {
      name: newName
    });
    expect(cell).toHaveTextContent(newName);
  });

  it('should change a secondary owner to primary', async () => {
    const housing = genHousingDTO(null);
    const owners: ReadonlyArray<OwnerDTO> = [genOwnerDTO(), genOwnerDTO()];
    const housingOwners: ReadonlyArray<HousingOwnerDTO> = [
      { ...genHousingOwnerDTO(owners[0]), rank: 1 },
      { ...genHousingOwnerDTO(owners[1]), rank: 2 }
    ];

    renderView({
      housing,
      owners,
      housingOwners
    });

    const button = await screen.findByRole('button', {
      name: `Éditer ${owners[1].fullName}`
    });
    await user.click(button);
    const rank = await screen.findByRole('radio', {
      name: 'Destinataire principal'
    });
    await user.click(rank);
    const save = await screen.findByRole('button', {
      name: 'Enregistrer'
    });
    await user.click(save);
    const primaryOwnerRow = await screen.findByRole('row', {
      name: new RegExp(`^${owners[1].fullName}`)
    });
    const primaryOwnerCell = await within(primaryOwnerRow).findByRole('cell', {
      name: 'Destinataire principal'
    });
    expect(primaryOwnerCell).toBeVisible();
    const secondaryOwnerRow = await screen.findByRole('row', {
      name: new RegExp(`^${owners[0].fullName}`)
    });
    const secondaryOwnerCell = await within(secondaryOwnerRow).findByRole(
      'cell',
      {
        name: 'Destinataire secondaire'
      }
    );
    expect(secondaryOwnerCell).toBeVisible();
  });

  it('should change a primary owner to secondary', async () => {
    const housing = genHousingDTO(null);
    const owners: ReadonlyArray<OwnerDTO> = [genOwnerDTO(), genOwnerDTO()];
    const housingOwners: ReadonlyArray<HousingOwnerDTO> = [
      { ...genHousingOwnerDTO(owners[0]), rank: 1 },
      { ...genHousingOwnerDTO(owners[1]), rank: 2 }
    ];

    renderView({
      housing,
      owners,
      housingOwners
    });

    const button = await screen.findByRole('button', {
      name: `Éditer ${owners[0].fullName}`
    });
    await user.click(button);
    const rank = await screen.findByRole('radio', {
      name: 'Destinataire secondaire'
    });
    await user.click(rank);
    const save = await screen.findByRole('button', {
      name: 'Enregistrer'
    });
    await user.click(save);
    const row = await screen.findByRole('row', {
      name: new RegExp(`^${owners[0].fullName}`)
    });
    const cell = await within(row).findByRole('cell', {
      name: 'Destinataire secondaire'
    });
    expect(cell).toBeVisible();
  });

  it('should change an inactive owner to primary', async () => {
    const housing = genHousingDTO(null);
    const owners: ReadonlyArray<OwnerDTO> = [genOwnerDTO(), genOwnerDTO()];
    const housingOwners: ReadonlyArray<HousingOwnerDTO> = [
      { ...genHousingOwnerDTO(owners[0]), rank: 1 },
      {
        ...genHousingOwnerDTO(owners[1]),
        rank: faker.helpers.arrayElement(INACTIVE_OWNER_RANKS)
      }
    ];

    renderView({
      housing,
      owners,
      housingOwners
    });

    const button = await screen.findByRole('button', {
      name: `Éditer ${owners[1].fullName}`
    });
    await user.click(button);
    const isActive = await screen.findByRole('checkbox', {
      name: /Actuellement propriétaire/
    });
    await user.click(isActive);
    const rank = await screen.findByRole('radio', {
      name: 'Destinataire principal'
    });
    await user.click(rank);
    const save = await screen.findByRole('button', {
      name: 'Enregistrer'
    });
    await user.click(save);
    const row = await screen.findByRole('row', {
      name: new RegExp(`^${owners[1].fullName}`)
    });
    const cell = await within(row).findByRole('cell', {
      name: 'Destinataire principal'
    });
    expect(cell).toBeVisible();
  });

  it('should change an inactive owner to secondary', async () => {
    const housing = genHousingDTO(null);
    const owners: ReadonlyArray<OwnerDTO> = [
      genOwnerDTO(),
      genOwnerDTO(),
      genOwnerDTO()
    ];
    const housingOwners: ReadonlyArray<HousingOwnerDTO> = [
      { ...genHousingOwnerDTO(owners[0]), rank: 1 },
      { ...genHousingOwnerDTO(owners[1]), rank: 2 },
      {
        ...genHousingOwnerDTO(owners[2]),
        rank: faker.helpers.arrayElement(INACTIVE_OWNER_RANKS)
      }
    ];

    renderView({
      housing,
      owners,
      housingOwners
    });

    const button = await screen.findByRole('button', {
      name: `Éditer ${owners[2].fullName}`
    });
    await user.click(button);
    const isActive = await screen.findByRole('checkbox', {
      name: /Actuellement propriétaire/
    });
    await user.click(isActive);
    const rank = await screen.findByRole('radio', {
      name: 'Destinataire secondaire'
    });
    await user.click(rank);
    const save = await screen.findByRole('button', {
      name: 'Enregistrer'
    });
    await user.click(save);
    const row = await screen.findByRole('row', {
      name: new RegExp(`^${owners[2].fullName}`)
    });
    const cell = await within(row).findByRole('cell', {
      name: 'Destinataire secondaire'
    });
    expect(cell).toBeVisible();
  });

  it('should set the primary owner as deceased', async () => {
    const housing = genHousingDTO(null);
    const owners: ReadonlyArray<OwnerDTO> = [genOwnerDTO(), genOwnerDTO()];
    const housingOwners: ReadonlyArray<HousingOwnerDTO> = [
      { ...genHousingOwnerDTO(owners[0]), rank: 1 },
      { ...genHousingOwnerDTO(owners[1]), rank: 2 }
    ];

    renderView({
      housing,
      owners,
      housingOwners
    });

    const button = await screen.findByRole('button', {
      name: `Éditer ${owners[0].fullName}`
    });
    await user.click(button);
    const isActive = await screen.findByRole('checkbox', {
      name: /Actuellement propriétaire/
    });
    await user.click(isActive);
    const inactiveRank = await screen.findByRole('combobox', {
      name: 'État du propriétaire'
    });
    await user.click(inactiveRank);
    const deceased = await screen.findByRole('option', {
      name: 'Propriétaire décédé'
    });
    await user.click(deceased);
    const save = await screen.findByRole('button', {
      name: 'Enregistrer'
    });
    await user.click(save);
    const row = await screen.findByRole('row', {
      name: new RegExp(`^${owners[0].fullName}`)
    });
    const cell = await within(row).findByRole('cell', {
      name: 'Propriétaire décédé'
    });
    expect(cell).toBeVisible();
  });

  it('should set a secondary owner as deceased', async () => {
    const housing = genHousingDTO(null);
    const owners: ReadonlyArray<OwnerDTO> = [genOwnerDTO(), genOwnerDTO()];
    const housingOwners: ReadonlyArray<HousingOwnerDTO> = [
      { ...genHousingOwnerDTO(owners[0]), rank: 1 },
      { ...genHousingOwnerDTO(owners[1]), rank: 2 }
    ];

    renderView({
      housing,
      owners,
      housingOwners
    });

    const button = await screen.findByRole('button', {
      name: `Éditer ${owners[1].fullName}`
    });
    await user.click(button);
    const isActive = await screen.findByRole('checkbox', {
      name: /Actuellement propriétaire/
    });
    await user.click(isActive);
    const inactiveRank = await screen.findByRole('combobox', {
      name: 'État du propriétaire'
    });
    await user.click(inactiveRank);
    const deceased = await screen.findByRole('option', {
      name: 'Propriétaire décédé'
    });
    await user.click(deceased);
    const save = await screen.findByRole('button', {
      name: 'Enregistrer'
    });
    await user.click(save);
    const row = await screen.findByRole('row', {
      name: new RegExp(`^${owners[1].fullName}`)
    });
    const cell = await within(row).findByRole('cell', {
      name: 'Propriétaire décédé'
    });
    expect(cell).toBeVisible();
  });

  describe('Link an owner to a housing', () => {
    it('should display a message if no owner was found', async () => {
      const housing = genHousingDTO(null);
      const owners: ReadonlyArray<OwnerDTO> = [];
      const housingOwners: ReadonlyArray<HousingOwnerDTO> = [];

      renderView({
        housing,
        owners,
        housingOwners
      });

      const add = await screen.findByRole('button', {
        name: 'Ajouter un propriétaire'
      });
      await user.click(add);
      const search = await screen.findByRole('searchbox');
      await user.type(search, 'Rousseau{Enter}');
      const error = await screen.findByText('Aucun propriétaire trouvé.');
      expect(error).toBeVisible();
    });

    it('should hide owners that are already linked to this housing', async () => {
      const housing = genHousingDTO(null);
      const owners: ReadonlyArray<OwnerDTO> = [
        { ...genOwnerDTO(), fullName: 'Jean Rousseau' },
        { ...genOwnerDTO(), fullName: 'Marie Curie' },
        { ...genOwnerDTO(), fullName: 'Victor Hugo' },
        { ...genOwnerDTO(), fullName: 'Pauline Rousseau' }
      ];
      const housingOwners: ReadonlyArray<HousingOwnerDTO> = owners
        .slice(0, 1)
        .map((owner, index) => ({
          ...genHousingOwnerDTO(owner),
          rank: (index + 1) as OwnerRank
        }));

      renderView({
        housing,
        owners,
        housingOwners
      });

      const add = await screen.findByRole('button', {
        name: 'Ajouter un propriétaire'
      });
      await user.click(add);
      const dialog = await screen.findByRole('dialog', {
        name: /Ajouter un propriétaire/
      });
      const search = await within(dialog).findByRole('searchbox');
      await user.type(search, 'Rousseau{Enter}');
      const results = await within(dialog).findAllByRole('button', {
        name: /Rousseau/
      });
      expect(results).toHaveLength(1);
    });

    it('should display differently a owner who is not an individual', async () => {
      const housing = genHousingDTO(null);
      const owners: ReadonlyArray<OwnerDTO> = [
        {
          ...genOwnerDTO(),
          fullName: 'SCI Test',
          kind: OWNER_KIND_LABELS['sci-copro']
        }
      ];
      const housingOwners: ReadonlyArray<HousingOwnerDTO> = [];

      renderView({
        housing,
        owners,
        housingOwners
      });

      const add = await screen.findByRole('button', {
        name: 'Ajouter un propriétaire'
      });
      await user.click(add);
      const dialog = await screen.findByRole('dialog', {
        name: /Ajouter un propriétaire/
      });
      const searchDialog = await within(dialog).findByRole('searchbox');
      await user.type(searchDialog, 'SCI Test{Enter}');
      const select = await within(dialog).findByRole('button', {
        name: /Sélectionner SCI Test/
      });
      await user.click(select);
      const attachDialog = await screen.findByRole('dialog', {
        name: /Ajouter un propriétaire/
      });
      const creationDate =
        await within(attachDialog).findByText('Date de création');
      expect(creationDate).toBeVisible();
      const siren = await within(attachDialog).findByText('SIREN');
      expect(siren).toBeVisible();
    });

    describe('If there is already a primary owner', () => {
      it('should add the owner as secondary to the housing ', async () => {
        const housing = genHousingDTO(null);
        const owners: ReadonlyArray<OwnerDTO> = faker.helpers.multiple(
          () => genOwnerDTO(),
          { count: 6 }
        );
        const housingOwners: ReadonlyArray<HousingOwnerDTO> = owners
          .slice(0, 2)
          .map((owner, index) => ({
            ...genHousingOwnerDTO(owner),
            rank: (index + 1) as OwnerRank
          }));

        renderView({
          housing,
          owners,
          housingOwners
        });

        const add = await screen.findByRole('button', {
          name: 'Ajouter un propriétaire'
        });
        await user.click(add);
        const searchDialog = await screen.findByRole('dialog', {
          name: /Ajouter un propriétaire/
        });
        const search = await within(searchDialog).findByRole('searchbox');
        await user.type(search, `${owners[2].fullName}{Enter}`);
        const select = await within(searchDialog).findByRole('button', {
          name: `Sélectionner ${owners[2].fullName}`
        });
        await user.click(select);
        const attachDialog = await screen.findByRole('dialog', {
          name: /Ajouter un propriétaire/
        });
        const confirm = await within(attachDialog).findByRole('button', {
          name: 'Confirmer'
        });
        await user.click(confirm);
        const row = await screen.findByRole('row', {
          name: new RegExp(`${owners[2].fullName}`)
        });
        const cell = await within(row).findByRole('cell', {
          name: /Destinataire secondaire/i
        });
        expect(cell).toBeVisible();
      });
    });

    describe('If there is no primary owner', () => {
      it('should add the owner as primary to the housing', async () => {
        const housing = genHousingDTO(null);
        const owners: ReadonlyArray<OwnerDTO> = faker.helpers.multiple(
          () => genOwnerDTO(),
          { count: 6 }
        );
        const housingOwners: ReadonlyArray<HousingOwnerDTO> = [];

        renderView({
          housing,
          owners,
          housingOwners
        });

        const add = await screen.findByRole('button', {
          name: 'Ajouter un propriétaire'
        });
        await user.click(add);
        const searchDialog = await screen.findByRole('dialog', {
          name: /Ajouter un propriétaire/
        });
        const search = await within(searchDialog).findByRole('searchbox');
        await user.type(search, `${owners[0].fullName}{Enter}`);
        const select = await within(searchDialog).findByRole('button', {
          name: `Sélectionner ${owners[0].fullName}`
        });
        await user.click(select);
        const attachDialog = await screen.findByRole('dialog', {
          name: /Ajouter un propriétaire/
        });
        const confirm = await within(attachDialog).findByRole('button', {
          name: 'Confirmer'
        });
        await user.click(confirm);
        const row = await screen.findByRole('row', {
          name: new RegExp(`${owners[0].fullName}`)
        });
        const cell = await within(row).findByRole('cell', {
          name: /Destinataire principal/i
        });
        expect(cell).toBeVisible();
      });
    });
  });
});
