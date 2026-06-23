import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FullscreenMapButton } from '../FullscreenControl';

describe('FullscreenMapButton', () => {
  const user = userEvent.setup();

  it('should display the expand icon when not in fullscreen', () => {
    render(<FullscreenMapButton isFullscreen={false} onToggle={vi.fn()} />);

    const button = screen.getByRole('button', {
      name: 'Afficher la carte en plein écran'
    });

    expect(button).toHaveClass('ri-expand-diagonal-2-line');
    expect(button).toHaveAttribute(
      'aria-label',
      'Afficher la carte en plein écran'
    );
  });

  it('should display the collapse icon when in fullscreen', () => {
    render(<FullscreenMapButton isFullscreen onToggle={vi.fn()} />);

    const button = screen.getByRole('button', {
      name: 'Quitter le plein écran'
    });

    expect(button).toHaveClass('ri-collapse-diagonal-2-line');
    expect(button).toHaveAttribute('aria-label', 'Quitter le plein écran');
  });

  it('should call onToggle when clicked', async () => {
    const onToggle = vi.fn();
    render(<FullscreenMapButton isFullscreen={false} onToggle={onToggle} />);

    await user.click(
      screen.getByRole('button', { name: 'Afficher la carte en plein écran' })
    );

    expect(onToggle).toHaveBeenCalledOnce();
  });
});
