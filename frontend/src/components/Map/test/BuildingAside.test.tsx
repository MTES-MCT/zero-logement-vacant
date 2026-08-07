import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  getOwnerDisplayName,
  UserRole,
  type OwnerRank
} from '@zerologementvacant/models';
import {
  genEstablishmentDTO,
  genHousingDTO,
  genHousingOwnerDTO,
  genOwnerDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { delay, http, HttpResponse } from 'msw';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import BuildingAside from '~/components/Map/BuildingAside';
import data from '~/mocks/handlers/data';
import { mockAPI } from '~/mocks/mock-api';
import type { Building } from '~/models/Building';
import { MockAuthProvider } from '~/test/auth';
import config from '~/utils/config';
import configureTestStore from '~/utils/storeUtils';

describe('BuildingAside', () => {
  it('should not leak the previous housing’s owner while the next one loads', async () => {
    const establishment = genEstablishmentDTO();
    const auth = genUserDTO(UserRole.USUAL, establishment);
    const rawAddress = ['12 RUE DE LA PAIX', '75001 PARIS'];
    const housingA = {
      ...genHousingDTO(establishment.geoCodes[0]),
      rawAddress,
      latitude: 48.8566,
      longitude: 2.3522
    };
    const housingB = {
      ...genHousingDTO(establishment.geoCodes[0]),
      rawAddress,
      latitude: 48.8566,
      longitude: 2.3522
    };
    const ownerA = genOwnerDTO();
    data.housings.push(housingA, housingB);
    data.owners.push(ownerA);
    data.housingOwners.set(housingA.id, [
      { ...genHousingOwnerDTO(ownerA), rank: 1 as OwnerRank }
    ]);

    mockAPI.use(
      http.get(`${config.apiEndpoint}/housing/:id`, async ({ params }) => {
        const isHousingB = params.id === housingB.id;
        if (isHousingB) {
          await delay(80);
        }
        const housing = isHousingB ? housingB : housingA;
        return HttpResponse.json({
          ...housing,
          owner: isHousingB ? null : ownerA
        });
      })
    );

    const building: Building = {
      id: rawAddress.join(', '),
      latitude: housingA.latitude,
      longitude: housingA.longitude,
      rawAddress,
      housingCount: 2,
      housingList: [
        { ...housingA, order: '#1' },
        { ...housingB, order: '#2' }
      ]
    };
    const store = configureTestStore();
    const user = userEvent.setup();

    render(
      <Provider store={store}>
        <MockAuthProvider options={{ user: auth, establishment }}>
          <MemoryRouter>
            <BuildingAside building={building} open onClose={() => {}} />
          </MemoryRouter>
        </MockAuthProvider>
      </Provider>
    );

    expect(
      await screen.findByText(getOwnerDisplayName(ownerA))
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Logement suivant' }));

    expect(
      screen.queryByText(getOwnerDisplayName(ownerA))
    ).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Chargement…');

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Pas d’information');
    });
  });
});
