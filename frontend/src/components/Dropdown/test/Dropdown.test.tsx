import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import Dropdown from '../Dropdown';

function ControlledDropdown() {
  const [open, setOpen] = useState(false);

  return (
    <Dropdown
      label="Mon compte"
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
    >
      <button type="button">Se déconnecter</button>
    </Dropdown>
  );
}

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

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(
      screen.queryByRole('button', { name: 'Se déconnecter' })
    ).not.toBeInTheDocument();
  });

  it('opens a non-modal panel named by its trigger', async () => {
    const user = userEvent.setup();

    render(
      <Dropdown label="Mon compte">
        <button type="button">Se déconnecter</button>
      </Dropdown>
    );
    const trigger = screen.getByRole('button', { name: 'Mon compte' });

    await user.click(trigger);

    expect(trigger).toHaveFocus();
    const panel = screen.getByRole('region', { name: 'Mon compte' });
    expect(panel).toContainElement(
      screen.getByRole('button', { name: 'Se déconnecter' })
    );
  });

  it('supports controlled keyboard opening, closing and focus restoration', async () => {
    const user = userEvent.setup();
    render(<ControlledDropdown />);
    const trigger = screen.getByRole('button', { name: 'Mon compte' });

    trigger.focus();
    await user.keyboard('{Enter}');

    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard(' ');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.keyboard('{Enter}');
    await user.tab();
    expect(
      screen.getByRole('button', { name: 'Se déconnecter' })
    ).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });
});
