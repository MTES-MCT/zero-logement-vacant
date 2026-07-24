import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Dropdown from '../Dropdown';

describe('Dropdown', () => {
  it('exposes its expanded state and popup relationship to assistive technologies', async () => {
    const user = userEvent.setup();

    render(
      <Dropdown label="Mon compte">
        <button type="button">Se déconnecter</button>
      </Dropdown>
    );

    const trigger = screen.getByRole('button', { name: 'Mon compte' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-controls');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const panelId = trigger.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId as string)).toBeInTheDocument();
  });
});
