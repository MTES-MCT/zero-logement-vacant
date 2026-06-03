import { render, screen } from '@testing-library/react';
import { DO_NOT_CONTACT_OWNER_RANK } from '@zerologementvacant/models';
import { MemoryRouter } from 'react-router';

import OtherOwnerCard from '~/components/Owner/OtherOwnerCard';

describe('OtherOwnerCard', () => {
  function renderCard(rank: number | null) {
    return render(
      <MemoryRouter>
        <OtherOwnerCard
          id="owner-1"
          name="Jean Dupont"
          propertyRight={null}
          rank={rank as never}
        />
      </MemoryRouter>
    );
  }

  it('should display the do-not-contact badge for a do-not-contact owner', () => {
    renderCard(DO_NOT_CONTACT_OWNER_RANK);

    const badge = screen.getByText('Ne pas contacter');

    expect(badge).toBeVisible();
    expect(badge).toHaveClass('fr-badge--error');
  });

  it('should not display a rank badge for a secondary owner', () => {
    renderCard(2);

    expect(screen.queryByText('Ne pas contacter')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Destinataire secondaire')
    ).not.toBeInTheDocument();
  });
});
