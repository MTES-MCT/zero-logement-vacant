import { render, screen, within } from '@testing-library/react';

import { createCampaignSentAtModal } from '~/components/Campaign/CampaignSentAtModal';

describe('CampaignSentAtModal', () => {
  it('warns that already-contacted housings revert to "Non suivi" when postponing an already-sent campaign', async () => {
    const modal = createCampaignSentAtModal();
    render(<modal.Component sentAt="2020-01-01" onConfirm={vi.fn()} />);
    modal.open();

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(/remis(e|s)? à « Non suivi »/i)
    ).toBeInTheDocument();
  });

  it('does not warn about a revert when the campaign has never been sent', async () => {
    const modal = createCampaignSentAtModal();
    render(<modal.Component sentAt={null} onConfirm={vi.fn()} />);
    modal.open();

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).queryByText(/remis(e|s)? à « Non suivi »/i)
    ).not.toBeInTheDocument();
  });
});
