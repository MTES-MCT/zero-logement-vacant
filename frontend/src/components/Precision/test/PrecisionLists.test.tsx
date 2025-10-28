import { render, screen } from '@testing-library/react';
import type { HousingDTO, HousingOwnerDTO } from '@zerologementvacant/models';
import {
  genHousingDTO,
  genHousingOwnerDTO,
  genOwnerDTO
} from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';

import data from '../../../mocks/handlers/data';
import configureTestStore from '../../../utils/storeUtils';
import PrecisionLists from '../PrecisionLists';

describe('PrecisionLists', () => {
  function renderComponent(housing: HousingDTO): void {
    const store = configureTestStore();
    render(
      <Provider store={store}>
        <PrecisionLists housingId={housing.id} />
      </Provider>
    );
  }

  it('should display fallback texts if there is no precision', async () => {
    const owner = genOwnerDTO();
    const housing = genHousingDTO(owner);
    const housingOwner: HousingOwnerDTO = {
      ...genHousingOwnerDTO(owner),
      rank: 1
    };
    data.housings.push(housing);
    data.owners.push(owner);
    data.housingOwners.set(housing.id, [housingOwner]);

    renderComponent(housing);

    const mechanism = await screen.findByText('Aucun dispositif');
    expect(mechanism).toBeVisible();
    const blockingPoint = await screen.findByText('Aucun point de blocage');
    expect(blockingPoint).toBeVisible();
    const evolution = await screen.findByText('Aucune évolution');
    expect(evolution).toBeVisible();
  });
});
