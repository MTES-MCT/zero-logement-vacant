import { render, screen } from '@testing-library/react';
import ExtendedToggle from './ExtendedToggle';

describe('ExtendedToggle', () => {
  it('should hide label', () => {
    render(<ExtendedToggle label="Label" vertical />);

    const hint = screen.queryByDisplayValue('Activé');
    expect(hint).toBeNull();
  });
});
