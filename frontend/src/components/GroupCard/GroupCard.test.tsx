import { render, screen } from '@testing-library/react';
import GroupCard from './GroupCard';
import { genGroup } from '../../../test/fixtures.test';

describe('GroupCard', () => {
  const group = genGroup();

  it('should render', () => {
    render(<GroupCard group={group} />);

    const title = screen.queryByText(group.title);
    expect(title).toBeVisible();
  });

  it('should show the number of housing', () => {
    render(<GroupCard group={group} />);

    const housingCount = screen.queryByText(group.housingCount);
    expect(housingCount).toBeVisible();
  });

  it('should show the number of owners', () => {
    render(<GroupCard group={group} />);

    const ownerCount = screen.queryByText(group.ownerCount);
    expect(ownerCount).toBeVisible();
  });

  it('should have a link that redirects to the group view', () => {
    render(<GroupCard group={group} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href');
  });
});
