import { render, screen } from '@testing-library/react';
import { MemoryRouter as Router } from 'react-router';
import { genGroup } from '../../test/fixtures';
import GroupCard from './GroupCard';

vi.mock('posthog-js/react', async (importOriginal) => {
  const mod = await importOriginal<typeof import('posthog-js/react')>();
  return {
    ...mod,
    useFeatureFlagEnabled: vi.fn().mockReturnValue(false),
    usePostHog: () => ({ capture: vi.fn() })
  };
});

describe('GroupCard', () => {
  const group = genGroup();

  it('should render', () => {
    render(
      <Router>
        <GroupCard isActive group={group} />
      </Router>
    );

    const title = screen.queryByText(group.title);
    expect(title).toBeVisible();
  });

  it('should show the number of housing', () => {
    render(
      <Router>
        <GroupCard isActive group={group} />
      </Router>
    );

    const housingCount = screen.queryByText(group.housingCount);
    expect(housingCount).toBeVisible();
  });

  it('should show the number of owners', () => {
    render(
      <Router>
        <GroupCard isActive group={group} />
      </Router>
    );

    const ownerCount = screen.queryByText(group.ownerCount);
    expect(ownerCount).toBeVisible();
  });

  it('should have a link that redirects to the group view', () => {
    render(
      <Router>
        <GroupCard isActive group={group} />
      </Router>
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href');
  });
});
