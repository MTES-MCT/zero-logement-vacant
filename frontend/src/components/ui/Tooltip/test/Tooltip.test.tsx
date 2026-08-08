import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Tooltip from '../Tooltip';

describe('Tooltip', () => {
  it('renders a focusable button as the trigger, described by the tooltip content', () => {
    render(<Tooltip title="Informations utiles" />);

    const trigger = screen.getByRole('button', {
      name: /information contextuelle/i
    });
    const tooltip = screen.getByRole('tooltip');

    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id);
    expect(tooltip).toHaveTextContent('Informations utiles');
  });

  it('is reachable by keyboard (Tab), unlike a hover-only trigger', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Avant</button>
        <Tooltip title="Informations utiles" />
      </>
    );

    await user.tab();
    expect(screen.getByRole('button', { name: 'Avant' })).toHaveFocus();

    await user.tab();
    expect(
      screen.getByRole('button', { name: /information contextuelle/i })
    ).toHaveFocus();
  });
});
