import { render, screen, within } from '@testing-library/react';
import { MemoryRouter as Router } from 'react-router';

import OwnerCard from '~/components/Owner/OwnerCard';

type OwnerCardProps = React.ComponentProps<typeof OwnerCard>;

function setup(props: Partial<OwnerCardProps> = {}) {
  const defaultProps: OwnerCardProps = {
    isLoading: false,
    id: 'owner-1',
    birthdate: null,
    kind: null,
    propertyRight: null,
    siren: null,
    dgfipAddress: null,
    banAddress: null,
    additionalAddress: null,
    email: null,
    phone: null,
    housingCount: null,
    relativeLocation: null
  };

  render(
    <Router>
      <OwnerCard {...defaultProps} {...props} />
    </Router>
  );
}

/**
 * The "Type de propriétaire" value sits in the same <section> as its <h4> label,
 * so we scope the lookup to that section to avoid matching the "Pas d’information"
 * fallback of sibling fields.
 */
function ownerKindSection(): HTMLElement {
  const heading = screen.getByRole('heading', {
    name: /Type de propriétaire/i,
    level: 4
  });
  const section = heading.closest('section');
  expect(section).not.toBeNull();
  return section as HTMLElement;
}

describe('OwnerCard', () => {
  describe('Type de propriétaire', () => {
    it('shows "Pas d’information" when the kind is null', () => {
      setup({ kind: null });

      expect(
        within(ownerKindSection()).getByText(/Pas d.information/)
      ).toBeInTheDocument();
    });

    it('shows "Pas d’information" when the kind is undefined', () => {
      setup({ kind: undefined });

      expect(
        within(ownerKindSection()).getByText(/Pas d.information/)
      ).toBeInTheDocument();
    });

    it('shows the kind value when present', () => {
      setup({ kind: 'Particulier' });

      const section = ownerKindSection();
      expect(within(section).getByText('Particulier')).toBeInTheDocument();
      expect(
        within(section).queryByText(/Pas d.information/)
      ).not.toBeInTheDocument();
    });
  });
});
