import { faker } from '@faker-js/faker/locale/fr';
import { render, screen } from '@testing-library/react';
import {
  INACTIVE_OWNER_RANKS,
  type HousingDTO,
  type HousingOwnerDTO,
  type OwnerDTO
} from '@zerologementvacant/models';
import {
  genHousingDTO,
  genHousingOwnerDTO,
  genOwnerDTO
} from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import data from '~/mocks/handlers/data';
import configureTestStore from '~/utils/test/storeUtils';
import HousingOwnersView from '~/views/Housing/HousingOwnersView';

describe('HousingOwnersView', () => {
  interface RenderViewOptions {
    housing: HousingDTO;
    owners: ReadonlyArray<OwnerDTO>;
    housingOwners: ReadonlyArray<HousingOwnerDTO>;
  }

  function renderView(options: RenderViewOptions) {
    data.housings.push(options.housing);
    data.owners.push(...options.owners);
    data.housingOwners.set(options.housing.id, options.housingOwners);

    const store = configureTestStore();
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
});
