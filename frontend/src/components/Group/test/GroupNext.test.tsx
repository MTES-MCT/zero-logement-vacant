import { render, screen } from '@testing-library/react';
import { UserRole } from '@zerologementvacant/models';
import {
  genEstablishmentDTO,
  genGroupDTO,
  genHousingDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';

import GroupNext from '~/components/Group/GroupNext';
import { fromGroupDTO } from '~/models/Group';
import { MockAuthProvider } from '~/test/auth';
import configureTestStore from '~/utils/storeUtils';

describe('GroupNext', () => {
  const establishment = genEstablishmentDTO();
  const creator = genUserDTO(UserRole.USUAL, establishment);
  const group = fromGroupDTO(genGroupDTO(creator, [genHousingDTO()]));

  function renderGroup(role: UserRole) {
    const authDTO = genUserDTO(role, establishment);
    const store = configureTestStore();

    render(
      <Provider store={store}>
        <MockAuthProvider options={{ user: authDTO, establishment }}>
          <GroupNext
            group={group}
            onCreateCampaign={vi.fn()}
            onExport={vi.fn()}
            onUpdate={vi.fn()}
            onRemove={vi.fn()}
          />
        </MockAuthProvider>
      </Provider>
    );
  }

  it('should hide the "Créer une campagne" button for a visitor', () => {
    renderGroup(UserRole.VISITOR);

    expect(
      screen.queryByRole('button', { name: 'Créer une campagne' })
    ).not.toBeInTheDocument();
  });

  it('should show the "Créer une campagne" button for a usual user', async () => {
    renderGroup(UserRole.USUAL);

    expect(
      await screen.findByRole('button', { name: 'Créer une campagne' })
    ).toBeInTheDocument();
  });

  it('should show the "Créer une campagne" button for an admin', async () => {
    renderGroup(UserRole.ADMIN);

    expect(
      await screen.findByRole('button', { name: 'Créer une campagne' })
    ).toBeInTheDocument();
  });
});
