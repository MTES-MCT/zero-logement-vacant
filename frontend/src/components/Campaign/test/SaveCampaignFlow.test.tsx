import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserRole } from '@zerologementvacant/models';
import {
  genEstablishmentDTO,
  genGroupDTO,
  genHousingDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { http, HttpResponse } from 'msw';
import { Provider } from 'react-redux';

import SaveCampaignFlow from '~/components/Campaign/SaveCampaignFlow';
import data from '~/mocks/handlers/data';
import { mockAPI } from '~/mocks/mock-api';
import { fromEstablishmentDTO } from '~/models/Establishment';
import { fromUserDTO } from '~/models/User';
import { genAuthUser } from '~/test/fixtures';
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
    const store = configureTestStore({
      auth: genAuthUser(
        fromUserDTO(authDTO),
        fromEstablishmentDTO(establishment)
      )
    });

    render(
      <Provider store={store}>
        <SaveCampaignFlow />
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

    // Cancel step 2 without submitting. DSFR emits a `dsfr.conceal` event on
    // the dialog for every dismissal (Annuler / Escape / backdrop click); the
    // DSFR runtime that emits it is absent in jsdom, so we simulate that exact
    // signal — the same one react-dsfr's own `useIsModalOpen` listens for.
    createDialog.dispatchEvent(new CustomEvent('dsfr.conceal'));
    await waitFor(() => {
      expect(
        document.getElementById('save-campaign-from-group-modal')
      ).not.toBeInTheDocument();
    });

    // Re-run the flow and select the SAME group again (stable RTK Query ref).
    await user.click(
      screen.getByRole('button', { name: 'Enregistrer une campagne' })
    );
    const secondSelectDialog = await screen.findByRole('dialog');
    await user.click(
      await within(secondSelectDialog).findByRole('button', {
        name: `Sélectionner le groupe ${group.title}`
      })
    );

    expect(await screen.findByText('Étape 2 sur 2')).toBeInTheDocument();
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
});
