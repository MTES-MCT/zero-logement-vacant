import { faker } from '@faker-js/faker/locale/fr';
import { render, screen } from '@testing-library/react';
import { UserRole } from '@zerologementvacant/models';
import {
  genEstablishmentDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';

import { useFindCampaignDocumentsQuery } from '~/services/document.service';
import { MockAuthProvider } from '~/test/auth';
import configureTestStore from '~/utils/storeUtils';

function CampaignDocumentsStatusProbe(props: { campaignId: string }) {
  const { error } = useFindCampaignDocumentsQuery(props.campaignId);

  if (!error) {
    return null;
  }

  const status = 'status' in error ? error.status : 'unknown';
  return <span data-testid="status">{status}</span>;
}

describe('useFindCampaignDocumentsQuery', () => {
  it('returns a 404 error for a campaign that does not exist', async () => {
    const establishment = genEstablishmentDTO();
    const auth = genUserDTO(UserRole.USUAL, establishment);
    const store = configureTestStore();
    const campaignId = faker.string.uuid();

    render(
      <Provider store={store}>
        <MockAuthProvider options={{ user: auth, establishment }}>
          <CampaignDocumentsStatusProbe campaignId={campaignId} />
        </MockAuthProvider>
      </Provider>
    );

    expect(await screen.findByTestId('status')).toHaveTextContent('404');
  });
});
