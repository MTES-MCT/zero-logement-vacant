import { render, screen } from '@testing-library/react';

import DoNotContactBadge from '~/components/Owner/DoNotContactBadge';

describe('DoNotContactBadge', () => {
  it('should render an error badge when the owner refused to be contacted', () => {
    render(<DoNotContactBadge doNotContact />);

    const badge = screen.getByText('Ne pas contacter');

    expect(badge).toBeVisible();
    expect(badge).toHaveClass('fr-badge--error');
  });

  it('should render nothing when doNotContact is false', () => {
    const { container } = render(<DoNotContactBadge doNotContact={false} />);

    expect(container).toBeEmptyDOMElement();
  });
});
