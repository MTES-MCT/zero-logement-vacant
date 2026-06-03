import { render, screen } from '@testing-library/react';
import { DO_NOT_CONTACT_OWNER_RANK } from '@zerologementvacant/models';

import RankBadge from '~/components/Owner/RankBadge';

describe('RankBadge', () => {
  it('should render the primary recipient label', () => {
    render(<RankBadge value={1} />);

    expect(screen.getByText('Destinataire principal')).toBeVisible();
  });

  it('should render the secondary recipient label', () => {
    render(<RankBadge value={2} />);

    expect(screen.getByText('Destinataire secondaire')).toBeVisible();
  });

  it('should render the do-not-contact label in red (error severity)', () => {
    render(<RankBadge value={DO_NOT_CONTACT_OWNER_RANK} />);

    const badge = screen.getByText('Ne pas contacter');

    expect(badge).toBeVisible();
    expect(badge).toHaveClass('fr-badge--error');
  });

  it('should not render a recipient label for the do-not-contact rank', () => {
    render(<RankBadge value={DO_NOT_CONTACT_OWNER_RANK} />);

    expect(screen.queryByText('Destinataire secondaire')).not.toBeInTheDocument();
    expect(screen.queryByText('Destinataire principal')).not.toBeInTheDocument();
  });
});
