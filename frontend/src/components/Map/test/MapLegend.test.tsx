import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import MapLegend from '../MapLegend';

describe('MapLegend', () => {
  const user = userEvent.setup();

  function renderComponent(onClose = vi.fn()) {
    render(<MapLegend onClose={onClose} />);
  }

  it('should display the Localisation section', () => {
    renderComponent();

    expect(screen.getByText('Localisation')).toBeInTheDocument();
  });

  it('should display the Suivi section', () => {
    renderComponent();

    expect(screen.getByText('Suivi')).toBeInTheDocument();
  });

  it('should display all localisation items', () => {
    renderComponent();

    expect(
      screen.getByText(/Logement unique à l'adresse/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Plusieurs logements à l'adresse/)
    ).toBeInTheDocument();
    expect(screen.getByText('Nombre de bâtiments')).toBeInTheDocument();
  });

  it('should display all status items', () => {
    renderComponent();

    expect(screen.getByText('Logement non suivi')).toBeInTheDocument();
    expect(screen.getByText('Logement en attente de retour')).toBeInTheDocument();
    expect(screen.getByText('Logement en premier contact')).toBeInTheDocument();
    expect(screen.getByText('Logement suivi en cours')).toBeInTheDocument();
    expect(screen.getByText('Logement suivi terminé')).toBeInTheDocument();
    expect(screen.getByText('Logement bloqué')).toBeInTheDocument();
  });

  it('should call onClose when the close button is clicked', async () => {
    const onClose = vi.fn();

    renderComponent(onClose);

    await user.click(screen.getByRole('button', { name: /fermer/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
