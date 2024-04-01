import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory, History } from 'history';
import { Provider } from 'react-redux';
import { Link, Route, Router } from 'react-router-dom';

import {
  genCampaign,
  genDraft,
  genSender,
} from '../../../../test/fixtures.test';
import configureTestStore from '../../../utils/test/storeUtils';
import { AppStore } from '../../../store/store';
import { mockRequests } from '../../../utils/test/requestUtils';
import CampaignView from '../CampaignView';
import { Draft } from '../../../models/Draft';
import Notification from '../../../components/Notification/Notification';
import { Campaign } from '../../../models/Campaign';

describe('Campaign view', () => {
  const user = userEvent.setup();

  const campaign = genCampaign();
  const sender = genSender();
  const draft = genDraft(sender);

  let store: AppStore;
  let router: History;

  beforeEach(() => {
    store = configureTestStore();
    router = createMemoryHistory({
      initialEntries: [`/campagnes/${campaign.id}`],
    });
  });

  function renderComponent(): void {
    render(
      <Provider store={store}>
        <Notification />
        <Router history={router}>
          <Link to="/campagnes">Campagnes</Link>
          <Route path="/campagnes/:id" component={CampaignView} />
        </Router>
      </Provider>
    );
  }

  it('should display "Page non trouvée" if the campaign does not exist', async () => {
    mockRequests([
      {
        pathname: `/api/campaigns/${campaign.id}`,
        response: {
          status: 404,
          body: JSON.stringify({
            name: 'CampaignMissingError',
            message: `Campaign ${campaign.id} missing`,
          }),
        },
      },
      {
        pathname: `/api/drafts?campaign=${campaign.id}`,
        response: {
          body: JSON.stringify([]),
        },
      },
      {
        pathname: '/api/housing/count',
        method: 'POST',
        response: {
          body: JSON.stringify({
            housing: 1,
            owners: 1,
          }),
        },
      },
    ]);

    renderComponent();

    await screen.findByText('Page non trouvée');
  });

  it('should render', async () => {
    mockRequests([
      {
        pathname: `/api/campaigns/${campaign.id}`,
        response: {
          body: JSON.stringify(campaign),
        },
      },
      {
        pathname: `/api/drafts?campaign=${campaign.id}`,
        response: {
          body: JSON.stringify([draft]),
        },
      },
      {
        pathname: '/api/housing/count',
        method: 'POST',
        response: {
          body: JSON.stringify({
            housing: 1,
            owners: 1,
          }),
        },
      },
    ]);

    renderComponent();

    const title = await screen.findByRole('heading', { name: campaign.title });
    expect(title).toBeVisible();
  });

  it('should rename the campaign', async () => {
    const title = 'New title';
    mockRequests([
      {
        pathname: `/api/campaigns/${campaign.id}`,
        method: 'GET',
        response: {
          body: JSON.stringify(campaign),
        },
      },
      {
        pathname: `/api/drafts?campaign=${campaign.id}`,
        response: {
          body: JSON.stringify([draft]),
        },
      },
      {
        pathname: '/api/housing/count',
        method: 'POST',
        response: {
          body: JSON.stringify({
            housing: 1,
            owners: 1,
          }),
        },
      },
      {
        pathname: `/api/campaigns/${campaign.id}`,
        method: 'PUT',
        response: async (request) => {
          const payload = await request.json();
          return {
            body: JSON.stringify({ ...campaign, title: payload.title }),
          };
        },
      },
      {
        pathname: `/api/campaigns/${campaign.id}`,
        response: {
          body: JSON.stringify({ ...campaign, title }),
        },
      },
    ]);

    renderComponent();

    const rename = await screen.findByRole('button', { name: /^Renommer/ });
    await user.click(rename);
    const modal = await screen.findByRole('dialog');
    const input = within(modal).getByRole('textbox', {
      name: /^Nom de la campagne/,
    });
    await user.clear(input);
    await user.type(input, title);
    const save = await within(modal).findByRole('button', {
      name: /^Confirmer/,
    });
    await user.click(save);
    expect(modal).not.toBeVisible();
  });

  it('should update the draft on button click', async () => {
    const updated: Draft = {
      ...draft,
      subject: 'New subject',
      body: 'New body',
      sender,
    };
    mockRequests([
      {
        pathname: `/api/campaigns/${campaign.id}`,
        response: {
          body: JSON.stringify(campaign),
        },
      },
      {
        pathname: `/api/drafts?campaign=${campaign.id}`,
        response: {
          body: JSON.stringify([draft]),
        },
      },
      {
        pathname: '/api/housing/count',
        method: 'POST',
        response: {
          body: JSON.stringify({
            housing: 1,
            owners: 1,
          }),
        },
      },
      {
        pathname: `/api/drafts/${draft.id}`,
        method: 'PUT',
        response: {
          body: JSON.stringify(updated),
        },
      },
      {
        pathname: `/api/drafts?campaign=${campaign.id}`,
        response: {
          body: JSON.stringify([updated]),
        },
      },
    ]);

    renderComponent();

    // Fill the form
    const form = await screen.findByRole('form');
    const name = await within(form).findByLabelText(
      'Nom de la collectivité ou de l’administration*'
    );
    await user.clear(name);
    await user.type(name, sender.name);
    const service = await within(form).findByLabelText('Service*');
    await user.clear(service);
    await user.type(service, sender.service);
    const lastName = await within(form).findByLabelText('Nom*');
    await user.clear(lastName);
    await user.type(lastName, sender.lastName);
    const firstName = await within(form).findByLabelText('Prénom*');
    await user.clear(firstName);
    await user.type(firstName, sender.firstName);
    const address = await within(form).findByLabelText('Adresse*');
    await user.clear(address);
    await user.type(address, sender.address);
    if (sender.email) {
      const email = await within(form).findByLabelText('Adresse courriel');
      await user.clear(email);
      await user.type(email, sender.email);
    }
    if (sender.phone) {
      const phone = await within(form).findByLabelText('Téléphone');
      await user.clear(phone);
      await user.type(phone, sender.phone);
    }
    const writtenAt = await within(form).findByLabelText(/^En date du/);
    await user.clear(writtenAt);
    await user.type(writtenAt, draft.writtenAt);
    const writtenFrom = await within(form).findByLabelText(/^Écrit à/);
    await user.clear(writtenFrom);
    await user.type(writtenFrom, draft.writtenFrom);
    const subject = await within(form).findByRole('textbox', {
      name: /^Objet/,
    });
    await user.clear(subject);
    await user.type(subject, draft.subject);
    const body = await within(form).findByRole('textbox', {
      name: /^Contenu/,
    });
    await user.clear(body);
    await user.type(body, draft.body);

    // Save the draft
    const save = await screen.findByRole('button', { name: /^Sauvegarder/ });
    await user.click(save);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/^Sauvegardé !/);
  });

  it('should validate the campaign', async () => {
    const sending: Campaign = { ...campaign, status: 'sending' };
    mockRequests([
      {
        pathname: `/api/campaigns/${campaign.id}`,
        response: {
          body: JSON.stringify(campaign),
        },
      },
      {
        pathname: `/api/drafts?campaign=${campaign.id}`,
        response: {
          body: JSON.stringify([{ ...draft, sender }]),
        },
      },
      {
        pathname: '/api/housing/count',
        method: 'POST',
        response: {
          body: JSON.stringify({
            housing: 1,
            owners: 1,
          }),
        },
      },
      {
        pathname: `/api/campaigns/${campaign.id}`,
        method: 'PUT',
        response: {
          body: JSON.stringify(sending),
        },
      },
      {
        pathname: `/api/campaigns/${campaign.id}`,
        response: {
          body: JSON.stringify([sending]),
        },
      },
    ]);

    renderComponent();

    const send = await screen.findByRole('button', {
      name: /^Débuter l’envoi/,
    });
    await user.click(send);
    const dialog = await screen.findByRole('dialog');
    const confirm = await within(dialog).findByRole('button', {
      name: /^Confirmer/,
    });
    await user.click(confirm);
    expect(dialog).not.toBeVisible();
  });

  // Hard to mock window.confirm because it's a browser-level function
  it.todo(
    'should warn the user before leaving the page if they have unsaved changes'
  );
});
