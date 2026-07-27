import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserRole } from '@zerologementvacant/models';
import {
  genDocumentDTO,
  genEstablishmentDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { http, HttpResponse } from 'msw';
import { Provider } from 'react-redux';

import Notification from '~/components/Notification/Notification';
import data from '~/mocks/handlers/data';
import { mockAPI } from '~/mocks/mock-api';
import { MockAuthProvider } from '~/test/auth';
import { factories } from '~/test/factories';
import config from '~/utils/config';
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

  it('renders the documents as an accessible list', async () => {
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

    await screen.findByText(new RegExp(document.filename, 'i'));

    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('shows an error alert with a retry action when loading fails', async () => {
    const establishment = genEstablishmentDTO();
    const auth = genUserDTO(UserRole.USUAL, establishment);
    const campaign = factories
      .campaign(establishment)
      .build({}, { associations: { createdBy: auth } });
    data.campaigns.push(campaign);
    data.users.push(auth);
    data.establishments.push(establishment);
    mockAPI.use(
      http.get(`${config.apiEndpoint}/campaigns/:id/documents`, () =>
        HttpResponse.json(
          { name: 'ServerError', message: 'boom' },
          { status: 500 }
        )
      )
    );
    const store = configureTestStore();

    render(
      <Provider store={store}>
        <MockAuthProvider options={{ user: auth, establishment }}>
          <CampaignDocumentsTab campaign={campaign} />
        </MockAuthProvider>
      </Provider>
    );

    expect(
      await screen.findByText(/Le chargement des documents a échoué/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Réessayer/i })
    ).toBeInTheDocument();
  });

  it('warns when a document was uploaded but could not be attached to the campaign', async () => {
    const user = userEvent.setup();
    const establishment = genEstablishmentDTO();
    const auth = genUserDTO(UserRole.USUAL, establishment);
    const campaign = factories
      .campaign(establishment)
      .build({}, { associations: { createdBy: auth } });
    data.campaigns.push(campaign);
    data.users.push(auth);
    data.establishments.push(establishment);
    data.authSession.userId = auth.id;
    data.authSession.establishmentId = establishment.id;
    mockAPI.use(
      http.post(`${config.apiEndpoint}/campaigns/:id/documents`, () =>
        HttpResponse.json(
          { name: 'ServerError', message: 'boom' },
          { status: 500 }
        )
      )
    );
    const store = configureTestStore();

    render(
      <Provider store={store}>
        <MockAuthProvider options={{ user: auth, establishment }}>
          <CampaignDocumentsTab campaign={campaign} />
          <Notification />
        </MockAuthProvider>
      </Provider>
    );

    const input = await screen.findByLabelText(
      /Associez un ou plusieurs documents/i
    );
    const file = new File(['content'], 'contrat.pdf', {
      type: 'application/pdf'
    });
    await user.upload(input, file);

    expect(
      await screen.findByText(/pas pu être associé à la campagne/i)
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
