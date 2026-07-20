import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserRole } from '@zerologementvacant/models';
import {
  genEstablishmentDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';
import { vi } from 'vitest';

import data from '~/mocks/handlers/data';
import { fromEstablishmentDTO } from '~/models/Establishment';
import { fromUserDTO } from '~/models/User';
import { genAuthUser } from '~/test/fixtures';
import configureTestStore from '~/utils/storeUtils';

import CampaignDocumentUpload from '../CampaignDocumentUpload';

describe('CampaignDocumentUpload', () => {
  const user = userEvent.setup();

  function setup() {
    const establishment = genEstablishmentDTO();
    const auth = genUserDTO(UserRole.USUAL, establishment);
    data.users.push(auth);
    data.establishments.push(establishment);

    const store = configureTestStore({
      auth: genAuthUser(fromUserDTO(auth), fromEstablishmentDTO(establishment))
    });
    const onUpload = vi.fn();

    render(
      <Provider store={store}>
        <CampaignDocumentUpload onUpload={onUpload} />
      </Provider>
    );

    return { onUpload };
  }

  it('renders the campaign-specific upload label', () => {
    setup();

    expect(
      screen.getByText('Associez un ou plusieurs documents à cette campagne')
    ).toBeInTheDocument();
  });

  it('accepts the generic document file types', () => {
    setup();

    const input = document.querySelector('input[type="file"]');
    expect(input).toHaveAttribute('accept');
    expect(input?.getAttribute('accept')).toContain('application/pdf');
  });

  it('calls onUpload with the created documents after a successful upload', async () => {
    const { onUpload } = setup();
    const file = new File(['content'], 'campagne.pdf', {
      type: 'application/pdf'
    });
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    await user.upload(input, file);

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith([
        expect.objectContaining({ filename: 'campagne.pdf' })
      ]);
    });
  });
});
