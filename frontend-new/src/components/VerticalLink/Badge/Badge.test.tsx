import Badge from './Badge';
import { render, screen } from '@testing-library/react';

describe('Badge', () => {
  it('should display a badge', () => {
    render(
      <Badge content={42}>
        <p>Messages</p>
      </Badge>
    );

    const badge = screen.getByText('42');
    expect(badge).toBeVisible();
  });
});
