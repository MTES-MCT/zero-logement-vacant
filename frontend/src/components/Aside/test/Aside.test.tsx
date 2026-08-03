import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { vi } from 'vitest';

import Aside from '../Aside';

function AsideHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Ouvrir le panneau
      </button>
      <Aside
        open={open}
        onClose={() => setOpen(false)}
        onSave={vi.fn()}
        header={<h2>Éditer les informations du propriétaire</h2>}
        main={<p>Contenu</p>}
      />
    </>
  );
}

describe('Aside', () => {
  it('has an accessible name derived from its visible header', () => {
    render(
      <Aside
        open
        onClose={vi.fn()}
        onSave={vi.fn()}
        header={<h2>Éditer les informations du propriétaire</h2>}
        main={<p>Contenu</p>}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName(
      'Éditer les informations du propriétaire'
    );
  });

  it('moves initial focus to the close button', async () => {
    render(
      <Aside
        open
        onClose={vi.fn()}
        onSave={vi.fn()}
        header={<h2>Éditer les informations du propriétaire</h2>}
        main={<p>Contenu</p>}
      />
    );

    const closeButton = screen.getByRole('button', { name: 'Fermer' });
    await waitFor(() => {
      expect(closeButton).toHaveFocus();
    });
  });

  it('closes with Escape and restores focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<AsideHarness />);
    const trigger = screen.getByRole('button', { name: 'Ouvrir le panneau' });

    await user.click(trigger);
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });
});
