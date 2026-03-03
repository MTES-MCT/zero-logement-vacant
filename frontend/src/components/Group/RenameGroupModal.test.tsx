import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createRenameGroupModal } from './RenameGroupModal';

describe('RenameGroupModal', () => {
  it('calls onSubmit with updated title and description', async () => {
    const modal = createRenameGroupModal();
    const onSubmit = vi.fn();
    render(
      <modal.Component
        group={{ id: '1', title: 'Old title', description: 'Old desc', housingCount: 0, ownerCount: 0, createdAt: new Date(), archivedAt: null }}
        onSubmit={onSubmit}
        isOpenedByDefault
      />
    );
    const titleInput = screen.getByLabelText(/Nom du groupe/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'New title');
    const descInput = screen.getByLabelText(/Description/i);
    await userEvent.clear(descInput);
    await userEvent.type(descInput, 'New desc');
    await userEvent.click(screen.getByText('Confirmer'));
    expect(onSubmit).toHaveBeenCalledWith({ title: 'New title', description: 'New desc' });
  });
});
