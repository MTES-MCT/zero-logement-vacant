import { render, screen } from '@testing-library/react';
import { UserRole } from '@zerologementvacant/models';
import {
  genDocumentDTO,
  genEstablishmentDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';

import data from '~/mocks/handlers/data';
import { MockAuthProvider } from '~/test/auth';
import { factories } from '~/test/factories';
import configureTestStore from '~/utils/storeUtils';

import CampaignDocumentsTab from '../CampaignDocumentsTab';

describe('CampaignDocumentsTab', () => {
  function renderTab(role: UserRole) {
    const establishment = genEstablishmentDTO();
    const auth = genUserDTO(role, establishment);
    const campaign = factories
      .campaign(establishment)
      .build({}, { associations: { createdBy: auth } });
    data.campaigns.push(campaign);
    data.users.push(auth);
    data.establishments.push(establishment);
    const store = configureTestStore();

    render(
      <Provider store={store}>
        <MockAuthProvider options={{ user: auth, establishment }}>
          <CampaignDocumentsTab campaign={campaign} />
        </MockAuthProvider>
      </Provider>
    );

    return { campaign, establishment, auth };
  }

  it('shows an empty state message when there are no documents', async () => {
    renderTab(UserRole.USUAL);

    expect(
      await screen.findByText(
        /Il n’y a pas de document associé à cette campagne/i
      )
    ).toBeInTheDocument();
  });

  it('displays existing documents', async () => {
    const establishment = genEstablishmentDTO();
    const auth = genUserDTO(UserRole.USUAL, establishment);
    const campaign = factories
      .campaign(establishment)
      .build({}, { associations: { createdBy: auth } });
    const document = genDocumentDTO(auth, establishment);
    data.campaigns.push(campaign);
    data.documents.set(document.id, document);
    data.campaignDocuments.set(campaign.id, [document]);
    data.users.push(auth);
    data.establishments.push(establishment);
    const store = configureTestStore();

    render(
      <Provider store={store}>
        <MockAuthProvider options={{ user: auth, establishment }}>
          <CampaignDocumentsTab campaign={campaign} />
        </MockAuthProvider>
      </Provider>
    );

    expect(
      await screen.findByText(new RegExp(document.filename, 'i'))
    ).toBeInTheDocument();
  });

  it('shows the upload zone for a usual user', async () => {
    renderTab(UserRole.USUAL);

    expect(
      await screen.findByText(
        'Associez un ou plusieurs documents à cette campagne'
      )
    ).toBeInTheDocument();
  });

  it('hides the upload zone for a visitor', async () => {
    renderTab(UserRole.VISITOR);

    await screen.findByText(/Il n’y a pas de document associé/i);
    expect(
      screen.queryByText('Associez un ou plusieurs documents à cette campagne')
    ).not.toBeInTheDocument();
  });
});
