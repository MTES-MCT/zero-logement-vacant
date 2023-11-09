import { ButtonProps } from '@codegouvfr/react-dsfr/Button';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ModalStep from './ModalStep';
import ModalStepper from './ModalStepper';

describe('Modal stepper', () => {
  const button: ButtonProps = {
    children: 'Ouvrir',
  };
  const user = userEvent.setup();

  it('should display the first step', async () => {
    render(
      <ModalStepper openingButtonProps={button}>
        <ModalStep title="Title 1">
          <p>Step 1</p>
        </ModalStep>
      </ModalStepper>
    );
    const open = screen.getByText('Ouvrir');
    await user.click(open);

    const title = screen.getByText('Title 1');
    expect(title).toBeVisible();
    const content = screen.getByText('Step 1');
    expect(content).toBeVisible();
  });

  it('should go to the next step', async () => {
    render(
      <ModalStepper openingButtonProps={button}>
        <ModalStep title="Title 1">
          <p>Step 1</p>
        </ModalStep>
        <ModalStep title="Title 2">
          <p>Step 2</p>
        </ModalStep>
      </ModalStepper>
    );
    const open = screen.getByText('Ouvrir');
    await user.click(open);

    const next = screen.getByText('Confirmer');
    await user.click(next);
    const title = screen.getByText('Title 2');
    expect(title).toBeVisible();
    const content = screen.getByText('Step 2');
    expect(content).toBeVisible();
  });

  it('should go back to the previous step', async () => {
    render(
      <ModalStepper openingButtonProps={button}>
        <ModalStep title="Title 1">
          <p>Step 1</p>
        </ModalStep>
        <ModalStep title="Title 2">
          <p>Step 2</p>
        </ModalStep>
      </ModalStepper>
    );
    const open = screen.getByText('Ouvrir');
    await user.click(open);

    const next = screen.getByText('Confirmer');
    await user.click(next);
    expect(screen.getByText('Title 2')).toBeVisible();
    const previous = screen.getByText('Retour');
    await user.click(previous);
    expect(screen.getByText('Title 1')).toBeVisible();
  });

  it('should hide the modal if it is the first step', async () => {
    render(
      <ModalStepper openingButtonProps={button}>
        <ModalStep title="Title 1">
          <p>Step 1</p>
        </ModalStep>
        <ModalStep title="Title 2">
          <p>Step 2</p>
        </ModalStep>
      </ModalStepper>
    );
    const open = screen.getByText('Ouvrir');
    await user.click(open);

    const cancel = screen.getByText('Annuler');
    await user.click(cancel);
    const modal = await screen.findByRole('dialog');
    expect(modal).not.toBeVisible();
  });

  it('should reset the stepper on open', async () => {
    render(
      <ModalStepper openingButtonProps={button}>
        <ModalStep title="Title 1">
          <p>Step 1</p>
        </ModalStep>
        <ModalStep title="Title 2">
          <p>Step 2</p>
        </ModalStep>
      </ModalStepper>
    );
    const open = screen.getByText('Ouvrir');
    await user.click(open);

    const next = screen.getByText('Confirmer');
    await user.click(next);

    const content = screen.getByText('Step 2');
    expect(content).toBeVisible();

    const close = screen.getByText('Fermer');
    await user.click(close);

    await user.click(open);

    const title = screen.getByText('Step 1');
    expect(title).toBeVisible();
  });
});
