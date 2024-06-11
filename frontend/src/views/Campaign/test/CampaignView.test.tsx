import { faker } from '@faker-js/faker';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { Link, MemoryRouter as Router, Route } from 'react-router-dom';

import configureTestStore from '../../../utils/test/storeUtils';
import { AppStore } from '../../../store/store';
import CampaignView from '../CampaignView';
import Notification from '../../../components/Notification/Notification';
import {
  CampaignDTO,
  genCampaignDTO,
  genDraftDTO,
  genHousingDTO,
  genOwnerDTO,
  genSenderDTO
} from '@zerologementvacant/models';
import data from '../../../mocks/handlers/data';
import { sources } from '../../../../test/event-source-mock';
import config from '../../../utils/config';

describe('Campaign view', () => {
  const user = userEvent.setup();

  const campaign = genCampaignDTO();
  const sender = genSenderDTO();
  const draft = genDraftDTO(sender);
  const owner = genOwnerDTO();
  const housings = Array.from({ length: 3 }, () => genHousingDTO(owner));

  let store: AppStore;

  beforeAll(() => {
    data.housings.push(...housings);
    data.campaigns.push(campaign);
    housings.forEach((housing) => {
      data.campaignHousings.set(campaign.id, housings);
      data.housingCampaigns.set(housing.id, [campaign]);
    });
    data.drafts.push(draft);
    data.campaignDrafts.set(campaign.id, [draft]);
    data.draftCampaigns.set(draft.id, campaign);
  });

  beforeEach(() => {
    store = configureTestStore();
  });

  it('should display "Page non trouvée" if the campaign does not exist', async () => {
    render(
      <Provider store={store}>
        <Notification />
        <Router initialEntries={[`/campagnes/${faker.string.uuid()}`]}>
          <Link to="/campagnes">Campagnes</Link>
          <Route path="/campagnes/:id" component={CampaignView} />
        </Router>
      </Provider>
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
      </Provider>
    );
  }

  it('should render', async () => {
    renderComponent();

    const title = await screen.findByRole('heading', { name: campaign.title });
    expect(title).toBeVisible();
  });

  it('should rename the campaign', async () => {
    const title = 'New title';

    renderComponent();

    const rename = await screen.findByRole('button', { name: /^Renommer/ });
    await user.click(rename);
    const modal = await screen.findByRole('dialog');
    const input = within(modal).getByRole('textbox', {
      name: /^Nom de la campagne/
    });
    await user.clear(input);
    await user.type(input, title);
    const save = await within(modal).findByRole('button', {
      name: /^Confirmer/
    });
    await user.click(save);
    expect(modal).not.toBeVisible();
    await screen.findByRole('heading', { name: title });
  });

  it('should save the draft if at least one field is filled', async () => {
    renderComponent();

    const form = await screen.findByRole('form');
    const name = await within(form).findByLabelText(
      'Nom de la collectivité ou de l’administration*'
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
    renderComponent();

    // Fill the form
    const form = await screen.findByRole('form');
    if (sender.name) {
      const name = await within(form).findByLabelText(
        'Nom de la collectivité ou de l’administration*'
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
        name: /^Objet/
      });
      await user.clear(subject);
      await user.type(subject, draft.subject);
    }
    if (draft.body) {
      const body = await within(form).findByRole('textbox', {
        name: /^Contenu/
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
    renderComponent();

    const send = await screen.findByRole('button', {
      name: /^Débuter l’envoi/
    });
    await user.click(send);
    const dialog = await screen.findByRole('dialog');
    const confirm = await within(dialog).findByRole('button', {
      name: /^Confirmer/
    });
    await user.click(confirm);
    expect(dialog).not.toBeVisible();
  });

  it('should edit a recipient’s address', async () => {
    renderComponent();

    const tab = await screen.findByRole('tab', { name: /^Destinataires/ });
    await user.click(tab);
    const [edit] = await screen.findAllByRole('button', {
      name: /^Éditer l’adresse/
    });
    await user.click(edit);
    const [aside] = await screen.findAllByRole('complementary');
    const fullName = await within(aside).findByLabelText('Nom prénom');
    await user.clear(fullName);
    await user.type(fullName, 'John Doe');
    const save = await within(aside).findByRole('button', {
      name: /^Enregistrer/
    });
    await user.click(save);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/^Sauvegardé !/);
  });

  it('should update the page when the campaign has been generated', async () => {
    const campaign: CampaignDTO = { ...genCampaignDTO(), status: 'sending' };
    data.campaigns.push(campaign);

    render(
      <Provider store={store}>
        <Notification />
        <Router initialEntries={[`/campagnes/${campaign.id}`]}>
          <Route path="/campagnes/:id" component={CampaignView} />
        </Router>
      </Provider>
    );

    await screen.findByRole('heading', {
      name: /^Chargement de vos courriers en cours/
    });
    campaign.file = faker.image.url();
    const event = new MessageEvent('campaign:generate', {
      data: JSON.stringify({ id: campaign.id })
    });
    sources.get(`${config.apiEndpoint}/api/sse`)?.emit(event.type, event);
    const title = await screen.findByRole('heading', {
      name: /^Télécharger les courriers et les destinataires/
    });
    expect(title).toBeVisible();
  });

  it('should confirm a recipient removal', async () => {
    renderComponent();

    const tab = await screen.findByRole('tab', { name: /^Destinataires/ });
    await user.click(tab);
    const rowsBefore = screen.getAllByRole('row').slice(1); // Remove headers
    expect(rowsBefore).toHaveLength(housings.length);
    const row = rowsBefore[rowsBefore.length - 1];
    const remove = within(row).getByTitle(/^Supprimer le propriétaire/);
    await user.click(remove);
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', {
      name: /^Confirmer/
    });
    await user.click(confirm);
    const rowsAfter = screen.getAllByRole('row').slice(1);
    expect(rowsAfter).toHaveLength(rowsBefore.length - 1);
  });

  // Hard to mock window.confirm because it's a browser-level function
  it.todo(
    'should warn the user before leaving the page if they have unsaved changes'
  );
});
