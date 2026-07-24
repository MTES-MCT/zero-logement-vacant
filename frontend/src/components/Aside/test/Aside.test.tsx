import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import Aside from '../Aside';

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
});
