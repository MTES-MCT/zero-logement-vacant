import { render, screen } from '@testing-library/react';
import GroupCreationModal from './GroupCreationModal';

describe('GroupCreationModal', () => {
  it('should render', () => {
    const onSubmit = jest.fn();
    const onClose = jest.fn();

    render(<GroupCreationModal open onSubmit={onSubmit} onClose={onClose} />);

    const title = screen.queryByText(
      /Création d’un nouveau groupe de logements/
    );
    expect(title).toBeVisible();
  });
});
