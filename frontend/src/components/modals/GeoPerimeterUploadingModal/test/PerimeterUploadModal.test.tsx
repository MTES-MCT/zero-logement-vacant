import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import createPerimeterUploadModal from '../PerimeterUploadModal';

const modal = createPerimeterUploadModal();

describe('PerimeterUploadModal', () => {
  it('should associate a missing-file error with the upload field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<modal.Component onClose={vi.fn()} onSubmit={onSubmit} />);
    modal.open();
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByRole('button', { name: 'Confirmer' }));

    const input = within(dialog).getByLabelText(/^Ajouter un fichier/);
    expect(
      await within(dialog).findByText('Veuillez sélectionner un fichier')
    ).toBeVisible();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should surface an unexpected validation failure without submitting', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<modal.Component onClose={vi.fn()} onSubmit={onSubmit} />);
    modal.open();
    const dialog = await screen.findByRole('dialog');
    const input = within(dialog).getByLabelText(/^Ajouter un fichier/);
    const file = new File(['perimeter'], 'perimeter.zip', {
      type: 'application/zip'
    });
    await user.upload(input, file);
    Object.defineProperty(file, 'type', {
      configurable: true,
      get() {
        throw new Error('Validation failure containing a private filename');
      }
    });

    await user.click(within(dialog).getByRole('button', { name: 'Confirmer' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Le fichier n’a pas pu être validé. Veuillez réessayer.'
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
