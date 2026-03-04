import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CampaignStatCard from '../CampaignStatCard';

describe('CampaignStatCard', () => {
  it('renders the label', () => {
    // Arrange + Act
    render(
      <CampaignStatCard iconId="fr-icon-home-4-fill" label="Nombre de logements">
        <span>27</span>
      </CampaignStatCard>
    );

    // Assert
    expect(screen.getByText('Nombre de logements')).toBeInTheDocument();
  });

  it('renders children as the value slot', () => {
    // Arrange + Act
    render(
      <CampaignStatCard iconId="fr-icon-home-4-fill" label="Nombre de logements">
        <span>27</span>
      </CampaignStatCard>
    );

    // Assert
    expect(screen.getByText('27')).toBeInTheDocument();
  });
});
