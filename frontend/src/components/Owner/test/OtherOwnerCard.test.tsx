import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import OtherOwnerCard from '~/components/Owner/OtherOwnerCard';

describe('OtherOwnerCard', () => {
  function renderCard(doNotContact: boolean) {
    return render(
      <MemoryRouter>
        <OtherOwnerCard
          id="owner-1"
          name="Jean Dupont"
          propertyRight={null}
          doNotContact={doNotContact}
        />
      </MemoryRouter>
    );
  }

  it('should display the do-not-contact badge for a do-not-contact owner', () => {
    renderCard(true);

    const badge = screen.getByText('Ne pas contacter');

    expect(badge).toBeVisible();
    expect(badge).toHaveClass('fr-badge--error');
  });

  it('should not display the do-not-contact badge for a regular owner', () => {
    renderCard(false);

    expect(screen.queryByText('Ne pas contacter')).not.toBeInTheDocument();
  });
});
