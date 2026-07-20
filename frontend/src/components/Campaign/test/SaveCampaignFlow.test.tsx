import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserRole } from '@zerologementvacant/models';
import {
  genCampaignDTO,
  genEstablishmentDTO,
  genGroupDTO,
  genHousingDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { delay, http, HttpResponse } from 'msw';
import { Provider } from 'react-redux';

import SaveCampaignFlow from '~/components/Campaign/SaveCampaignFlow';
import data from '~/mocks/handlers/data';
import { mockAPI } from '~/mocks/mock-api';
import { MockAuthProvider } from '~/test/auth';
import config from '~/utils/config';
import configureTestStore from '~/utils/storeUtils';

describe('SaveCampaignFlow', () => {
  const user = userEvent.setup();
  const establishment = genEstablishmentDTO();
  const creator = genUserDTO(UserRole.USUAL, establishment);

  function renderFlow(role: UserRole = UserRole.USUAL) {
    const authDTO = genUserDTO(role, establishment);
    data.establishments.push(establishment);
    data.users.push(authDTO);
    const store = configureTestStore();

    render(
      <Provider store={store}>
        <MockAuthProvider options={{ user: authDTO, establishment }}>
          <SaveCampaignFlow />
        </MockAuthProvider>
      </Provider>
    );
  }

  it('should hide the button for a visitor', () => {
    renderFlow(UserRole.VISITOR);

    expect(
      screen.queryByRole('button', { name: 'Enregistrer une campagne' })
    ).not.toBeInTheDocument();
  });

  it('should show the button for a usual user', () => {
    renderFlow(UserRole.USUAL);

    expect(
      screen.getByRole('button', { name: 'Enregistrer une campagne' })
    ).toBeInTheDocument();
  });

  it('should create a campaign from a group selected in step 1', async () => {
    const group = genGroupDTO(creator, [genHousingDTO()]);
    data.groups.push(group);

    renderFlow();

    const openButton = screen.getByRole('button', {
      name: 'Enregistrer une campagne'
    });
    await user.click(openButton);

    const selectDialog = await screen.findByRole('dialog');
    const selectButton = await within(selectDialog).findByRole('button', {
      name: `Sélectionner le groupe ${group.title}`
    });
    await user.click(selectButton);

    const createDialog = await screen.findByRole('dialog');
    await within(createDialog).findByText('Étape 2 sur 2');
    const title = await within(createDialog).findByLabelText(/^Nom/);
    await user.type(title, 'Ma campagne');
    const confirm = await within(createDialog).findByText('Confirmer');
    await user.click(confirm);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(data.campaigns).toContainEqual(
      expect.objectContaining({
        title: 'Ma campagne',
        groupId: group.id
      })
    );
  });

  it('should reopen step 2 when the same group is re-selected after cancelling', async () => {
    const group = genGroupDTO(creator, [genHousingDTO()]);
    data.groups.push(group);

    renderFlow();

    await user.click(
      screen.getByRole('button', { name: 'Enregistrer une campagne' })
    );
    const firstSelectDialog = await screen.findByRole('dialog');
    await user.click(
      await within(firstSelectDialog).findByRole('button', {
        name: `Sélectionner le groupe ${group.title}`
      })
    );
    const createDialog = await screen.findByRole('dialog');
    await within(createDialog).findByText('Étape 2 sur 2');

    // Cancel step 2 without submitting. The step-2 modal is rendered
    // unconditionally, so a dismissal only conceals its <dialog> (it stays
    // mounted). The DSFR runtime that would remove `open`/`aria-modal` on
    // Escape/Annuler/backdrop is absent in jsdom, so we conceal the dialog
    // directly, exactly as that runtime would.
    const step2 = document.getElementById('save-campaign-from-group-modal');
    step2?.removeAttribute('open');
    step2?.removeAttribute('aria-modal');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Re-run the flow and select the SAME group again (stable RTK Query ref):
    // step 2 must reopen, because `.open()` runs on every selection rather than
    // on a `selectedGroup` state edge.
    await user.click(
      screen.getByRole('button', { name: 'Enregistrer une campagne' })
    );
    const secondSelectDialog = await screen.findByRole('dialog');
    await user.click(
      await within(secondSelectDialog).findByRole('button', {
        name: `Sélectionner le groupe ${group.title}`
      })
    );

    const reopened = await screen.findByRole('dialog');
    expect(within(reopened).getByText('Étape 2 sur 2')).toBeInTheDocument();
  });

  it('should keep step 2 open and create no campaign when the submission fails', async () => {
    const group = genGroupDTO(creator, [genHousingDTO()]);
    data.groups.push(group);

    let submitted = false;
    mockAPI.use(
      http.post(`${config.apiEndpoint}/groups/:id/campaigns`, () => {
        submitted = true;
        return HttpResponse.json(
          { name: 'InternalError', message: 'Boom' },
          { status: 500 }
        );
      })
    );

    renderFlow();

    await user.click(
      screen.getByRole('button', { name: 'Enregistrer une campagne' })
    );
    const selectDialog = await screen.findByRole('dialog');
    await user.click(
      await within(selectDialog).findByRole('button', {
        name: `Sélectionner le groupe ${group.title}`
      })
    );

    const createDialog = await screen.findByRole('dialog');
    await within(createDialog).findByText('Étape 2 sur 2');
    await user.type(
      await within(createDialog).findByLabelText(/^Nom/),
      'Ma campagne'
    );
    await user.click(await within(createDialog).findByText('Confirmer'));

    await waitFor(() => {
      expect(submitted).toBe(true);
    });

    // The modal stays open so the user can retry, and nothing is persisted.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(data.campaigns).not.toContainEqual(
      expect.objectContaining({ title: 'Ma campagne', groupId: group.id })
    );
  });

  it('should disable Confirmer while the create request is in flight, preventing a double-submit', async () => {
    const group = genGroupDTO(creator, [genHousingDTO()]);
    data.groups.push(group);

    let posts = 0;
    mockAPI.use(
      http.post(`${config.apiEndpoint}/groups/:id/campaigns`, async () => {
        posts += 1;
        await delay(80);
        return HttpResponse.json(genCampaignDTO(group), { status: 201 });
      })
    );

    renderFlow();

    await user.click(
      screen.getByRole('button', { name: 'Enregistrer une campagne' })
    );
    const selectDialog = await screen.findByRole('dialog');
    await user.click(
      await within(selectDialog).findByRole('button', {
        name: `Sélectionner le groupe ${group.title}`
      })
    );

    const createDialog = await screen.findByRole('dialog');
    await within(createDialog).findByText('Étape 2 sur 2');
    await user.type(
      await within(createDialog).findByLabelText(/^Nom/),
      'Ma campagne'
    );
    const confirmer = await within(createDialog).findByRole('button', {
      name: 'Confirmer'
    });
    await user.click(confirmer);

    // While the POST is in flight the Confirmer is disabled, so a second click
    // cannot fire a second create mutation.
    await waitFor(() => expect(confirmer).toBeDisabled());
    expect(posts).toBe(1);
  });
});
