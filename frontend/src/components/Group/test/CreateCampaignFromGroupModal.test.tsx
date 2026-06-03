import { faker } from '@faker-js/faker/locale/fr';
import { render, screen } from '@testing-library/react';
import { UserRole } from '@zerologementvacant/models';
import { genUserDTO } from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';

import { createCampaignFromGroupModal } from '~/components/Group/CreateCampaignFromGroupModal';
import type { Group } from '~/models/Group';
import { fromUserDTO } from '~/models/User';
import configureTestStore from '~/utils/storeUtils';

function genGroup(): Group {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.words(3),
    description: faker.lorem.paragraph(),
    housingCount: faker.number.int({ min: 1, max: 100 }),
    ownerCount: faker.number.int({ min: 1, max: 50 }),
    createdAt: faker.date.past(),
    createdBy: fromUserDTO({ ...genUserDTO(), role: UserRole.USUAL }),
    archivedAt: null
  };
}

describe('CreateCampaignFromGroupModal', () => {
  it('should warn that do-not-contact owners are excluded from the campaign', () => {
    const modal = createCampaignFromGroupModal({ isOpenedByDefault: true });
    const store = configureTestStore({ withAuth: true });

    render(
      <Provider store={store}>
        <modal.Component group={genGroup()} onSubmit={() => undefined} />
      </Provider>
    );

    const alert = screen.getByText(
      /ne seront pas inclus comme destinataires de cette campagne/i
    );
    expect(alert).toBeInTheDocument();
  });
});
