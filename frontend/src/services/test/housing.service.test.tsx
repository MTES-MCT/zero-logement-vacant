import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HousingStatus, UserRole } from '@zerologementvacant/models';
import {
  genEstablishmentDTO,
  genHousingDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';

import data from '~/mocks/handlers/data';
import {
  useHousingPoints,
  useUpdateHousingMutation
} from '~/services/housing.service';
import { MockAuthProvider } from '~/test/auth';
import configureTestStore from '~/utils/storeUtils';

function MapProbe(props: { housingId: string }) {
  const { data: points } = useHousingPoints({
    filters: { statusList: [HousingStatus.WAITING] },
    fields: ['id', 'status']
  });
  const [updateHousing] = useUpdateHousingMutation();
  const isInList = points?.some((point) => point.id === props.housingId);

  return (
    <div>
      <span data-testid="in-list">{isInList ? 'yes' : 'no'}</span>
      <button
        onClick={() =>
          updateHousing({
            id: props.housingId,
            status: HousingStatus.WAITING,
            subStatus: null,
            occupancy: data.housings.find((h) => h.id === props.housingId)!
              .occupancy,
            occupancyIntended: null,
            actualEnergyConsumption: null
          })
        }
      >
        Marquer en attente
      </button>
    </div>
  );
}

describe('useHousingPoints cache invalidation', () => {
  it('refetches the map projection after the housing is updated to match its filter', async () => {
    const establishment = genEstablishmentDTO();
    const auth = genUserDTO(UserRole.USUAL, establishment);
    const housing = {
      ...genHousingDTO(establishment.geoCodes[0]),
      status: HousingStatus.NEVER_CONTACTED
    };
    data.housings.push(housing);
    const store = configureTestStore();
    const user = userEvent.setup();

    render(
      <Provider store={store}>
        <MockAuthProvider options={{ user: auth, establishment }}>
          <MapProbe housingId={housing.id} />
        </MockAuthProvider>
      </Provider>
    );

    expect(await screen.findByTestId('in-list')).toHaveTextContent('no');

    await user.click(
      screen.getByRole('button', { name: 'Marquer en attente' })
    );

    await waitFor(async () => {
      expect(screen.getByTestId('in-list')).toHaveTextContent('yes');
    });
  });
});
