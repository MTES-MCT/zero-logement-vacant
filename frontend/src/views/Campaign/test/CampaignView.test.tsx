import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { Link, Route, MemoryRouter as Router } from 'react-router-dom';

import {
  genAddress,
  genCampaign,
  genDraft,
  genHousing,
  genOwner,
  genPaginatedResult,
  genSender,
} from '../../../../test/fixtures.test';
import configureTestStore from '../../../utils/test/storeUtils';
import { AppStore } from '../../../store/store';
import { mockRequests } from '../../../utils/test/requestUtils';
import CampaignView from '../CampaignView';
import { Draft } from '../../../models/Draft';
import Notification from '../../../components/Notification/Notification';
import { Campaign } from '../../../models/Campaign';
import { Housing } from '../../../models/Housing';
import { HousingPaginatedResult } from '../../../models/PaginatedResult';
import { Owner } from '../../../models/Owner';

describe('Campaign view', () => {
  const user = userEvent.setup();

  const campaign = genCampaign();
  const sender = genSender();
  const draft = genDraft(sender);
  const houses = Array.from({ length: 1 }, () => genHousing());

  let store: AppStore;

  beforeEach(() => {
    store = configureTestStore();
  });

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

    render(
      <Provider store={store}>
        <Notification />
        <Router initialEntries={[`/campagnes/${campaign.id}`]}>
          <Link to="/campagnes">Campagnes</Link>
          <Route path="/campagnes/:id" component={CampaignView} />
        </Router>
      </Provider>,
    );

    const page = await screen.findByText('Page non trouvée');
    expect(page).toBeVisible();
  });

  function renderComponent(): void {
    render(
      <Provider store={store}>
        <Notification />
        <Router initialEntries={[`/campagnes/${campaign.id}`]}>
          <Link to="/campagnes">Campagnes</Link>
          <Route path="/campagnes/:id" component={CampaignView} />
        </Router>
      </Provider>,
    );
  }

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
          body: JSON.stringify([]),
        },
      },
      {
        pathname: '/api/housing',
        method: 'POST',
        persist: true,
        response: {
          body: JSON.stringify(genPaginatedResult([])),
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
          body: JSON.stringify([]),
        },
      },
      {
        pathname: '/api/housing',
        method: 'POST',
        response: {
          body: JSON.stringify({
            entities: houses,
            loading: false,
            page: 1,
            perPage: 50,
          } as HousingPaginatedResult),
        },
        persist: true,
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
    await screen.findByRole('heading', { name: title });
  });

  it('should save the draft if at least one field is filled', async () => {
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
      {
        pathname: '/api/housing',
        method: 'POST',
        response: {
          body: JSON.stringify({
            entities: houses,
            loading: false,
            page: 1,
            perPage: 50,
          } as HousingPaginatedResult),
        },
        persist: true,
      },
      {
        pathname: `/api/drafts`,
        method: 'POST',
        response: {
          body: JSON.stringify(draft),
          status: 201,
        },
      },
      {
        pathname: `/api/drafts?campaign=${campaign.id}`,
        response: {
          body: JSON.stringify([draft]),
        },
      },
    ]);

    renderComponent();

    const form = await screen.findByRole('form');
    const name = await within(form).findByLabelText(
      'Nom de la collectivité ou de l’administration*',
    );
    if (sender.name) {
      await user.type(name, sender.name);
    }
    const save = await screen.findByRole('button', { name: /^Sauvegarder/ });
    await user.click(save);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/^Sauvegarde.../);
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
        pathname: '/api/housing',
        method: 'POST',
        response: {
          body: JSON.stringify({
            entities: houses,
            loading: false,
            page: 1,
            perPage: 50,
          } as HousingPaginatedResult),
        },
        persist: true,
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
    if (sender.name) {
      const name = await within(form).findByLabelText(
        'Nom de la collectivité ou de l’administration*',
      );
      await user.clear(name);
      await user.type(name, sender.name);
    }
    if (sender.service) {
      const service = await within(form).findByLabelText('Service*');
      await user.clear(service);
      await user.type(service, sender.service);
    }
    if (sender.lastName) {
      const lastName = await within(form).findByLabelText('Nom*');
      await user.clear(lastName);
      await user.type(lastName, sender.lastName);
    }
    if (sender.firstName) {
      const firstName = await within(form).findByLabelText('Prénom*');
      await user.clear(firstName);
      await user.type(firstName, sender.firstName);
    }
    if (sender.address) {
      const address = await within(form).findByLabelText('Adresse*');
      await user.clear(address);
      await user.type(address, sender.address);
    }
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
    if (draft.writtenAt) {
      const writtenAt = await within(form).findByLabelText(/^En date du/);
      await user.clear(writtenAt);
      await user.type(writtenAt, draft.writtenAt);
    }
    if (draft.writtenFrom) {
      const writtenFrom = await within(form).findByLabelText(/^Écrit à/);
      await user.clear(writtenFrom);
      await user.type(writtenFrom, draft.writtenFrom);
    }
    if (draft.subject) {
      const subject = await within(form).findByRole('textbox', {
        name: /^Objet/,
      });
      await user.clear(subject);
      await user.type(subject, draft.subject);
    }
    if (draft.body) {
      const body = await within(form).findByRole('textbox', {
        name: /^Contenu/,
      });
      await user.clear(body);
      await user.type(body, draft.body);
    }

    // Save the draft
    const save = await screen.findByRole('button', { name: /^Sauvegarder/ });
    await user.click(save);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/^Sauvegarde.../);
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

  it('should edit a recipient’s address', async () => {
    const housing: Housing = { ...genHousing(), owner: genOwner() };
    const updated: Owner = {
      ...housing.owner,
      fullName: 'John Doe',
      banAddress: genAddress(),
      additionalAddress: genAddress().city,
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
        pathname: '/api/housing',
        method: 'POST',
        response: {
          body: JSON.stringify({
            entities: [housing],
            loading: false,
            page: 1,
            perPage: 50,
          } as HousingPaginatedResult),
        },
      },
      {
        pathname: `/api/owners/${housing.owner.id}`,
        method: 'PUT',
        response: {
          body: JSON.stringify(updated),
        },
      },
      {
        pathname: '/api/housing',
        method: 'POST',
        response: {
          body: JSON.stringify({
            entities: [{ ...housing, owner: updated }],
            loading: false,
            page: 1,
            perPage: 50,
          } as HousingPaginatedResult),
        },
      },
    ]);

    renderComponent();

    const tab = await screen.findByRole('tab', { name: /^Destinataires/ });
    await user.click(tab);
    const [edit] = await screen.findAllByRole('button', {
      name: /^Éditer l’adresse/,
    });
    await user.click(edit);
    const aside = await screen.findByRole('complementary');
    const fullName = await within(aside).findByLabelText('Nom prénom');
    await user.clear(fullName);
    await user.type(fullName, 'John Doe');
    const save = await within(aside).findByRole('button', {
      name: /^Enregistrer/,
    });
    await user.click(save);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/^Sauvegardé !/);
  });

  // Hard to mock window.confirm because it's a browser-level function
  it.todo(
    'should warn the user before leaving the page if they have unsaved changes',
  );
});
