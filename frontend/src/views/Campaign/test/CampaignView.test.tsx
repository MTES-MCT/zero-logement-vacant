import { faker } from '@faker-js/faker/locale/fr';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  type CampaignDTO,
  type DraftDTO,
  type HousingDTO,
  type OwnerDTO,
  type SenderDTO
} from '@zerologementvacant/models';
import {
  genCampaignDTO,
  genDraftDTO,
  genHousingDTO,
  genOwnerDTO,
  genSenderDTO
} from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { sources } from '../../../../test/event-source-mock';
import Notification from '../../../components/Notification/Notification';

import data from '../../../mocks/handlers/data';
import config from '../../../utils/config';

import configureTestStore from '../../../utils/test/storeUtils';
import CampaignView from '../CampaignView';

interface RenderViewOptions {
  campaign: CampaignDTO;
  sender?: SenderDTO;
  draft?: DraftDTO;
  owner?: OwnerDTO;
  housings?: ReadonlyArray<HousingDTO>;
}

describe('Campaign view', () => {
  const user = userEvent.setup();

  const campaign: CampaignDTO = {
    ...genCampaignDTO(),
    status: 'draft'
  };
  const sender: SenderDTO = genSenderDTO();
  const draft: DraftDTO = genDraftDTO(sender);
  const owner = genOwnerDTO();
  const housings = faker.helpers.multiple(() => genHousingDTO(owner));

  beforeEach(() => {
    owner.banAddress = {
      street: '1 rue de la vallée',
      postalCode: '85130',
      city: 'Tiffauges',
      label: 'Home Address',
      score: 0.7
    };
  });

  function renderView(options: RenderViewOptions): void {
    data.campaigns.push(options.campaign);

    if (options.housings) {
      data.housings.push(...options.housings);
      data.campaignHousings.set(options.campaign.id, options.housings);
      options.housings.forEach((housing) => {
        const existingCampaigns = data.housingCampaigns.get(housing.id) ?? [];
        data.housingCampaigns.set(housing.id, [
          ...existingCampaigns,
          options.campaign
        ]);
      });
    }

    if (options.draft) {
      data.drafts.push(options.draft);
      data.campaignDrafts.set(options.campaign.id, [options.draft]);
      data.draftCampaigns.set(options.draft.id, options.campaign);
    }

    const store = configureTestStore();
    const router = createMemoryRouter(
      [{ path: '/campagnes/:id', element: <CampaignView /> }],
      {
        initialEntries: [`/campagnes/${options.campaign.id}`]
      }
    );
    render(
      <Provider store={store}>
        <Notification />
        <RouterProvider router={router} />
      </Provider>
    );
  }

  it('should display "Page non trouvée" if the campaign does not exist', async () => {
    const store = configureTestStore();
    const router = createMemoryRouter(
      [{ path: '/campagnes/:id', element: <CampaignView /> }],
      {
        initialEntries: [`/campagnes/${faker.string.uuid()}`]
      }
    );
    render(
      <Provider store={store}>
        <Notification />
        <RouterProvider router={router} />
      </Provider>
    );

    const page = await screen.findByText('Page non trouvée');
    expect(page).toBeVisible();
  });

  it('should render', async () => {
    renderView({ campaign, housings, draft });

    const title = await screen.findByRole('heading', { name: campaign.title });
    expect(title).toBeVisible();
  });

  it('should rename the campaign', async () => {
    const title = 'New title';

    renderView({ campaign, housings, draft });

    const rename = await screen.findByRole('button', {
      name: /^Modifier le nom/
    });
    await user.click(rename);
    const modal = await screen.findByRole('dialog');
    const input = within(modal).getByRole('textbox', {
      name: /^Titre de la campagne/
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

  it('should confirm a recipient removal', async () => {
    const index = housings.length - 1;
    const housing = housings[index];
    campaign.status = 'draft';

    renderView({ campaign, housings, draft });

    const tab = await screen.findByRole('tab', { name: /^Destinataires/ });
    await user.click(tab);
    const rowsBefore = screen.getAllByRole<HTMLTableRowElement>('row').slice(1); // Remove headers
    const remove = screen.getAllByRole('button', {
      name: /^Supprimer le destinataire/
    })[index];
    await user.click(remove);
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', {
      name: /^Confirmer/
    });
    await user.click(confirm);
    const rowsAfter = screen.getAllByRole('row').slice(1);
    expect(rowsAfter).toHaveLength(rowsBefore.length - 1);
    const row = screen.queryByRole('link', {
      name: (accessibleName) =>
        housing.rawAddress.join(' ').toLowerCase() ===
        accessibleName.toLowerCase()
    });
    expect(row).not.toBeInTheDocument();
  });

  it('should save the draft if at least one field is filled', async () => {
    campaign.status = 'draft';

    renderView({ campaign, housings, draft });

    const form = await screen.findByRole('form');
    const name = await within(form).findByLabelText(
      /^Nom de la collectivité ou de l’administration/
    );
    if (sender.name) {
      await user.type(name, sender.name);
    }
    const save = await screen.findByRole('button', { name: /^Sauvegarder/ });
    await user.click(save);
    const alert = await screen.findByRole('alert');
    expect(alert).toBeVisible();
  });

  it.skip('should update the draft on button click', async () => {
    renderView({ campaign, housings, draft });

    // Fill the form
    const form = await screen.findByRole('form');
    if (sender.name) {
      const name = await within(form).findByLabelText(
        /^Nom de la collectivité ou de l’administration/
      );
      await user.clear(name);
      await user.type(name, sender.name);
    }
    if (sender.service) {
      const service = await within(form).findByLabelText('Service');
      await user.clear(service);
      await user.type(service, sender.service);
    }
    if (sender.lastName) {
      const lastName = await within(form).findByLabelText('Nom');
      await user.clear(lastName);
      await user.type(lastName, sender.lastName);
    }
    if (sender.firstName) {
      const firstName = await within(form).findByLabelText('Prénom');
      await user.clear(firstName);
      await user.type(firstName, sender.firstName);
    }
    if (sender.address) {
      const address = await within(form).findByLabelText('Adresse');
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
    expect(alert).toBeVisible();
  });

  it('should validate the campaign', async () => {
    const campaign: CampaignDTO = {
      ...genCampaignDTO(),
      status: 'draft'
    };

    renderView({ campaign, housings, draft });

    const send = await screen.findByRole('button', {
      name: /^Valider et passer au téléchargement/
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
    const campaign: CampaignDTO = {
      ...genCampaignDTO(),
      status: 'draft'
    };

    renderView({ campaign, housings, draft });

    const tab = await screen.findByRole('tab', { name: /^Destinataires/ });
    await user.click(tab);
    const [edit] = await screen.findAllByRole('button', {
      name: /^Éditer/
    });
    await user.click(edit);
    const address = await screen.findByRole('combobox', {
      name: 'Rechercher une adresse'
    });
    await user.clear(address);
    await user.type(address, 'Rue de la vallée 85130 Tiffauges');
    const save = await screen.findByRole('button', {
      name: /^Enregistrer/
    });
    await user.click(save);
  });

  it("should dismiss the warning message when the user clicks the 'Ignore' button while editing the recipient's address", async () => {
    const campaign: CampaignDTO = {
      ...genCampaignDTO(),
      status: 'draft'
    };

    renderView({ campaign, housings, draft });
    localStorage.clear();

    const tab = await screen.findByRole('tab', { name: /^Destinataires/ });
    await user.click(tab);
    const [edit] = await screen.findAllByRole('button', {
      name: /^Éditer/
    });
    await user.click(edit);
    const ignore = await screen.findByRole('button', {
      name: /^Ignorer/
    });
    await user.click(ignore);
    expect(ignore).not.toBeVisible();
  });

  it('should update the page when the campaign has been generated', async () => {
    const testCampaign: CampaignDTO = {
      ...genCampaignDTO(),
      status: 'sending'
    };
    data.campaigns.push(testCampaign);
    const store = configureTestStore();
    const router = createMemoryRouter(
      [{ path: '/campagnes/:id', element: <CampaignView /> }],
      {
        initialEntries: [`/campagnes/${testCampaign.id}`]
      }
    );

    render(
      <Provider store={store}>
        <Notification />
        <RouterProvider router={router} />
      </Provider>
    );

    await screen.findByRole('heading', {
      name: /Téléchargez vos fichiers/
    });
    testCampaign.file = faker.image.url();
    const event = new MessageEvent('campaign-generate', {
      data: JSON.stringify({ id: testCampaign.id })
    });
    sources.get(`${config.apiEndpoint}/api/sse`)?.emit(event.type, event);
    const title = await screen.findByRole('heading', {
      name: /^Télécharger les destinataires et vos courriers/
    });
    expect(title).toBeVisible();
  });

  // Hard to mock window.confirm because it's a browser-level function
  it.todo(
    'should warn the user before leaving the page if they have unsaved changes'
  );
});
