import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { createCampaignSentAtModal } from '../CampaignSentAtModal';

describe('createCampaignSentAtModal', () => {
  it('renders the title', () => {
    // Arrange
    const modal = createCampaignSentAtModal();

    // Act
    render(<modal.Component onConfirm={vi.fn()} />);

    // Assert
    const dialog = document.getElementById('campaign-sent-at-modal');
    expect(dialog?.textContent).toContain('Indiquer la date d\u2019envoi');
  });

  it('calls onConfirm with the entered date on submit', async () => {
    // Arrange
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const modal = createCampaignSentAtModal();
    render(<modal.Component onConfirm={onConfirm} />);
    modal.open();

    // Act
    const dateInput = document.querySelector<HTMLInputElement>(
      '#campaign-sent-at-modal input[type="date"]'
    );
    if (dateInput) {
      await user.type(dateInput, '2024-03-01');
    }
    await user.click(
      screen.getByRole('button', { name: /confirmer/i, hidden: true })
    );

    // Assert
    expect(onConfirm).toHaveBeenCalledWith('2024-03-01');
  });
});
